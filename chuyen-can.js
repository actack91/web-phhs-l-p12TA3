'use strict';
const API='https://script.google.com/macros/s/AKfycbw7QpHI_ktHMi7zQWj5esL9L6m9yv_J3-PmK4V7aUD-YrsekpDu7cI7Ws5D0ab8SZJzLA/exec';
const adminMode=new URLSearchParams(location.search).has('admin'),$=id=>document.getElementById(id);
const labels={present:'Có mặt',excused:'Nghỉ có phép',unexcused:'Nghỉ không phép',late:'Đến muộn'};
let adminKey='',token='',assignment=null,records=[],busy=false,dirty=false,pending=null;
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
 $('entry').hidden=!assignment;$('historyPanel').hidden=!assignment;
 if(!assignment){$('assignment').textContent='Chưa có phân công. Thầy chọn cán bộ lớp và học sinh được theo dõi bên dưới.';return;}
 $('assignment').textContent=`${assignment.officer.name} → ${assignment.target.name} · ${assignment.active?'Đang có quyền':'Đã thu hồi quyền'}`;
 $('targetTitle').textContent='Chuyên cần: '+assignment.target.name;
 $('scope').textContent=adminMode?'GVCN có thể ghi và sửa các ngày của học sinh này.':`Phụ trách: ${assignment.officer.name}. Chỉ ghi từ ${assignment.start.split('-').reverse().join('/')}.`;
 $('date').min=adminMode?'':assignment.start;$('date').max=today();
 $('history').innerHTML=records.length?records.map(r=>`<article><strong>${esc(r.date.split('-').reverse().join('/'))} · ${esc(labels[r.status]||r.status)}</strong><p>${esc((r.status==='late'?'Giờ đến: '+r.arrival+'\n':'')+(r.note||''))}</p><small>${esc(r.actor)} · ${esc(new Date(r.updatedAt).toLocaleString('vi-VN'))}</small><p><button type="button" class="secondary" data-date="${esc(r.date)}">Sửa ngày này</button></p></article>`).join(''):'<p>Chưa ghi nhận ngày nào.</p>';
}
function loadDay(){const r=records.find(r=>r.date===$('date').value);$('status').value=r?.status||'';$('arrival').value=r?.arrival||'';$('note').value=r?.note||'';dirty=false;pending=null;late();}
function late(){$('arrivalLabel').hidden=$('status').value!=='late';$('arrival').required=$('status').value==='late';}
async function load(){const r=await request(adminMode?'ac-admin-list':'ac-list',creds());assignment=r.assignment;records=r.records;render();}
function apply(r){assignment=r.assignment;records=r.records;render();dirty=false;pending=null;loadDay();}
if(adminMode){$('loginTitle').textContent='GVCN quản lý chuyên cần';$('keyLabel').firstChild.textContent='Mã quản trị';$('switchRole').textContent='Dành cho cán bộ lớp';$('switchRole').href='chuyen-can.html';}
$('date').value=today();
$('loginForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 if(adminMode){const key=$('key').value,r=await request('ac-admin-info',{adminKey:key});adminKey=key;assignment=r.assignment;const opts='<option value="">Chọn học sinh</option>'+r.students.map(s=>`<option value="${esc(s.code)}">${esc(s.name)}</option>`).join('');$('officer').innerHTML=opts;$('target').innerHTML=opts;if(assignment){$('officer').value=assignment.officer.code;$('target').value=assignment.target.code;}}
 else{const r=await request('ac-login',{pin:$('key').value});token=r.token;assignment=r.assignment;}
 $('key').value='';$('login').hidden=true;$('app').hidden=false;$('admin').hidden=!adminMode;await load();loadDay();message('Đã kết nối chuyên cần.');
 });};
$('grantForm').onsubmit=e=>{e.preventDefault();if(!confirm('Cấp phân công này và kết thúc quyền, phiên đăng nhập cũ?'))return;action(async()=>{const r=await request('ac-admin-grant',{adminKey,officer:$('officer').value,target:$('target').value,pin:$('pin').value,consent:$('consent').checked});assignment=r.assignment;$('pin').value='';$('consent').checked=false;await load();loadDay();message('Đã cấp quyền. Gửi link cán bộ lớp và mã riêng cho người được giao.');});};
$('revoke').onclick=()=>{if(!confirm('Thu hồi quyền ghi chuyên cần ngay?'))return;action(async()=>{const r=await request('ac-admin-revoke',{adminKey});assignment=r.assignment;render();message('Đã thu hồi quyền. Phiên cán bộ lớp cũ không thể xem hoặc lưu tiếp.');});};
$('recordForm').addEventListener('input',e=>{if(e.target.id==='date')return;dirty=true;pending=null;});
$('status').onchange=late;
let selectedDate=$('date').value;
$('date').onchange=()=>{if(dirty&&!confirm('Đổi ngày và bỏ thay đổi chưa lưu?')){$('date').value=selectedDate;return;}selectedDate=$('date').value;loadDay();};
$('recordForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 if(!assignment)throw new Error('Chưa có phân công.');
 if(!pending)pending={...creds(),code:assignment.target.code,date:$('date').value,status:$('status').value,arrival:$('status').value==='late'?$('arrival').value:'',note:$('note').value,baseRevision:records.find(r=>r.date===$('date').value)?.revision||'',operation:crypto.randomUUID()};
 const r=await request(adminMode?'ac-admin-save':'ac-save',pending);apply(r);message('Đã lưu chuyên cần lên Google Sheets.');
 });};
$('history').onclick=e=>{const b=e.target.closest('[data-date]');if(!b||dirty&&!confirm('Bỏ thay đổi chưa lưu để sửa ngày này?'))return;$('date').value=b.dataset.date;selectedDate=b.dataset.date;loadDay();$('entry').scrollIntoView({behavior:'smooth'});};
$('refresh').onclick=()=>{if(dirty&&!confirm('Tải lại và bỏ thay đổi chưa lưu?'))return;action(async()=>{await load();loadDay();message('Đã tải lịch sử mới nhất.');});};
$('logout').onclick=()=>{if(dirty&&!confirm('Đăng xuất và bỏ thay đổi chưa lưu?'))return;action(async()=>{if(token)await request('ac-logout',{token});adminKey='';token='';assignment=null;records=[];pending=null;dirty=false;$('app').hidden=true;$('login').hidden=false;$('history').textContent='';$('recordForm').reset();$('date').value=today();message('Đã đăng xuất.');});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
