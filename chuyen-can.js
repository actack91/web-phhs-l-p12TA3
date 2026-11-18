'use strict';
const API='https://script.google.com/macros/s/AKfycbw7QpHI_ktHMi7zQWj5esL9L6m9yv_J3-PmK4V7aUD-YrsekpDu7cI7Ws5D0ab8SZJzLA/exec';
const adminMode=new URLSearchParams(location.search).has('admin'),$=id=>document.getElementById(id);
const labels={present:'Có mặt',excused:'Nghỉ có phép',unexcused:'Nghỉ không phép',late:'Đến muộn'};
let adminKey='',token='',assignment=null,records=[],students=[],busy=false,dirty=false,pending=null;
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const creds=()=>adminMode?{adminKey}:{token};
function message(s){$('message').textContent=s;}
async function request(mode,params={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{const res=await fetch(API,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({mode,...params}),signal:controller.signal});
 const r=await res.json();if(!r.ok){if(r.authExpired){token='';$('app').hidden=true;$('login').hidden=false;}throw new Error(r.message||'Máy chủ chưa xác nhận.');}return r;
 }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw new Error('Chưa nhận được xác nhận từ máy chủ. Nội dung vẫn ở ô nhập; bấm Lưu lại để kiểm tra, không tạo bản trùng.');throw e;}finally{clearTimeout(timer);}
}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=true);try{message('Đang xử lý…');await fn();}catch(e){message(e.message);}finally{busy=false;document.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=false);}}
function render(){
 $('monthlyPanel').hidden=!assignment;renderMonth();$('entry').hidden=!assignment;$('historyPanel').hidden=!assignment;
 if(!assignment){$('assignment').textContent='Chưa có phân công. Thầy chọn cán bộ lớp phụ trách cả lớp bên dưới.';return;}
 $('assignment').textContent=`${assignment.officer.name} → ${assignment.scope==='class'?'Cả lớp 12TA3':assignment.target?.name||'Phân công cũ'} · ${assignment.active?'Đang có quyền':'Đã thu hồi quyền'}`;
 $('targetTitle').textContent='Chuyên cần lớp 12TA3';
 const previous=$('student').value;$('student').innerHTML=students.map(s=>`<option value="${esc(s.code)}">${esc(s.name)}</option>`).join('');if(students.some(s=>s.code===previous))$('student').value=previous;
 $('scope').textContent=adminMode?'GVCN có thể ghi và sửa chuyên cần cả lớp. ':`Phụ trách: ${assignment.officer.name}. Chỉ ghi từ ${assignment.start.split('-').reverse().join('/')}.`;
 if(assignment.scope!=='class')$('scope').textContent+=' Phân công cũ chỉ có một học sinh. GVCN cấp lại với phạm vi cả lớp để mở rộng quyền.';
 $('date').min=adminMode?'':assignment.start;$('date').max=today();
 $('history').innerHTML=records.length?records.map(r=>`<article><strong>${esc(students.find(s=>s.code===r.code)?.name||r.code)} · ${esc(r.date.split('-').reverse().join('/'))} · ${esc(labels[r.status]||r.status)}</strong><p>${esc((r.status==='late'?'Giờ đến: '+r.arrival+'\n':'')+(r.note||''))}</p><small>${esc(r.actor)} · ${esc(new Date(r.updatedAt).toLocaleString('vi-VN'))}</small><p><button type="button" class="secondary" data-date="${esc(r.date)}" data-code="${esc(r.code)}">Sửa ngày này</button></p></article>`).join(''):'<p>Chưa ghi nhận ngày nào.</p>';
}
function loadDay(){const r=records.find(r=>r.date===$('date').value&&r.code===$('student').value);$('status').value=r?.status||'';$('arrival').value=r?.arrival||'';$('note').value=r?.note||'';dirty=false;pending=null;late();renderDay();}
function late(){$('arrivalLabel').hidden=$('status').value!=='late';$('arrival').required=$('status').value==='late';}
async function load(){const r=await request(adminMode?'ac-admin-list':'ac-list',creds());assignment=r.assignment;records=r.records;students=r.students||students;render();}
function apply(r){assignment=r.assignment;records=r.records;students=r.students||students;render();dirty=false;pending=null;loadDay();}
if(adminMode){$('loginTitle').textContent='GVCN quản lý chuyên cần';$('keyLabel').firstChild.textContent='Mã quản trị';$('switchRole').textContent='Dành cho cán bộ lớp';$('switchRole').href='chuyen-can.html';}
$('date').value=today();
$('loginForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 if(adminMode){const key=$('key').value,r=await request('ac-admin-info',{adminKey:key});adminKey=key;assignment=r.assignment;const opts='<option value="">Chọn học sinh</option>'+r.students.map(s=>`<option value="${esc(s.code)}">${esc(s.name)}</option>`).join('');$('officer').innerHTML=opts;if(assignment)$('officer').value=assignment.officer.code;}
 else{const r=await request('ac-login',{pin:$('key').value});token=r.token;assignment=r.assignment;}
 $('key').value='';$('login').hidden=true;$('app').hidden=false;$('admin').hidden=!adminMode;await load();loadDay();message('Đã kết nối chuyên cần.');
 });};
