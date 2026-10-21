const test=require("node:test");
const assert=require("node:assert/strict");
const Backup=require("./backup-restore.js");

const today="2026-10-19";
const taskState={
  tasks:[{id:"task-1",title:"Read chapter",subject:"Biology",due:today,priority:"high",done:false,duration:45}],
  sessions:[{date:today,minutes:25,at:1792400000000,taskId:"task-1",taskTitle:"Read chapter",subject:"Biology"}],
  minutes:25,filter:"active",sort:"due",focusTaskId:"task-1",subjectFilter:"Biology",priorityFilter:"high",deadlineFilter:"today",searchTerm:"chapter"
};
const makeStorage=entries=>{
  const values=new Map(entries||[]);
  return {values,getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
};
const sourceStorage=()=>makeStorage([
  [Backup.KEYS.tasks,JSON.stringify(taskState)],
  [Backup.KEYS.goal,"150"],
  [Backup.KEYS.theme,"light"],
  ["unrelated:browser:data","leave this alone"]
]);
const exported=()=>Backup.createBackup({taskState,studyGoal:150,theme:"light"},"2026-10-19T12:30:00.000Z");

test("export and restore round-trip tasks, sessions, goal, theme, and saved app state",()=>{
  const source=sourceStorage();
  const backup=Backup.createBackup({taskState:JSON.parse(source.getItem(Backup.KEYS.tasks)),studyGoal:Number(source.getItem(Backup.KEYS.goal)),theme:source.getItem(Backup.KEYS.theme)},"2026-10-19T12:30:00.000Z");
  const parsed=JSON.parse(JSON.stringify(backup));
  assert.equal(parsed.format,Backup.FORMAT);
  assert.equal(parsed.version,1);
  assert.equal(parsed.exportedAt,"2026-10-19T12:30:00.000Z");
  assert.deepEqual(Object.keys(parsed).sort(),["data","exportedAt","format","version"]);
  assert.deepEqual(Object.keys(parsed.data).sort(),["studyGoal","taskState","theme"]);
  parsed.data.taskState.tasks[0].title="Changed in test copy";
  assert.equal(taskState.tasks[0].title,"Read chapter");
  parsed.data.taskState.tasks[0].title="Read chapter";
  const target=makeStorage([[Backup.KEYS.tasks,"old"],[Backup.KEYS.goal,"60"],[Backup.KEYS.theme,"dark"],["unrelated:browser:data","keep"]]);
  Backup.restoreStorage(target,Backup.validateBackup(parsed));
  assert.deepEqual(JSON.parse(target.getItem(Backup.KEYS.tasks)),taskState);
  assert.equal(target.getItem(Backup.KEYS.goal),"150");
  assert.equal(target.getItem(Backup.KEYS.theme),"light");
  assert.equal(target.getItem("unrelated:browser:data"),"keep");
});

test("malformed JSON is rejected before storage can change",()=>{
  const target=sourceStorage(),before=[...target.values];
  assert.throws(()=>Backup.restoreStorage(target,Backup.parseBackup("{broken")),/not valid JSON/);
  assert.deepEqual([...target.values],before);
});

test("unsupported versions, missing task data, and invalid values are rejected",()=>{
  const target=sourceStorage(),before=[...target.values];
  const wrongVersion=exported();wrongVersion.version=2;
  assert.throws(()=>Backup.restoreStorage(target,wrongVersion),/version is not supported/);
  const missing=exported();delete missing.data.taskState;
  assert.throws(()=>Backup.restoreStorage(target,missing),/missing task data/);
  const invalid=exported();invalid.data.taskState.tasks[0].priority="urgent";
  assert.throws(()=>Backup.restoreStorage(target,invalid),/invalid priority/);
  assert.deepEqual([...target.values],before);
});

test("empty task and session lists restore safely",()=>{
  const target=makeStorage();
  const backup=Backup.createBackup({taskState:{tasks:[],sessions:[]},studyGoal:120,theme:"dark"},"2026-10-19T12:30:00.000Z");
  Backup.restoreStorage(target,backup);
  assert.deepEqual(JSON.parse(target.getItem(Backup.KEYS.tasks)),{tasks:[],sessions:[]});
  assert.equal(target.getItem(Backup.KEYS.goal),"120");
  assert.equal(target.getItem(Backup.KEYS.theme),"dark");
});

test("missing optional goal and theme retain current preferences",()=>{
  const target=makeStorage([[Backup.KEYS.tasks,"old"],[Backup.KEYS.goal,"90"],[Backup.KEYS.theme,"light"]]);
  const backup=Backup.createBackup({taskState:{tasks:[],sessions:[]}},"2026-10-19T12:30:00.000Z");
  Backup.restoreStorage(target,backup);
  assert.equal(target.getItem(Backup.KEYS.goal),"90");
  assert.equal(target.getItem(Backup.KEYS.theme),"light");
});

test("storage write failure rolls back every affected FocusFlow key",()=>{
  const target=sourceStorage(),before=[...target.values],originalSet=target.setItem;
  let writes=0;
  target.setItem=(key,value)=>{if(++writes===2)throw new Error("quota");originalSet(key,value)};
  assert.throws(()=>Backup.restoreStorage(target,exported()),/previous FocusFlow data was restored/);
  assert.deepEqual([...target.values],before);
});

test("import validation rejects unsafe IDs and invalid session, goal, and theme fields",()=>{
  for(const mutate of [
    b=>{b.data.taskState.tasks[0].id='x" onmouseover="alert(1)'},
    b=>{b.data.taskState.sessions[0].minutes=121},
    b=>{b.data.studyGoal=0},
    b=>{b.data.theme="blue"}
  ]){const backup=exported();mutate(backup);assert.throws(()=>Backup.validateBackup(backup))}
});
