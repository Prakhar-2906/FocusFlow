(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  else root.FocusFlowRecommendation=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const priorityRank={high:3,medium:2,low:1};
  function dayNumber(value){
    if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const [year,month,day]=value.split("-").map(Number);
    const stamp=Date.UTC(year,month-1,day);
    const check=new Date(stamp);
    return check.getUTCFullYear()===year&&check.getUTCMonth()===month-1&&check.getUTCDate()===day?Math.floor(stamp/86400000):null;
  }
  function urgencyBand(delta){
    if(delta===null)return 5;
    if(delta<0)return 0;
    if(delta===0)return 1;
    if(delta<=2)return 2;
    if(delta<=7)return 3;
    return 4;
  }
  function rank(tasks,options={}){
    if(!Array.isArray(tasks))return [];
    const today=dayNumber(options.today);
    const available=Number(options.availableMinutes);
    const hasAvailable=Number.isFinite(available)&&available>=15&&available<=720;
    const candidates=tasks.filter(task=>task&& !task.done).map(task=>{
      const dueDay=dayNumber(task.due);
      const delta=dueDay===null||today===null?null:dueDay-today;
      const duration=Number(task.duration);
      const minutes=Number.isFinite(duration)&&duration>0?duration:null;
      const priority=String(task.priority||"").toLowerCase();
      const fitRank=minutes===null||!hasAvailable?1:(minutes<=available?0:2);
      return {task,delta,urgency:urgencyBand(delta),fitRank,priorityRank:priorityRank[priority]||0,minutes,hasAvailable,priority};
    });
    candidates.sort((a,b)=>a.urgency-b.urgency||((a.delta??Infinity)-(b.delta??Infinity))||a.fitRank-b.fitRank||b.priorityRank-a.priorityRank||((a.minutes??Infinity)-(b.minutes??Infinity))||String(a.task.title||"").localeCompare(String(b.task.title||""))||String(a.task.id||"").localeCompare(String(b.task.id||"")));
    return candidates;
  }
  function select(tasks,options={}){return rank(tasks,options)[0]||null}
  return Object.freeze({select,rank});
});
