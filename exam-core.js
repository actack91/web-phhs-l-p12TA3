// Shared, pure calculations used by the web and Apps Script.
function erSubjects(){return ['TOAN','VAN','ANH','LY','HOA','SINH'];}
// Subject mappings cross-checked against official university admissions tables (2026).
function erBlocks(){return {A00:['TOAN','LY','HOA'],A01:['TOAN','LY','ANH'],A02:['TOAN','LY','SINH'],B00:['TOAN','HOA','SINH'],B03:['TOAN','SINH','VAN'],B08:['TOAN','SINH','ANH'],C01:['VAN','TOAN','LY'],C02:['VAN','TOAN','HOA'],C05:['VAN','LY','HOA'],C06:['VAN','SINH','LY'],C08:['VAN','HOA','SINH'],D01:['VAN','TOAN','ANH'],D07:['TOAN','HOA','ANH'],D08:['TOAN','SINH','ANH'],D11:['VAN','LY','ANH'],D12:['VAN','HOA','ANH'],D13:['VAN','SINH','ANH']};}
function erChoices(registration){
 const raw=String(registration||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const explicit=raw.match(/[A-Z]\d{2}/g)||[],subjects=[];
 if(explicit.length)explicit.forEach(code=>(erBlocks()[code]||[]).forEach(s=>subjects.push(s)));
 else ['ANH','LY','HOA','SINH'].forEach(s=>{if(new RegExp('(^|[^A-Z])'+s+'([^A-Z]|$)').test(raw))subjects.push(s);});
 const choices=Array.from(new Set(subjects.filter(s=>['ANH','LY','HOA','SINH'].includes(s))));return choices.length===2?choices:[];
}
function erNumber(v){if(v===null||v===undefined||String(v).trim()==='')return null;const t=String(v).trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(t))return null;const n=Number(t);return n>=0&&n<=10?n:null;}
function erTotal(scores,subjects){if(!subjects||!subjects.length||subjects.some(s=>scores[s]===null||scores[s]===undefined))return null;return subjects.reduce((sum,s)=>sum+Math.round(scores[s]*100),0)/100;}
function erStats(value,values){const nums=values.filter(v=>v!==null&&Number.isFinite(v));return {value,average:nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null,rank:value===null?null:1+nums.filter(v=>Math.round(v*100)>Math.round(value*100)).length,count:nums.length};}
function erReport(period,student,roster){
 const rows=period.rows,own=rows.find(r=>r.code===student.code)||{scores:Object.fromEntries(erSubjects().map(s=>[s,null])),electives:erChoices(student.block)};
 const subjects=erSubjects().map(code=>({code,...erStats(own.scores[code],rows.map(r=>r.scores[code]))}));
 const choices=own.electives,selection=choices.length===2&&choices[0]!==choices[1]&&choices.every(s=>['ANH','LY','HOA','SINH'].includes(s))?['TOAN','VAN'].concat(choices):[];
 const preferred=String(student.block||'').toUpperCase().match(/[A-Z]\d{2}/g)||[];
 const map=erBlocks(),available=Object.keys(map).filter(code=>selection.length&&map[code].every(s=>selection.includes(s)));
 const codes=Array.from(new Set(preferred.concat(available)));
 const blocks=codes.map(code=>{const group=map[code],eligible=!!group&&group.every(s=>selection.includes(s));const peers=eligible?rows.filter(r=>r.electives.length===2&&r.electives[0]!==r.electives[1]&&group.every(s=>['TOAN','VAN'].concat(r.electives).includes(s))):[];return {code,preferred:preferred.includes(code),eligible,subjects:group||[],...erStats(eligible?erTotal(own.scores,group):null,peers.map(r=>erTotal(r.scores,group)))};});
 return {id:period.id,title:period.title,year:period.year,date:period.date,subjects,electives:choices,selection,blocks,registration:student.block,goal:student.goal};
}
