// Add as a separate file in the existing 12TA3 Apps Script project.
// POST-only API; no student data, PINs or tokens in public source/URLs.
function doPost(e) {
  try {
    var p=JSON.parse((e.postData||{}).contents||'{}');
    if(String(p.mode||'').indexOf('ac-')!==0) throw new Error('Thao tác không được hỗ trợ.');
    return output(acHandle(p),'');
  } catch(err) { return output({ok:false,message:String(err.message||err)},''); }
}
function acHash(s){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)));}
function acToday(){return Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');}
function acRoster(){return getClassList().map(function(s){return {code:String(s.studentCode),name:s.name};}).filter(function(s){return s.code;});}
function acConfig(){return JSON.parse(PropertiesService.getScriptProperties().getProperty('ATTENDANCE_DELEGATE_V1')||'null');}
function acPublicConfig(c){return c?{officer:c.officer,target:c.target,start:c.start,active:!!c.active}:null;}
function acTable(){
 var headers=['Ngay','MaHS','TrangThai','GioDen','GhiChu','NguoiGhi','CapNhatLuc','PhienBan','MaYeuCau','MaPhanCong'],ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getSheetByName('CHUYEN_CAN_PHAN_CONG');
 if(!s){s=ss.insertSheet('CHUYEN_CAN_PHAN_CONG');s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1);s.getRange('A:J').setNumberFormat('@');}
 var rows=s.getDataRange().getDisplayValues();
 if(JSON.stringify(rows[0].slice(0,10))!==JSON.stringify(headers))throw new Error('Cấu trúc CHUYEN_CAN_PHAN_CONG không đúng. Liên hệ GVCN.');
 return {sheet:s,rows:rows.slice(1).filter(function(r){return r[0];})};
}
function acRecords(rows){var latest={};rows.forEach(function(r){latest[r[0]+'|'+r[1]]={date:r[0],code:r[1],status:r[2],arrival:r[3],note:r[4],actor:r[5],updatedAt:r[6],revision:r[7],operation:r[8],assignment:r[9]};});return Object.keys(latest).map(function(k){return latest[k];}).sort(function(a,b){return b.date.localeCompare(a.date);});}
function acValidate(p){
 var date=String(p.date||''),status=String(p.status||''),arrival=String(p.arrival||''),note=String(p.note||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date>acToday())throw new Error('Chọn ngày hợp lệ, không sau hôm nay.');
 if(['present','excused','unexcused','late'].indexOf(status)<0)throw new Error('Chọn trạng thái chuyên cần.');
 if(status==='late'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival))throw new Error('Đến muộn phải ghi giờ đến hợp lệ, ví dụ 07:35.');
 if(note.length>500)throw new Error('Ghi chú tối đa 500 ký tự.');
 return {date:date,status:status,arrival:status==='late'?arrival:'',note:note};
}
function acHandle(p){
 var mode=String(p.mode||''),admin=mode.indexOf('ac-admin-')===0;
 if(admin)assertAdminKey(p.adminKey);
 var allowed=['ac-admin-info','ac-admin-grant','ac-admin-revoke','ac-admin-list','ac-admin-save','ac-login','ac-list','ac-save','ac-logout'];
 if(allowed.indexOf(mode)<0)throw new Error('Thao tác không được hỗ trợ.');
 var lock=LockService.getScriptLock();lock.waitLock(15000);
 try {
  var props=PropertiesService.getScriptProperties(),c=acConfig();
  if(mode==='ac-admin-info')return {ok:true,assignment:acPublicConfig(c),students:acRoster()};
  if(mode==='ac-admin-grant'){
   var roster=acRoster(),officer=roster.filter(function(s){return s.code===String(p.officer);})[0],target=roster.filter(function(s){return s.code===String(p.target);})[0];
   if(!officer||!target||officer.code===target.code)throw new Error('Chọn hai học sinh khác nhau trong lớp.');
   if(!/^[A-Za-z0-9]{8,64}$/.test(String(p.pin||''))||String(p.pin)===String(p.adminKey))throw new Error('Mã riêng cần 8–64 chữ hoặc số, khác mã quản trị.');
   if(p.consent!==true)throw new Error('Cần xác nhận sự đồng ý cho phân công.');
   var id=Utilities.getUuid();c={id:id,officer:officer,target:target,start:acToday(),active:true,salt:id,pinHash:acHash(id+':'+p.pin)};
   props.setProperty('ATTENDANCE_DELEGATE_V1',JSON.stringify(c));return {ok:true,assignment:acPublicConfig(c)};
  }
  if(mode==='ac-admin-revoke'){
   if(c){c.active=false;delete c.tokenHash;delete c.expiresAt;props.setProperty('ATTENDANCE_DELEGATE_V1',JSON.stringify(c));}
   return {ok:true,assignment:acPublicConfig(c)};
  }
  if(mode==='ac-login'){
   var cache=CacheService.getScriptCache(),key='ac_login_fail_v1',fails=Number(cache.get(key)||0);
   if(fails>=10)throw new Error('Nhập sai nhiều lần. Thử lại sau 10 phút hoặc liên hệ GVCN.');
   if(!c||!c.active||acHash(c.salt+':'+String(p.pin||''))!==c.pinHash){cache.put(key,String(fails+1),600);throw new Error('Mã không đúng hoặc quyền đã thu hồi.');}
   cache.remove(key);var token=Utilities.getUuid()+Utilities.getUuid();c.tokenHash=acHash(token);c.expiresAt=Date.now()+12*60*60*1000;props.setProperty('ATTENDANCE_DELEGATE_V1',JSON.stringify(c));
   return {ok:true,token:token,assignment:acPublicConfig(c)};
  }
  if(!admin&&(!c||!c.active||!p.token||acHash(p.token)!==c.tokenHash||Date.now()>=c.expiresAt))return {ok:false,authExpired:true,message:'Phiên đã hết hạn hoặc quyền đã thu hồi. Đăng nhập lại.'};
  if(mode==='ac-logout'){delete c.tokenHash;delete c.expiresAt;props.setProperty('ATTENDANCE_DELEGATE_V1',JSON.stringify(c));return {ok:true};}
  if(!c)return {ok:true,assignment:null,records:[]};
  var table=acTable(),records=acRecords(table.rows),visible=records.filter(function(r){return r.code===c.target.code&&(admin||r.date>=c.start);});
  if(mode==='ac-list'||mode==='ac-admin-list')return {ok:true,assignment:acPublicConfig(c),records:visible};
  var v=acValidate(p);
  if(String(p.code)!==c.target.code)throw new Error('Không có quyền ghi chuyên cần của học sinh này.');
  if(!admin&&v.date<c.start)throw new Error('Chỉ được ghi từ ngày được phân công.');
  if(!/^[a-f0-9-]{20,80}$/i.test(String(p.operation||'')))throw new Error('Mã yêu cầu không hợp lệ.');
  var priorOp=table.rows.filter(function(r){return r[8]===p.operation;})[0];
  if(priorOp){
   if(priorOp[0]!==v.date||priorOp[1]!==String(p.code)||priorOp[2]!==v.status||priorOp[3]!==v.arrival||priorOp[4]!==v.note)throw new Error('Mã yêu cầu đã dùng. Tải lại trước khi sửa.');
   return {ok:true,records:visible,assignment:acPublicConfig(c)};
  }
  var old=records.filter(function(r){return r.code===c.target.code&&r.date===v.date;})[0];
  if(String(p.baseRevision||'')!==(old?old.revision:''))throw new Error('Ngày này đã được cập nhật. Tải lại lịch sử rồi sửa để tránh ghi đè.');
  var record={date:v.date,code:c.target.code,status:v.status,arrival:v.arrival,note:v.note,actor:admin?'GVCN':c.officer.name,updatedAt:new Date().toISOString(),revision:Utilities.getUuid(),operation:p.operation,assignment:c.id};
  // Apostrophe preserves IDs and prevents user-entered text becoming a Sheet formula.
  table.sheet.appendRow([record.date,record.code,record.status,record.arrival,record.note,record.actor,record.updatedAt,record.revision,record.operation,record.assignment].map(function(x){return "'"+String(x);}));
  return {ok:true,assignment:acPublicConfig(c),records:[record].concat(visible.filter(function(r){return r.date!==v.date;})).sort(function(a,b){return b.date.localeCompare(a.date);})};
 } finally {lock.releaseLock();}
}
