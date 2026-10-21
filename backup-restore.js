(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  else root.FocusFlowBackup=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEYS=Object.freeze({tasks:"focusflow:v1",goal:"focusflow:study-goal:v1",theme:"focusflow:theme"});
  const FORMAT="focusflow-backup", VERSION=1, MAX_ITEMS=10000;
  const isRecord=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
  function validDate(value){
    if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [year,month,day]=value.split("-").map(Number),date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }
  function fail(message){throw new Error(message)}
  function validateTaskState(value){
    if(!isRecord(value)||!Array.isArray(value.tasks)||!Array.isArray(value.sessions))fail("The backup is missing its task and session lists.");
    if(value.tasks.length>MAX_ITEMS||value.sessions.length>MAX_ITEMS)fail("This backup contains more records than FocusFlow supports.");
    const ids=new Set();
    for(const [index,task] of value.tasks.entries()){
      const at=`Task ${index+1}`;
      if(!isRecord(task))fail(`${at} must be an object.`);
      if(typeof task.id!=="string"||! /^[A-Za-z0-9_-]{1,80}$/.test(task.id)||ids.has(task.id))fail(`${at} has a missing, unsafe, or duplicate ID.`);
      ids.add(task.id);
      if(typeof task.title!=="string"||!task.title.trim()||task.title.length>90)fail(`${at} has an invalid title.`);
      if(typeof task.subject!=="string"||!task.subject.trim()||task.subject.length>32)fail(`${at} has an invalid subject.`);
      if(!validDate(task.due))fail(`${at} has an invalid due date.`);
      if(!["high","medium","low"].includes(task.priority))fail(`${at} has an invalid priority.`);
      if(typeof task.done!=="boolean")fail(`${at} has an invalid completion state.`);
      if(task.duration!==undefined&&(!Number.isInteger(task.duration)||task.duration<1||task.duration>1440))fail(`${at} has an invalid estimated duration.`);
      if(task.completedAt!==undefined&&task.completedAt!==null&&!validDate(task.completedAt))fail(`${at} has an invalid completion date.`);
    }
    for(const [index,session] of value.sessions.entries()){
      const at=`Study session ${index+1}`;
      if(!isRecord(session))fail(`${at} must be an object.`);
      if(!validDate(session.date))fail(`${at} has an invalid date.`);
      if(!Number.isInteger(session.minutes)||session.minutes<1||session.minutes>120)fail(`${at} has invalid minutes.`);
      if(session.at!==undefined&&(!Number.isFinite(session.at)||session.at<0))fail(`${at} has an invalid timestamp.`);
      for(const field of ["taskId","taskTitle","subject"]){if(session[field]!==undefined&&session[field]!==null&&typeof session[field]!=="string")fail(`${at} has an invalid ${field}.`)}
    }
    if(value.minutes!==undefined&&(!Number.isInteger(value.minutes)||value.minutes<5||value.minutes>120))fail("The saved focus timer length is invalid.");
    if(value.focusTaskId!==undefined&&typeof value.focusTaskId!=="string")fail("The saved focus task is invalid.");
    if(value.filter!==undefined&&!['all','active','done'].includes(value.filter))fail("The saved task filter is invalid.");
    if(value.sort!==undefined&&!['smart','priority','due','subject'].includes(value.sort))fail("The saved task sort is invalid.");
    if(value.subjectFilter!==undefined&&typeof value.subjectFilter!=="string")fail("The saved subject filter is invalid.");
    if(value.priorityFilter!==undefined&&value.priorityFilter!==""&&!['high','medium','low'].includes(value.priorityFilter))fail("The saved priority filter is invalid.");
    if(value.deadlineFilter!==undefined&&!['all','today','overdue','upcoming'].includes(value.deadlineFilter))fail("The saved deadline filter is invalid.");
    if(value.searchTerm!==undefined&&typeof value.searchTerm!=="string")fail("The saved search is invalid.");
    return value;
  }
  function validateBackup(value){
    if(!isRecord(value))fail("This file is not a FocusFlow backup.");
    if(value.format!==FORMAT)fail("This file is not a FocusFlow backup.");
    if(value.version!==VERSION)fail("This FocusFlow backup version is not supported.");
    if(typeof value.exportedAt!=="string"||!Number.isFinite(Date.parse(value.exportedAt))||new Date(value.exportedAt).toISOString()!==value.exportedAt)fail("The backup export date is invalid.");
    if(!isRecord(value.data)||!Object.prototype.hasOwnProperty.call(value.data,"taskState"))fail("The backup is missing task data.");
    validateTaskState(value.data.taskState);
    if(value.data.studyGoal!==undefined&&(!Number.isInteger(value.data.studyGoal)||value.data.studyGoal<15||value.data.studyGoal>720))fail("The saved daily study goal must be from 15 to 720 minutes.");
    if(value.data.theme!==undefined&&!['dark','light'].includes(value.data.theme))fail("The saved theme must be dark or light.");
    return {format:FORMAT,version:VERSION,exportedAt:value.exportedAt,data:{taskState:value.data.taskState,...(value.data.studyGoal!==undefined?{studyGoal:value.data.studyGoal}:{}),...(value.data.theme!==undefined?{theme:value.data.theme}:{})}};
  }
  function createBackup(data,exportedAt=new Date().toISOString()){
    const snapshot=JSON.parse(JSON.stringify(data));
    return validateBackup({format:FORMAT,version:VERSION,exportedAt,data:snapshot});
  }
  function parseBackup(text){
    if(typeof text!=="string")fail("Backup contents must be JSON text.");
    let parsed;
    try{parsed=JSON.parse(text)}catch{fail("This file is not valid JSON.")}
    return validateBackup(parsed);
  }
  function restoreStorage(storage,backup){
    const valid=validateBackup(backup),writes=[[KEYS.tasks,JSON.stringify(valid.data.taskState)]];
    if(valid.data.studyGoal!==undefined)writes.push([KEYS.goal,String(valid.data.studyGoal)]);
    if(valid.data.theme!==undefined)writes.push([KEYS.theme,valid.data.theme]);
    const previous=new Map(writes.map(([key])=>[key,storage.getItem(key)]));
    try{for(const [key,value] of writes)storage.setItem(key,value)}
    catch(error){
      let rollbackError=null;
      for(const [key] of writes){try{const old=previous.get(key);if(old===null)storage.removeItem(key);else storage.setItem(key,old)}catch(failure){rollbackError=rollbackError||failure}}
      const message=rollbackError?"Restore failed and browser storage could not fully roll back. Keep this backup and check browser storage space.":"Restore could not be saved. Your previous FocusFlow data was restored.";
      const failure=new Error(message);failure.cause=error;throw failure;
    }
    return valid;
  }
  return Object.freeze({KEYS,FORMAT,VERSION,createBackup,validateBackup,parseBackup,restoreStorage});
});
