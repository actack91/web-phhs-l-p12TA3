// Exam reports: independent periods; no changes to existing test score columns.
function erSubjects(){return ['TOAN','VAN','ANH','LY','HOA','SINH'];}
// Subject mappings cross-checked against official university admissions tables (2026).
function erBlocks(){return {A00:['TOAN','LY','HOA'],A01:['TOAN','LY','ANH'],A02:['TOAN','LY','SINH'],B00:['TOAN','HOA','SINH'],B03:['TOAN','SINH','VAN'],B08:['TOAN','SINH','ANH'],C01:['VAN','TOAN','LY'],C02:['VAN','TOAN','HOA'],C05:['VAN','LY','HOA'],C06:['VAN','SINH','LY'],C08:['VAN','HOA','SINH'],D01:['VAN','TOAN','ANH'],D07:['TOAN','HOA','ANH'],D08:['TOAN','SINH','ANH'],D11:['VAN','LY','ANH'],D12:['VAN','HOA','ANH'],D13:['VAN','SINH','ANH']};}
function erHash(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value)));}
function erChoices(registration){
 const raw=String(registration||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const explicit=raw.match(/[A-Z]\d{2}/g)||[],subjects=[];
 if(explicit.length)explicit.forEach(code=>(erBlocks()[code]||[]).forEach(s=>subjects.push(s)));
 else ['ANH','LY','HOA','SINH'].forEach(s=>{if(new RegExp('(^|[^A-Z])'+s+'([^A-Z]|$)').test(raw))subjects.push(s);});
 const choices=Array.from(new Set(subjects.filter(s=>['ANH','LY','HOA','SINH'].includes(s))));return choices.length===2?choices:[];
}
function erTable(name,headers,create){
 const ss=SpreadsheetApp.getActiveSpreadsheet();let sheet=ss.getSheetByName(name);
 if(!sheet&&create){sheet=ss.insertSheet(name);sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);sheet.getRange('A:B').setNumberFormat('@');}
 if(!sheet)return {sheet:null,rows:[]};
 const values=sheet.getDataRange().getDisplayValues();
 if(JSON.stringify(values[0].slice(0,headers.length))!==JSON.stringify(headers))throw new Error('Cấu trúc '+name+' đã thay đổi. Hãy kiểm tra tiêu đề cột.');
 return {sheet,rows:values.slice(1).filter(r=>r[0])};
}
function erPeriods(create){return erTable('KY_THI',['MaKy','NamHoc','TenKy','Ngay','TrangThai','CapNhatLuc'],create);}
function erScores(create){return erTable('DIEM_KY_THI',['MaKy','MaHS','TOAN','VAN','ANH','LY','HOA','SINH','TuChon1','TuChon2','CapNhatLuc'],create);}
function erRoster(){return getClassList().filter(s=>String(s.studentCode||'').trim()).map(s=>({code:String(s.studentCode).trim(),name:s.name,block:String(s.khoiThi||'').trim().toUpperCase(),goal:s.tongDiemMucTieu||''}));}
function erNumber(v){if(v===null||v===undefined||String(v).trim()==='')return null;const t=String(v).trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(t))return null;const n=Number(t);return n>=0&&n<=10?n:null;}
function erRecord(row){const scores={};erSubjects().forEach((s,i)=>scores[s]=erNumber(row[i+2]));return {code:String(row[1]),scores,electives:row.slice(8,10).filter(Boolean),revision:erHash(row)};}
function erRead(){
 const periods=erPeriods(false).rows,scores=erScores(false).rows,roster=erRoster(),valid=new Set(roster.map(s=>s.code));
 const seen=new Set();scores.forEach(r=>{const key=r[0]+'|'+r[1];if(seen.has(key))throw new Error('Có dòng điểm trùng mã kỳ và mã học sinh trong DIEM_KY_THI.');seen.add(key);});
 const ids=new Set();periods.forEach(r=>{if(ids.has(r[0]))throw new Error('Có mã kỳ thi trùng trong KY_THI.');ids.add(r[0]);});
 return {roster,periods:periods.map(p=>{const rows=scores.filter(r=>r[0]===p[0]&&valid.has(String(r[1])));return {id:p[0],year:p[1],title:p[2],date:p[3],published:p[4]==='PUBLISHED',revision:erHash([p,rows]),rows:rows.map(erRecord)};})};
}
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
function erParentReports(studentCode){const book=erRead(),student=book.roster.find(s=>s.code===String(studentCode));if(!student)return [];return book.periods.filter(p=>p.published).map(p=>erReport(p,student,book.roster));}
function examHandle(p){
 assertAdminKey(p.adminKey);
 if(p.mode==='exam-book')return {ok:true,book:erRead()};
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const now=new Date().toISOString();
  if(p.mode==='exam-create'){
   const year=String(p.year||'').trim(),title=String(p.title||'').trim(),id=String(p.id||'');
   if(!/^\d{4}-\d{4}$/.test(year)||!title||title.length>100||!/^[a-zA-Z0-9_-]{8,80}$/.test(id))throw new Error('Tên kỳ, năm học hoặc mã kỳ không hợp lệ.');
   if(p.date&&!/^\d{4}-\d{2}-\d{2}$/.test(p.date))throw new Error('Ngày thi không hợp lệ.');
   const table=erPeriods(true),existing=table.rows.find(r=>r[0]===id);
   if(existing){if(existing[1]!==year||existing[2]!==title)throw new Error('Mã kỳ đã được dùng.');return {ok:true,book:erRead(),id};}
   if(table.rows.some(r=>r[1]===year&&r[2].toLowerCase()===title.toLowerCase()))throw new Error('Đã có kỳ thi cùng tên trong năm học này. Hãy chọn kỳ đã tạo.');
   table.sheet.appendRow([id,year,title,String(p.date||''),'DRAFT',now]);
   return {ok:true,book:erRead(),id};
  }
  const book=erRead(),period=book.periods.find(x=>x.id===p.id);if(!period)throw new Error('Không tìm thấy kỳ thi.');
  if(p.mode==='exam-save-row'){
   const student=book.roster.find(x=>x.code===String(p.code));if(!student)throw new Error('Học sinh không thuộc danh sách lớp.');
   let input;try{input=JSON.parse(p.data);}catch(e){throw new Error('Dữ liệu điểm không hợp lệ.');}
   if(!input||!Array.isArray(input.scores)||input.scores.length!==6||!Array.isArray(input.electives))throw new Error('Cần đủ 6 ô điểm.');
   const choices=input.electives;if(choices.length!==2||choices[0]===choices[1]||choices.some(s=>!['ANH','LY','HOA','SINH'].includes(s)))throw new Error('Chọn 2 môn tự chọn khác nhau.');
   const numbers=input.scores.map(v=>{const n=erNumber(v);if(n===null&&v!==null&&v!==undefined&&String(v).trim()!=='')throw new Error('Điểm phải từ 0 đến 10, tối đa 2 chữ số thập phân.');return n===null?'':n;});
   const table=erScores(true),index=table.rows.findIndex(r=>r[0]===p.id&&r[1]===String(p.code)),old=index>=0?table.rows[index]:null;
   const row=[p.id,String(p.code)].concat(numbers,choices,[now]);
   // Retrying an already committed row after a lost response is safe.
   if(old&&JSON.stringify(erRecord(old).scores)===JSON.stringify(erRecord(row).scores)&&JSON.stringify(old.slice(8,10))===JSON.stringify(choices))return {ok:true,record:erRecord(old)};
   if((old?erHash(old):'')!==String(p.revision||''))throw new Error('Điểm trên Sheet đã thay đổi. Tải lại rồi đối chiếu trước khi lưu.');
   // Any edit returns the period to draft so PHHS never sees a partially saved batch.
   const pt=erPeriods(false).sheet,all=pt.getDataRange().getDisplayValues(),pi=all.findIndex(r=>r[0]===p.id);pt.getRange(pi+1,5,1,2).setValues([['DRAFT',now]]);
   if(index>=0){const all=table.sheet.getDataRange().getDisplayValues();const actual=all.findIndex((r,i)=>i>0&&r[0]===p.id&&r[1]===String(p.code));table.sheet.getRange(actual+1,1,1,11).setValues([row]);}else table.sheet.appendRow(row);
   SpreadsheetApp.flush();
   const saved=erScores(false).rows.find(r=>r[0]===p.id&&r[1]===String(p.code));return {ok:true,record:erRecord(saved)};
  }
  if(p.mode==='exam-publish'){
   if(period.revision!==p.revision)throw new Error('Dữ liệu đã thay đổi. Tải lại và kiểm tra trước khi công bố.');
   if(p.published==='yes'&&!period.rows.some(r=>erSubjects().some(s=>r.scores[s]!==null)))throw new Error('Chưa có điểm để công bố.');
   const t=erPeriods(false).sheet,values=t.getDataRange().getDisplayValues(),index=values.findIndex(r=>r[0]===p.id);t.getRange(index+1,5,1,2).setValues([[p.published==='yes'?'PUBLISHED':'DRAFT',now]]);SpreadsheetApp.flush();return {ok:true,book:erRead()};
  }
  throw new Error('Thao tác kỳ thi không hợp lệ.');
 }finally{lock.releaseLock();}
}
