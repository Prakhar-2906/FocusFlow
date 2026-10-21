"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {summarize}=require("./progress.js");

const today="2026-10-21";
const task=(id,due,done=false)=>({id,due,done});

test("calculates overall and due-today counts independently",()=>{
  const result=summarize([
    task("today-done",today,true),task("today-open",today),
    task("past-done","2026-10-20",true),task("later-open","2026-10-25")
  ],today);
  assert.deepEqual(result,{overall:{completed:2,total:4,percent:50},today:{completed:1,total:2,percent:50}});
});

test("empty task lists safely report zero counts and percentages",()=>{
  assert.deepEqual(summarize([],today),{overall:{completed:0,total:0,percent:0},today:{completed:0,total:0,percent:0}});
  assert.deepEqual(summarize(null,today),{overall:{completed:0,total:0,percent:0},today:{completed:0,total:0,percent:0}});
});

test("completion and reopening update both relevant progress values",()=>{
  const tasks=[task("today",today),task("later","2026-10-25")];
  tasks[0].done=true;
  assert.equal(summarize(tasks,today).overall.percent,50);
  assert.equal(summarize(tasks,today).today.percent,100);
  tasks[0].done=false;
  assert.equal(summarize(tasks,today).overall.percent,0);
  assert.equal(summarize(tasks,today).today.percent,0);
});

test("changing a deadline moves a task into or out of today's progress",()=>{
  const tasks=[task("moving","2026-10-25",true)];
  assert.equal(summarize(tasks,today).today.total,0);
  tasks[0].due=today;
  assert.deepEqual(summarize(tasks,today).today,{completed:1,total:1,percent:100});
  tasks[0].due="2026-10-26";
  assert.deepEqual(summarize(tasks,today).today,{completed:0,total:0,percent:0});
});
