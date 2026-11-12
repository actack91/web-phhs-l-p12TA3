# Chuyên cần được phân công — 12TA3

GVCN: Điểm danh → Chuyên cần được phân công, hoặc `chuyen-can.html?admin=1`.
Đăng nhập mã quản trị, chọn cán bộ lớp và đúng học sinh cần theo dõi; tự đặt mã riêng 12–64 chữ/số; xác nhận đã có sự đồng ý rồi cấp quyền.
Gửi `chuyen-can.html` và mã riêng cho cán bộ lớp qua kênh riêng. Không gửi mã quản trị.

Mỗi phân công có đúng một học sinh được theo dõi và một cán bộ lớp. Cấp lại thay thế phân công cũ. Thu hồi quyền có hiệu lực trên máy chủ ngay ở yêu cầu tiếp theo. Phiên cán bộ lớp hết hạn sau 12 giờ và không lưu mật khẩu/token vào localStorage. Chỉ GVCN được xem danh sách chọn người; cán bộ lớp chỉ nhận tên người được giao và các bản ghi từ ngày phân công.

Có mặt / Nghỉ có phép / Nghỉ không phép / Đến muộn. Đến muộn bắt buộc giờ đến hợp lệ; giờ đến hiện trong phần ghi chú lịch sử. GVCN có thể sửa ngày cũ. Không tạo ngày tương lai. Chưa ghi không đồng nghĩa có mặt.

Dữ liệu ở sheet `CHUYEN_CAN_PHAN_CONG` trong Google Sheet 12TA3; mỗi lần sửa thêm một dòng có người ghi và phiên bản. Giao diện lấy bản mới nhất cho từng ngày. Đây là sổ phân công riêng, chưa tự nhập vào bảng `DIEM_DANH` chung để tránh việc đồng bộ điểm danh cũ ghi đè giờ đến/ghi chú. Không công khai dữ liệu chuyên cần trên cổng lớp.

## Triển khai
- Thêm `AttendanceDelegate.gs` vào dự án Apps Script 12TA3. Kiểm tra dự án chưa có `doPost` trước khi thêm (nếu đã có, tích hợp nhánh ac- trong doPost hiện có).
- Dùng lại `assertAdminKey`, `getClassList`, `output` của dự án. Triển khai phiên bản mới cùng deployment ID.
- Upload `chuyen-can.html`, `chuyen-can.css`, `chuyen-can.js`, `Code Web.html` lên repository 12TA3.
- Không upload `backend-before.gs`, baseline hoặc dữ liệu kiểm thử xem trước.

## Kiểm thử
`node test-attendance.cjs`: phân quyền đúng học sinh, hết phiên/thu hồi, ngày/giờ, giữ số 0 mã, chống công thức, chống trùng khi gửi lại, xung đột phiên bản, GVCN sửa.
Không tạo điểm danh giả, không cấp quyền cho học sinh thật trong quá trình triển khai.
