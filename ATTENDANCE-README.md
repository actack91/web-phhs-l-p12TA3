# Chuyên cần cả lớp — 12TA3

GVCN mở `chuyen-can.html?admin=1`, đăng nhập, chọn cán bộ lớp, đặt mã riêng tối thiểu 8 chữ/số và xác nhận cấp phạm vi **cả lớp**. Gửi `chuyen-can.html` cùng mã riêng cho cán bộ lớp.

Phân công một học sinh cũ vẫn giữ nguyên phạm vi cho đến khi GVCN cấp lại. Cấp lại kết thúc phiên cũ và bắt đầu quyền mới từ ngày cấp. Lịch sử đã ghi vẫn giữ nguyên trên Sheet; GVCN xem được mọi ngày. Không tự cấp quyền trong quá trình cập nhật.

Sau đăng nhập, chọn ngày, chọn học sinh từ danh sách hoặc ô chọn, ghi Có mặt / Nghỉ có phép / Nghỉ không phép / Đến muộn rồi lưu. Đến muộn bắt buộc giờ đến. Bảng tóm tắt hiện đã ghi bao nhiêu học sinh; chưa ghi không có nghĩa có mặt. Lịch sử ghi rõ tên học sinh, ngày, người ghi và giờ đến. Các học sinh trong cùng ngày có bản ghi độc lập.

Chỉ trả mã học sinh, tên và chuyên cần sau xác thực; không trả mã PHHS, số điện thoại hay điểm số. Thu hồi có hiệu lực trên yêu cầu tiếp theo. Mã/token không lưu localStorage. Chống ghi đè khi phiên bản cũ, gửi lại không tạo trùng, giữ số 0 đầu mã HS.

Dùng tiếp sheet `CHUYEN_CAN_PHAN_CONG` gồm các lần ghi/sửa. Giao diện lấy bản mới nhất theo Ngay + MaHS. Chưa tự gộp vào `DIEM_DANH` chung.

Triển khai: thay AttendanceDelegate.gs trong Apps Script, triển khai phiên bản mới cùng deployment ID; upload chuyen-can.html/css/js cùng module, tài liệu và test. Không upload backend-before.gs, preview.html hoặc fixture.js.

Kiểm thử: `node test-attendance.cjs`. Kiểm thử thêm giao diện với fixture cục bộ, ghi hai học sinh trong cùng ngày. Không ghi chuyên cần giả lên dữ liệu thật.
