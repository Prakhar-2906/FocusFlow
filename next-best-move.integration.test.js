"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const Recommendation=require("./next-best-move.js");
const Progress=require("./progress.js");
const Radar=require("./workload-radar.js");
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("app.js","utf8");
function boot(task){
  const tasks=Array.isArray(task)?task:[task];
  const storage=new Map([["focusflow:v1",JSON.stringify({tasks,sessions:[],minutes:25})]]);
  class Element{
    constructor(id=""){this.id=id;this.value="";this._text="";this.innerHTML="";this.style={};this.dataset={};this.handlers={};this.hidden=false;this.open=false;this.inert=false;this.classList={items:new Set(),add:x=>this.classList.items.add(x),remove:x=>this.classList.items.delete(x),contains:x=>this.classList.items.has(x),toggle:(x,v)=>{const on=v===undefined?!this.classList.items.has(x):v;on?this.classList.items.add(x):this.classList.items.delete(x);return on}}}
    get textContent(){return this._text}
    set textContent(value){this._text=String(value)}
    addEventListener(name,fn){this.handlers[name]=fn}
    click(){this.handlers.click?.({target:this})}
    closest(){return null}
    setAttribute(name,value){this.attributes=this.attributes||{};this.attributes[name]=String(value)}
    getAttribute(name){return this.attributes?.[name]??null}
    showModal(){this.open=true}
    close(){this.open=false}
    focus(){}
    setCustomValidity(){}
    reportValidity(){return true}
    reset(){}
  }
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]);
  const elements=new Map(ids.map(id=>[id,new Element(id)]));
  const tabs=["all","active","done"].map(filter=>{const el=new Element();el.dataset.filter=filter;return el});
  const nav=Array.from({length:4},()=>new Element());
  const jumps=["today","overdue","upcoming"].map(value=>{const el=new Element();el.dataset.deadlineJump=value;return el});
  const document={body:{dataset:{}},querySelector:selector=>elements.get(selector.slice(1))||null,querySelectorAll:selector=>selector===".filter-tab"?tabs:selector===".nav-item"?nav:selector==="[data-deadline-jump]"?jumps:[],addEventListener(){}};
  const intervals=new Map();let intervalId=0;
  vm.runInNewContext(app,{FocusFlowRecommendation:Recommendation,FocusFlowProgress:Progress,FocusFlowRadar:Radar,document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},crypto:{randomUUID:()=>"task-fixed"},Intl,Date,Math,JSON,String,Number,Array,Set,Map,console,setTimeout(){},clearTimeout(){},setInterval(fn){const id=++intervalId;intervals.set(id,fn);return id},clearInterval(id){intervals.delete(id)},prompt(){return null}});
  return {elements,storage,tabs,intervals,tick(){for(const fn of intervals.values())fn()}};
}
test("starting Next Best Move links its task and enters Focus Mode",()=>{
  const today=new Date();
  const due=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const task={id:"recommended-task",title:"Read chapter 4",subject:"Biology",due,priority:"high",duration:30,done:false};
  const {elements,storage}=boot(task);
  elements.get("available-minutes").value="45";
  elements.get("next-move-start").click();
  assert.equal(elements.get("focus-overlay").classList.contains("visible"),true);
  assert.equal(elements.get("focus-task-select").value,task.id);
  assert.match(elements.get("immersive-task").innerHTML,/Read chapter 4/);
  assert.equal(JSON.parse(storage.get("focusflow:v1")).focusTaskId,task.id);
});

test("available-time edits refresh the recommendation explanation",()=>{
  const today=new Date();
  const due=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const task={id:"long-task",title:"Outline essay",subject:"Writing",due,priority:"medium",duration:60,done:false};
  const {elements}=boot(task);
  elements.get("available-minutes").value="45";
  elements.get("available-minutes").handlers.input();
  assert.match(elements.get("next-move-reason").textContent,/longer than your 45 min window/);
});
test("completing the recommended task updates to an empty state",()=>{
  const today=new Date();
  const due=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const task={id:"one-task",title:"Review notes",subject:"History",due,priority:"low",duration:15,done:false};
  const {elements}=boot(task);
  assert.equal(elements.get("overall-progress-count").textContent,"0 of 1 assignments");
  assert.equal(elements.get("today-progress-count").textContent,"0 of 1 assignments");
  elements.get("task-list").handlers.change({target:{dataset:{toggle:task.id},checked:true}});
  assert.equal(elements.get("overall-progress-count").textContent,"1 of 1 assignments");
  assert.equal(elements.get("today-progress-count").textContent,"1 of 1 assignments");
  assert.equal(elements.get("overall-progress-bar").getAttribute("aria-valuenow"),"100");
  assert.equal(elements.get("next-move-start").hidden,true);
  assert.equal(elements.get("next-move-empty").hidden,false);
  assert.match(elements.get("next-move-heading").textContent,/clear page/i);
});

