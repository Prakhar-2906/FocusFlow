(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.FocusFlowRadar=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const pad=value=>String(value).padStart(2,"0");
  function key(date){return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join("-")}
  function parse(value){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const [y,m,d]=value.split("-").map(Number),date=new Date(y,m-1,d,12);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null}
  function level(minutes){return minutes>150?"heavy":minutes>60?"moderate":"light"}
  function workload(tasks,dateKey){const dated=(Array.isArray(tasks)?tasks:[]).filter(task=>task&&task.due===dateKey),open=dated.filter(task=>!task.done),minutes=open.reduce((sum,task)=>sum+(Number(task.duration)||0),0);return {key:dateKey,tasks:dated,open,minutes,level:level(minutes)}}
  function monthGrid(year,month){const first=new Date(year,month,1,12),start=new Date(year,month,1-first.getDay(),12);return Array.from({length:42},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return {date,key:key(date),inMonth:date.getMonth()===month}})}
  function shiftMonth(year,month,delta){const date=new Date(year,month+delta,1,12);return {year:date.getFullYear(),month:date.getMonth()}}
  return Object.freeze({key,parse,level,workload,monthGrid,shiftMonth});
});
