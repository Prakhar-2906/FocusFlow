"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {select}=require("./next-best-move.js");
const today="2026-10-19";
const task=(id,overrides={})=>({id,title:id,subject:"Study",due:"2026-10-22",priority:"medium",duration:30,done:false,...overrides});
test("prefers an overdue task over later work",()=>{
  const result=select([task("later",{due:"2026-10-20"}),task("late",{due:"2026-10-18"})],{today,availableMinutes:60});
  assert.equal(result.task.id,"late");assert.equal(result.delta,-1);
});
test("an earlier actual deadline stays ahead of a later task that fits",()=>{
  const result=select([task("later-fits",{due:"2026-10-26",duration:30}),task("sooner-long",{due:"2026-10-22",duration:120})],{today,availableMinutes:45});
  assert.equal(result.task.id,"sooner-long");
});
test("within an urgency band, a task that fits beats one that does not",()=>{
  const result=select([task("long",{duration:90}),task("fits",{duration:30})],{today,availableMinutes:45});
  assert.equal(result.task.id,"fits");assert.equal(result.fitRank,0);
});
test("priority breaks equal deadline and fit ties",()=>{
  const result=select([task("low",{priority:"low"}),task("high",{priority:"high"})],{today,availableMinutes:45});
  assert.equal(result.task.id,"high");
});
test("completed work is excluded and empty lists return null",()=>{
  assert.equal(select([task("done",{done:true})],{today,availableMinutes:45}),null);
  assert.equal(select([], {today,availableMinutes:45}),null);
  assert.equal(select(null, {today,availableMinutes:45}),null);
});
test("missing deadlines and durations are safe and rank after known dated work",()=>{
  const result=select([task("undated",{due:"",duration:undefined}),task("dated")],{today,availableMinutes:45});
  assert.equal(result.task.id,"dated");
  const onlyMissing=select([task("unknown",{due:"bad-date",duration:undefined,priority:"unknown"})],{today,availableMinutes:45});
  assert.equal(onlyMissing.task.id,"unknown");assert.equal(onlyMissing.delta,null);assert.equal(onlyMissing.minutes,null);
});
test("changes in tasks and available time recalculate the result",()=>{
  const tasks=[task("long",{duration:90,priority:"high"}),task("short",{duration:30,priority:"low"})];
  assert.equal(select(tasks,{today,availableMinutes:45}).task.id,"short");
  assert.equal(select(tasks,{today,availableMinutes:120}).task.id,"long");
  tasks[0].done=true;assert.equal(select(tasks,{today,availableMinutes:120}).task.id,"short");
});
test("invalid study windows disable fit assumptions",()=>{
  const result=select([task("missing",{duration:undefined}),task("known")],{today,availableMinutes:0});
  assert.equal(result.hasAvailable,false);assert.ok(result);
});
