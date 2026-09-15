# Đồng bộ điểm và khôi phục bài kiểm tra

- Điểm học tập → chọn bài → Lưu điểm lên Sheet. Nếu bài chỉ còn trong trình duyệt, xác nhận tạo lại với đúng mã bài và điểm đang hiển thị.
- Các bài chưa có trong Sheet được giữ trên máy và ghi nhãn riêng; lưu một bài không làm mất các bài còn lại.
- Xóa bài kiểm tra đưa bài vào mục Bài đã xóa. Với bài trên Sheet, hàng 3 đổi từ mã bài sang ARCHIVED_<mã>; điểm và ghi chú vẫn giữ trong cột đó. Khôi phục trả lại mã ban đầu.
- Khi không có bản nháp, web đọc lại Sheet khi vào mục Điểm học tập và mỗi phút. Bấm Tải điểm mới nhất để đọc ngay. Web không tải đè bản đang nhập.
- Tải bản sao lưu điểm xuất dữ liệu cục bộ trước khi xử lý sự cố. Bản nháp lưu trên cùng trình duyệt, chưa chia sẻ cho PHHS cho tới khi lưu Sheet thành công.
- Google Apps Script phiên bản 4 hỗ trợ score-archive, score-restore, test.recoverMissing và revision; đã triển khai vào URL hiện có, không đổi quyền truy cập.
- Kiểm tra hồi quy: node test-score-sync.cjs. score-sync.js là nguồn của khối đồng bộ được nhúng trong Code Web.html.
