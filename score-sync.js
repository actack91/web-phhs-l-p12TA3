// Google Sheets is shared storage; local drafts are never silently discarded.
let scoreSyncBusy = false;
function scoreBackup() {
    localStorage.setItem('scoreBookRecoveryV1', JSON.stringify({at:new Date().toISOString(), book:state.scoreBook, drafts:state.scoreDrafts || {}}));
}
function scoreMerge(remote, previous, removedCode) {
    const gone = new Set((remote.deletedTests || []).map(t=>t.code));
    const known = new Set((remote.tests || []).map(t=>t.code));
    const local = (previous.tests || []).filter(t=>!known.has(t.code) && !gone.has(t.code) && t.code!==removedCode);
    remote.tests = [...remote.tests, ...local.map(t=>({...t,localOnly:true}))];
    const byCode = Object.fromEntries((remote.students || []).map(s=>[String(s.studentCode),s]));
    (previous.students || []).forEach(s=>{
        if(!byCode[String(s.studentCode)]) { const row={...s,scores:{}}; remote.students.push(row); byCode[String(s.studentCode)]=row; }
        local.forEach(t=>{if(s.scores && s.scores[t.code]) byCode[String(s.studentCode)].scores[t.code]=s.scores[t.code];});
    });
    return remote;
}
function scoreApply(response, old, removedCode, selection) {
    state.scoreBook=scoreMerge(response.scoreBook,old,removedCode);
    Object.assign(state.scoreBook,{selectedSubject:old.selectedSubject||'TOAN',selectedTestCode:selection || old.selectedTestCode||'',loaded:true,loading:false,updatedAt:response.updatedAt});
    saveData(); renderLayout();
}
window.scoreDraftChanged=function() {
    const code=state.scoreBook.selectedTestCode;
    state.scoreDrafts=state.scoreDrafts||{};
    const records={};
    document.querySelectorAll('[data-score-field]').forEach(input=>{
        const id=input.dataset.studentCode;
        records[id]=records[id]||{}; records[id][input.dataset.scoreField]=input.value;
    });
    state.scoreDrafts[code]=records; saveData();
};
window.downloadScoreBackup=function() {
    scoreBackup();
    const url=URL.createObjectURL(new Blob([localStorage.getItem('scoreBookRecoveryV1')],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download='sao-luu-diem-'+Date.now()+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.loadScoreBookFromGoogle=async function(options={}) {
    if(scoreSyncBusy) return;
    const dirty=Object.keys(state.scoreDrafts||{}).length || state.scoreBook.draftTest;
    if(dirty) { if(!options.silent) showToast('Có điểm đang nhập. Hãy lưu điểm trước khi tải lại; bản nhập vẫn được giữ.','error'); return; }
    scoreSyncBusy=true;
    try {
        const key=await getGoogleAdminKey(); if(!key) return;
        scoreBackup(); const old=state.scoreBook;
        const result=await requestScoreBookGoogle('score-book',{adminKey:key});
        // A user may start typing while the request is in flight.
        if(Object.keys(state.scoreDrafts||{}).length || state.scoreBook.draftTest) return;
        scoreApply(result,old); rememberGoogleAdminKey(key);
        if(!options.silent) showToast('Đã cập nhật từ Sheet. Các bài chỉ có trên máy vẫn được giữ.','success');
    } catch(e) { if(!options.silent) showToast(e.message,'error'); }
    finally {scoreSyncBusy=false;}
};
window.saveScoreBook=async function() {
    if(scoreSyncBusy) return;
    const old=state.scoreBook, test=old.selectedTestCode==='__new__'?old.draftTest:(old.tests||[]).find(t=>t.code===old.selectedTestCode);
    if(!test) return showToast('Vui lòng chọn bài kiểm tra.','error');
    scoreDraftChanged(); scoreBackup();
    const scores=Object.entries(state.scoreDrafts[test.code]||{}).map(([studentCode,v])=>({studentCode,score:String(v.score||'').trim().replace(',','.'),note:String(v.note||'').trim()}));
    if(scores.some(s=>s.score && (!Number.isFinite(Number(s.score)) || Number(s.score)<0 || Number(s.score)>10))) return showToast('Điểm phải từ 0 đến 10.','error');
    scoreSyncBusy=true;
    const button=document.getElementById('save-score-book-button');
    if(button) {button.disabled=true;button.textContent='Đang lưu lên Sheet…';}
    document.querySelectorAll('[data-score-field]').forEach(e=>e.disabled=true);
    try {
        const key=await getGoogleAdminKey(); if(!key) return;
        const payload={test:{...test,code:test.code==='__new__'?'':test.code},scores};
        let result;
        try {result=await requestScoreBookGoogle('score-book-save',{adminKey:key,scoreData:JSON.stringify(payload)});}
        catch(e) {
            if(!/Không tìm thấy bài kiểm tra cần cập nhật/.test(e.message)) throw e;
            if(!confirm('Bài “'+test.title+'” chỉ còn trên máy, không có trong Sheet. Tạo lại bài trên Sheet với toàn bộ điểm đang hiển thị?')) return;
            payload.test.recoverMissing=true; delete payload.test.revision;
            result=await requestScoreBookGoogle('score-book-save',{adminKey:key,scoreData:JSON.stringify(payload)});
        }
        delete state.scoreDrafts[test.code];
        scoreApply(result,old,test.code,result.scoreBook.selectedTestCode);
        rememberGoogleAdminKey(key); showToast('Đã lưu lên Google Sheets. PHHS sẽ đọc được điểm này.','success');
    } catch(e) {showToast(e.message+' Bản nhập vẫn được giữ trên máy.','error');}
    finally {scoreSyncBusy=false;renderLayout();}
};
window.deleteScoreTest=async function() {
    if(scoreSyncBusy) return;
    const old=state.scoreBook, test=(old.tests||[]).find(t=>t.code===old.selectedTestCode);
    if(!test) return;
    if(!confirm('Xóa bài “'+test.title+'”? Có thể khôi phục trong mục Bài đã xóa.')) return;
    scoreSyncBusy=true;
    try {
        scoreBackup(); const key=await getGoogleAdminKey(); if(!key) return;
        const current=await requestScoreBookGoogle('score-book',{adminKey:key});
        if(current.scoreBook.tests.some(t=>t.code===test.code)) {
            const result=await requestScoreBookGoogle('score-archive',{adminKey:key,testCode:test.code,revision:test.revision||''});
            delete (state.scoreDrafts||{})[test.code]; scoreApply(result,old,test.code);
        } else {
            state.scoreLocalTrash=state.scoreLocalTrash||[];
            state.scoreLocalTrash.push({test,students:JSON.parse(JSON.stringify(old.students)),draft:(state.scoreDrafts||{})[test.code]});
            old.tests=old.tests.filter(t=>t.code!==test.code); delete (state.scoreDrafts||{})[test.code];
            saveData(); renderLayout();
        }
        showToast('Đã xóa bài; có thể khôi phục.','success');
    } catch(e){showToast(e.message,'error');} finally {scoreSyncBusy=false;}
};
window.restoreScoreTest=async function(code,local) {
    if(scoreSyncBusy) return;
    if(local) {
        const entry=(state.scoreLocalTrash||[]).find(x=>x.test.code===code); if(!entry) return;
        if(state.scoreBook.tests.some(t=>t.code===code)) return showToast('Mã bài đã tồn tại.','error');
        const restored=scoreMerge(state.scoreBook,{tests:[entry.test],students:entry.students}); state.scoreBook=restored;
        if(entry.draft) {state.scoreDrafts=state.scoreDrafts||{};state.scoreDrafts[code]=entry.draft;}
        state.scoreLocalTrash=state.scoreLocalTrash.filter(x=>x!==entry);saveData();renderLayout();return;
    }
    scoreSyncBusy=true;
    try {const key=await getGoogleAdminKey();if(!key)return;scoreBackup();scoreApply(await requestScoreBookGoogle('score-restore',{adminKey:key,testCode:code}),state.scoreBook);}
    catch(e){showToast(e.message,'error');}finally{scoreSyncBusy=false;}
};
function scoreTrashHtml() {
    const list=[...(state.scoreBook.deletedTests||[]).map(t=>({...t,local:false})),...(state.scoreLocalTrash||[]).map(x=>({...x.test,local:true}))];
    return '<div class="flex gap-3 flex-wrap"><button class="p-3 border rounded-xl" onclick="downloadScoreBackup()">Tải bản sao lưu điểm</button></div><details class="mt-3"><summary>Bài đã xóa ('+list.length+')</summary>'+list.map(t=>'<div class="p-3">'+escapeHtmlText(t.title)+' <button class="text-blue-700 font-bold" onclick="restoreScoreTest('+escapeHtmlText(JSON.stringify(t.code))+','+t.local+')">Khôi phục</button></div>').join('')+'</details>';
}
setInterval(()=>{if(document.visibilityState==='visible' && state.currentTab==='diem-hoc-tap' && !scoreSyncBusy) loadScoreBookFromGoogle({silent:true});},60000);