$('grantForm').onsubmit=e=>{e.preventDefault();if(!confirm('Cấp quyền xem và ghi chuyên cần cả lớp cho cán bộ lớp đã chọn? Quyền và phiên cũ sẽ kết thúc.'))return;action(async()=>{const r=await request('ac-admin-grant',{adminKey,officer:$('officer').value,scope:'class',pin:$('pin').value,consent:$('consent').checked});assignment=r.assignment;$('pin').value='';$('consent').checked=false;await load();loadDay();message('Đã cấp quyền. Gửi link cán bộ lớp và mã riêng cho người được giao.');});};
$('revoke').onclick=()=>{if(!confirm('Thu hồi quyền ghi chuyên cần ngay?'))return;action(async()=>{const r=await request('ac-admin-revoke',{adminKey});assignment=r.assignment;render();message('Đã thu hồi quyền. Phiên cán bộ lớp cũ không thể xem hoặc lưu tiếp.');});};
$('recordForm').addEventListener('input',e=>{if(['date','student'].includes(e.target.id))return;dirty=true;pending=null;});
$('status').onchange=late;
let selectedDate=$('date').value;
$('date').onchange=()=>{if(dirty&&!confirm('Đổi ngày và bỏ thay đổi chưa lưu?')){$('date').value=selectedDate;return;}selectedDate=$('date').value;loadDay();};
$('recordForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 if(!assignment)throw new Error('Chưa có phân công.');
 if(!pending)pending={...creds(),code:$('student').value,date:$('date').value,status:$('status').value,arrival:$('status').value==='late'?$('arrival').value:'',note:$('note').value,baseRevision:records.find(r=>r.date===$('date').value&&r.code===$('student').value)?.revision||'',operation:crypto.randomUUID()};
 const r=await request(adminMode?'ac-admin-save':'ac-save',pending);apply(r);message('Đã lưu chuyên cần lên Google Sheets.');
 });};