test("progress calculations use all saved tasks despite a completed-task filter",()=>{
  const today=new Date(),due=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const tasks=[
    {id:"today",title:"Due today",subject:"Math",due,priority:"high",duration:15,done:false},
    {id:"later",title:"Later work",subject:"Science",due:"2099-01-01",priority:"low",duration:15,done:true,completedAt:due}
  ];
  const {elements,tabs}=boot(tasks);
  tabs.find(tab=>tab.dataset.filter==="done").click();
  assert.equal(elements.get("overall-progress-count").textContent,"1 of 2 assignments");
  assert.equal(elements.get("today-progress-count").textContent,"0 of 1 assignments");
});

test("Rescue My Day and Next Best Move share deadline ranking",()=>{
  const today=new Date();
  const dueAfter=days=>{const d=new Date(today);d.setDate(d.getDate()+days);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
  const tasks=[
    {id:"sooner",title:"Due sooner",subject:"Math",due:dueAfter(1),priority:"low",duration:15,done:false},
    {id:"later",title:"Due later",subject:"Science",due:dueAfter(2),priority:"high",duration:15,done:false}
  ];
  const {elements}=boot(tasks);
  assert.equal(elements.get("next-move-heading").textContent,"Due sooner");
  elements.get("available-minutes").value="90";
  elements.get("generate-plan").click();
  const schedule=elements.get("rescue-results").innerHTML;
  assert.ok(schedule.indexOf("Due sooner")<schedule.indexOf("Due later"));
});

test("workload radar switches to month view and navigates months",()=>{
  const today=new Date(),due=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const nextMonth=new Date(today.getFullYear(),today.getMonth()+1,1,12);
  const monthTitle=date=>new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(date);
  const task={id:"month-task",title:"Month task",subject:"Math",due,priority:"high",duration:90,done:false};
  const {elements}=boot(task);
  assert.equal(elements.get("radar-view").value,"week");
  elements.get("radar-view").value="month";
  elements.get("radar-view").handlers.change({target:elements.get("radar-view")});
  assert.match(elements.get("radar-chart").innerHTML,/class="month-day/);
  assert.equal((elements.get("radar-chart").innerHTML.match(/class="month-day [^"]*"/g)||[]).length,42);
  assert.equal(elements.get("radar-month-title").textContent,monthTitle(today));
  assert.match(elements.get("pressure-details").innerHTML,/Month task/);
  const tenth=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),"10"].join("-");
  elements.get("radar-chart").handlers.click({target:{closest:()=>({dataset:{pressureDate:tenth}})}});
  assert.match(elements.get("pressure-details").innerHTML,/10,/);
  elements.get("radar-chart").handlers.click({target:{closest:()=>({dataset:{pressureDate:due}})}});
  elements.get("radar-next-month").click();
  assert.equal(elements.get("radar-month-title").textContent,monthTitle(nextMonth));
  elements.get("radar-prev-month").click();
  assert.equal(elements.get("radar-month-title").textContent,monthTitle(today));
  elements.get("radar-view").value="week";
  elements.get("radar-view").handlers.change({target:elements.get("radar-view")});
  assert.match(elements.get("radar-chart").innerHTML,/class="pressure-day/);
});

test("focus timer counts down, pauses, resumes, and resets",()=>{
  const {elements,tick,intervals}=boot([]);
  assert.equal(elements.get("timer-display").textContent,"25:00");
  elements.get("timer-start").click();
  tick();assert.equal(elements.get("timer-display").textContent,"24:59");
  elements.get("timer-start").click();assert.equal(intervals.size,0);
  tick();assert.equal(elements.get("timer-display").textContent,"24:59");
  elements.get("timer-start").click();tick();assert.equal(elements.get("timer-display").textContent,"24:58");
  elements.get("timer-reset").click();assert.equal(intervals.size,0);assert.equal(elements.get("timer-display").textContent,"25:00");
});

test("completed focus timer records one session and refreshes study history",()=>{
  const {elements,tick,storage}=boot([]);elements.get("timer-start").click();
  for(let i=0;i<1500;i++)tick();
  const saved=JSON.parse(storage.get("focusflow:v1"));
  assert.equal(saved.sessions.length,1);assert.equal(saved.sessions[0].minutes,25);
  assert.equal(elements.get("study-activity").innerHTML.includes("25"),true);
});
