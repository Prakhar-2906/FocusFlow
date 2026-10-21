"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Radar=require("./workload-radar.js");
test("month grid aligns weekdays and covers leap and short months",()=>{
  const feb=Radar.monthGrid(2024,1);assert.equal(feb.length,42);assert.equal(feb.findIndex(x=>x.key==="2024-02-01")%7,4);assert.equal(feb.filter(x=>x.inMonth).length,29);
  assert.equal(Radar.monthGrid(2026,1).filter(x=>x.inMonth).length,28);assert.equal(Radar.monthGrid(2026,3).filter(x=>x.inMonth).length,30);
});
test("month navigation crosses years in both directions",()=>{
  assert.deepEqual(Radar.shiftMonth(2026,11,1),{year:2027,month:0});assert.deepEqual(Radar.shiftMonth(2026,0,-1),{year:2025,month:11});
});
test("workload uses open task estimates and existing pressure thresholds",()=>{
  const tasks=[{due:"2026-10-21",duration:60},{due:"2026-10-21",duration:30},{due:"2026-10-21",duration:120,done:true},{due:"2026-10-22",duration:500}];
  assert.deepEqual(Radar.workload(tasks,"2026-10-21"),{key:"2026-10-21",tasks:tasks.slice(0,3),open:tasks.slice(0,2),minutes:90,level:"moderate"});
  assert.equal(Radar.level(60),"light");assert.equal(Radar.level(61),"moderate");assert.equal(Radar.level(151),"heavy");
  assert.equal(Radar.workload(tasks,"2026-10-23").tasks.length,0);
});