$('history').onclick=e=>{const b=e.target.closest('[data-date]');if(!b||dirty&&!confirm('Bỏ thay đổi chưa lưu để sửa ngày này?'))return;$('student').value=b.dataset.code;selectedStudent=b.dataset.code;$('date').value=b.dataset.date;selectedDate=b.dataset.date;loadDay();$('entry').scrollIntoView({behavior:'smooth'});};
$('refresh').onclick=()=>{if(dirty&&!confirm('Tải lại và bỏ thay đổi chưa lưu?'))return;action(async()=>{await load();loadDay();message('Đã tải lịch sử mới nhất.');});};
$('logout').onclick=()=>{if(dirty&&!confirm('Đăng xuất và bỏ thay đổi chưa lưu?'))return;action(async()=>{if(token)await request('ac-logout',{token});adminKey='';token='';assignment=null;records=[];pending=null;dirty=false;$('app').hidden=true;$('login').hidden=false;$('history').textContent='';$('recordForm').reset();$('date').value=today();message('Đã đăng xuất.');});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

let selectedStudent='';
$('student').onfocus=()=>{selectedStudent=$('student').value;};
$('student').onchange=()=>{if(dirty&&!confirm('Chuyển học sinh và bỏ thay đổi chưa lưu?')){$('student').value=selectedStudent;return;}selectedStudent=$('student').value;loadDay();};
function renderDay(){
 const date=$('date').value,day=records.filter(r=>r.date===date),done=students.filter(s=>day.some(r=>r.code===s.code)).length;
 $('daySummary').textContent=`Ngày ${date.split('-').reverse().join('/')}: đã ghi ${done}/${students.length} học sinh. Chưa ghi không đồng nghĩa có mặt.`;
 $('classList').innerHTML=students.map(s=>{const r=day.find(r=>r.code===s.code);return `<button type="button" class="secondary student-card" data-student="${esc(s.code)}" aria-pressed="${s.code===$('student').value}"><strong>${esc(s.name)}</strong><span>${esc(r?labels[r.status]+(r.status==='late'?' · '+r.arrival:''):'Chưa ghi')}</span></button>`;}).join('');
}
$('classList').onclick=e=>{const b=e.target.closest('[data-student]');if(!b||busy||dirty&&!confirm('Chuyển học sinh và bỏ thay đổi chưa lưu?'))return;$('student').value=b.dataset.student;selectedStudent=b.dataset.student;loadDay();$('recordForm').scrollIntoView({behavior:'smooth'});};

$('summaryMonth').value=today().slice(0,7);
$('summaryMonth').max=today().slice(0,7);
$('summaryMonth').onchange=renderMonth;
function renderMonth(){
 const month=$('summaryMonth').value||today().slice(0,7),summary=AttendanceMonthly.summarize(students,records,month);
 $('monthScope').textContent=adminMode?'Thống kê danh sách lớp hiện tại từ sổ chuyên cần được phân công.':'Chỉ tổng hợp dữ liệu được phép xem, từ ngày '+(assignment?.start||'').split('-').reverse().join('/')+'.';
 $('monthCaption').textContent='Tháng '+month.split('-').reverse().join('/')+' · '+summary.rows.length+' học sinh';
 $('monthTotals').textContent=summary.days.length?`${summary.days.length} ngày có ghi nhận · ${summary.total.excused} lượt nghỉ phép · ${summary.total.unexcused} lượt nghỉ không phép · ${summary.total.late} lượt đến muộn`:'Tháng này chưa có dữ liệu chuyên cần trong phạm vi được xem.';
 $('monthRows').innerHTML=summary.rows.map(s=>`<tr><th scope="row">${esc(s.name)}</th><td>${s.present}</td><td>${s.excused}</td><td>${s.unexcused}</td><td>${s.late}</td><td>${s.missing}</td><td><button class="secondary" type="button" data-month-student="${esc(s.code)}">Xem</button></td></tr>`).join('');
 $('monthDetails').textContent='';
}
$('monthRows').onclick=e=>{
 const b=e.target.closest('[data-month-student]');if(!b||busy)return;
 const summary=AttendanceMonthly.summarize(students,records,$('summaryMonth').value||today().slice(0,7)),s=summary.rows.find(s=>s.code===b.dataset.monthStudent);if(!s)return;
 $('monthDetails').innerHTML=`<h3>${esc(s.name)} · Chi tiết tháng</h3>`+(s.records.length?s.records.map(r=>`<article><strong>${esc(r.date.split('-').reverse().join('/'))} · ${esc(labels[r.status])}</strong><p>${esc((r.status==='late'?'Giờ đến: '+r.arrival+'\n':'')+(r.note||''))}</p></article>`).join(''):'<p>Chưa có bản ghi trong tháng này.</p>');
 $('monthDetails').scrollIntoView({behavior:'smooth',block:'nearest'});
};
