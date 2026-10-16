/* Paste tab-separated Excel/Sheets data; apply only to local drafts. */
function exImportNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');}
function exImportParse(text,roster){
 const aliases={mahs:'code',mahocsinh:'code',studentcode:'code',hoten:'name',hovaten:'name',tenhocsinh:'name',hocsinh:'name',toan:'TOAN',nguvan:'VAN',van:'VAN',anh:'ANH',tienganh:'ANH',ngoaingu:'ANH',ly:'LY',vatly:'LY',li:'LY',vatli:'LY',hoa:'HOA',hoahoc:'HOA',sinh:'SINH',sinhhoc:'SINH'};
 const lines=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n').filter(l=>l.trim());
 const errors=[],rows=[];if(lines.length<2)return {errors:['Dán cả hàng tiêu đề và ít nhất một học sinh.'],rows};
 const headers=lines[0].split('\t'),cols=headers.map(h=>aliases[exImportNorm(h)]||null),subjects=cols.filter(k=>['TOAN','VAN','ANH','LY','HOA','SINH'].includes(k));
 if(!cols.includes('code')&&!cols.includes('name'))errors.push('Cần cột Mã HS hoặc Họ tên để đối chiếu học sinh.');
 if(!subjects.length)errors.push('Chưa nhận diện được cột môn học. Dùng tiêu đề: Toán, Văn, Anh, Lý, Hóa, Sinh.');
 if(new Set(cols.filter(Boolean)).size!==cols.filter(Boolean).length)errors.push('Có cột nhận diện hoặc môn học bị lặp trong tiêu đề.');
 if(errors.length)return {errors,rows};
 const seen=new Set();
 lines.slice(1).forEach((line,i)=>{
  const cells=line.split('\t').map(v=>v.trim()),at='Dòng '+(i+2)+': ';if(cells.length!==cols.length){errors.push(at+'số ô khác hàng tiêu đề.');return;}
  const get=k=>cells[cols.indexOf(k)]||'',code=get('code'),name=get('name');
  const matches=code?roster.filter(s=>String(s.code)===code):name?roster.filter(s=>exImportNorm(s.name)===exImportNorm(name)):[];
  if(matches.length!==1){errors.push(at+(matches.length?'trùng họ tên, cần dùng Mã HS.':'không tìm thấy học sinh '+(code||name||'(trống)')+'.'));return;}
  const s=matches[0];if(name&&exImportNorm(name)!==exImportNorm(s.name)){errors.push(at+'mã và họ tên không khớp.');return;}
  if(seen.has(s.code)){errors.push(at+'học sinh xuất hiện nhiều lần.');return;}seen.add(s.code);
  const scores={};subjects.forEach(k=>{const v=get(k);if(v==='')return;const n=erNumber(v);if(n===null)errors.push(at+EXAM_LABELS[k]+' phải từ 0–10, tối đa 2 chữ số thập phân.');else scores[k]=n;});
  if(Object.keys(scores).length)rows.push({code:s.code,name:s.name,scores});
 });
 if(!rows.length&&!errors.length)errors.push('Bảng chưa có điểm để áp dụng.');
 return {errors,rows,ignored:headers.filter((h,i)=>!cols[i])};
}
function exImportOpen(){if(examUI.busy)return;examUI.importer={id:examUI.id,text:'',result:null};exRefresh();}
function exImportPreview(){const imp=examUI.importer;if(!imp||imp.id!==examUI.id)return;imp.result=exImportParse(imp.text,examUI.book.roster);exRefresh();}
function exImportApply(){
 const imp=examUI.importer;if(examUI.busy||!imp||imp.id!==examUI.id)return;
 const r=exImportParse(imp.text,examUI.book.roster);if(r.errors.length){imp.result=r;exRefresh();return;}
 const draft={...(examUI.drafts[examUI.id]||{})};r.rows.forEach(x=>{const row=JSON.parse(JSON.stringify(exRow(examUI.book.roster.find(s=>s.code===x.code))));Object.assign(row.scores,x.scores);draft[x.code]=row;});
 const next={...examUI.drafts,[examUI.id]:draft};try{localStorage.setItem(EXAM_DRAFT_KEY,JSON.stringify(next));}catch(e){showToast('Không đủ bộ nhớ để giữ bản nhập. Chưa áp dụng bảng điểm.','error');return;}
 examUI.drafts=next;examUI.importer=null;exRefresh();showToast('Đã điền điểm cho '+r.rows.length+' học sinh. Bấm Lưu điểm lên Sheet để đồng bộ.','success');
}
function exImportHtml(){
 const imp=examUI.importer;if(!imp||imp.id!==examUI.id)return '';const r=imp.result;
 return `<section class="border border-indigo-200 bg-indigo-50 rounded-xl p-4 mt-4"><h3 class="font-bold text-lg">Dán bảng điểm từ Excel / Google Sheets</h3><p class="text-sm my-2">Copy cả hàng tiêu đề và dữ liệu. Cần cột <b>Họ tên</b> hoặc <b>Mã HS</b>, cùng các cột Toán, Văn, Anh, Lý, Hóa, Sinh (có thể chỉ dán một vài môn, thứ tự tùy ý). Ô trống giữ nguyên điểm cũ. Điểm mới thay thế điểm đang nhập ở cùng môn.</p><label class="block font-bold">Bảng điểm<textarea aria-label="Bảng điểm dán từ Excel" class="block w-full border rounded-lg p-3 font-mono text-sm mt-2" rows="7" placeholder="Họ tên&#9;Toán&#9;Văn&#9;Anh&#10;Nguyễn Văn An&#9;8,5&#9;7&#9;9" oninput="examUI.importer.text=this.value;examUI.importer.result=null;document.getElementById('ex-import-result').innerHTML=''">${exEsc(imp.text)}</textarea></label><div class="flex gap-3 mt-3"><button type="button" onclick="exImportPreview()" class="${exBtn}">Đối chiếu và xem trước</button><button type="button" onclick="examUI.importer=null;exRefresh()" class="${exBtn}">Đóng</button></div><div id="ex-import-result">${!r?'':r.errors.length?'<div role="alert" class="text-red-800 mt-3"><b>Chưa áp dụng. Sửa các dòng sau rồi xem trước lại:</b><ul>'+r.errors.map(e=>'<li>'+exEsc(e)+'</li>').join('')+'</ul></div>':`<p class="font-bold mt-3">Khớp ${r.rows.length} học sinh · ${r.rows.reduce((n,x)=>n+Object.keys(x.scores).length,0)} ô điểm. Chưa lưu lên Sheet.</p>${r.ignored.length?'<p class="text-sm">Bỏ qua cột: '+exEsc(r.ignored.join(', '))+'</p>':''}<div class="overflow-auto max-h-80 my-3"><table class="w-full text-sm bg-white"><thead><tr><th>Học sinh</th>${erSubjects().map(k=>'<th>'+EXAM_LABELS[k]+'</th>').join('')}</tr></thead><tbody>${r.rows.map(x=>{const old=exRow(examUI.book.roster.find(s=>s.code===x.code));return '<tr class="border-t"><td class="p-2">'+exEsc(x.name)+'</td>'+erSubjects().map(k=>'<td class="p-2 text-center">'+(Object.hasOwn(x.scores,k)?exEsc(exNum(erNumber(old.scores[k])))+' → <b>'+exEsc(exNum(x.scores[k]))+'</b>':'Giữ nguyên')+'</td>').join('')+'</tr>';}).join('')}</tbody></table></div><button type="button" class="${exBtn}" onclick="exImportApply()">Áp dụng vào bảng nhập</button>`}</div></section>`;
}
