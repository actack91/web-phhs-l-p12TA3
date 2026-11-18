(function(root){
 'use strict';
 function summarize(students,records,month){
  const codes=new Set(students.map(s=>String(s.code))),latest=new Map(),statuses=['present','excused','unexcused','late'];
  for(const r of records){
   if(!codes.has(String(r.code))||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||r.date.slice(0,7)!==month||!statuses.includes(r.status))continue;
   const key=String(r.code)+'|'+r.date,old=latest.get(key);
   if(!old||String(r.updatedAt||'')>String(old.updatedAt||''))latest.set(key,r);
  }
  const current=[...latest.values()],days=[...new Set(current.map(r=>r.date))].sort(),total={present:0,excused:0,unexcused:0,late:0};
  const rows=students.map(s=>{
   const own=current.filter(r=>String(r.code)===String(s.code)).sort((a,b)=>b.date.localeCompare(a.date));
   const row={...s,code:String(s.code),present:0,excused:0,unexcused:0,late:0,missing:days.length-own.length,records:own};
   for(const r of own){row[r.status]++;total[r.status]++;}return row;
  });
  return {rows,days,total};
 }
 const api={summarize};if(typeof module==='object'&&module.exports)module.exports=api;else root.AttendanceMonthly=api;
})(typeof globalThis==='object'?globalThis:this);
