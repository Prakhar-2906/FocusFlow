(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.FocusFlowProgress=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function summarize(tasks,today){
    const all=Array.isArray(tasks)?tasks:[];
    const dueToday=all.filter(task=>task&&task.due===today);
    const completed=all.filter(task=>task&&task.done).length;
    const completedToday=dueToday.filter(task=>task.done).length;
    const percent=(done,total)=>total?Math.round(done/total*100):0;
    return {
      overall:{completed,total:all.length,percent:percent(completed,all.length)},
      today:{completed:completedToday,total:dueToday.length,percent:percent(completedToday,dueToday.length)}
    };
  }
  return Object.freeze({summarize});
});
