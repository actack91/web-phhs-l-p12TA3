const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/score-sync.js','utf8');
const test=(code)=>({code,subjectCode:'TOAN',title:code,date:'01/09/2026'});
const a=test('TOAN_BAI_01'),b=test('TOAN_BAI_02');
let saved={},calls=[],responses=[];
const fields=[{dataset:{scoreField:'score',studentCode:'123'},value:'0'},{dataset:{scoreField:'note',studentCode:'123'},value:'ghi chú'}];
const ctx={window:{},state:{scoreBook:{tests:[a,b],students:[{studentCode:'123',scores:{[a.code]:{score:'0'},[b.code]:{score:'8'}}}],selectedTestCode:a.code}},localStorage:{setItem:(k,v)=>saved[k]=v,getItem:k=>saved[k]},document:{querySelectorAll:()=>fields,getElementById:()=>null},setInterval:()=>{},setTimeout:()=>{},saveData:()=>{},renderLayout:()=>{},showToast:()=>{},confirm:()=>true,getGoogleAdminKey:async()=> 'test',rememberGoogleAdminKey:()=>{},requestScoreBookGoogle:async(mode,p)=>{calls.push({mode,p});const v=responses.shift();if(v instanceof Error)throw v;return v;}};
vm.createContext(ctx);vm.runInContext(source,ctx);
// Window globals are globals in browsers.
Object.assign(ctx,ctx.window);
(async()=>{
 const empty={tests:[],students:[]};
 let merged=ctx.scoreMerge(empty,ctx.state.scoreBook);
 assert.equal(merged.tests.length,2);assert.equal(merged.students[0].scores[b.code].score,'8');
 assert.equal(merged.tests[0].localOnly,true);
 responses=[new Error('Không tìm thấy bài kiểm tra cần cập nhật.'),{scoreBook:{tests:[a],students:[{studentCode:'123',scores:{[a.code]:{score:'0'}}}],selectedTestCode:a.code}}];
 await ctx.saveScoreBook();
 assert.equal(calls.length,2);let recovery=JSON.parse(calls[1].p.scoreData);
 assert.equal(recovery.test.code,a.code);assert.equal(recovery.test.recoverMissing,true);assert.equal(recovery.scores[0].score,'0');
 assert.equal(ctx.state.scoreBook.tests.length,2);assert.equal(ctx.state.scoreBook.students[0].scores[b.code].score,'8');
 assert(saved.scoreBookRecoveryV1);
 // A failed network save keeps draft scores.
 calls=[];responses=[new Error('network')];await ctx.saveScoreBook();assert.equal(ctx.state.scoreDrafts[a.code]['123'].score,'0');
 // Refresh never overwrites edits.
 calls=[];await ctx.loadScoreBookFromGoogle();assert.equal(calls.length,0);
 // Server-deleted tests are not resurrected from browser cache.
 merged=ctx.scoreMerge({tests:[],students:[],deletedTests:[{code:a.code}]},ctx.state.scoreBook);
 assert(!merged.tests.some(t=>t.code===a.code));assert(merged.tests.some(t=>t.code===b.code));
 console.log('PASS: recovery preserves codes, zero scores and other local tests; network failure retains drafts; refresh protects edits; archived tests stay deleted');
})().catch(e=>{console.error(e);process.exitCode=1});
