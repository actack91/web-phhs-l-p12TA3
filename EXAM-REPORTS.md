# Phiếu điểm kỳ thi — 12TA3

Vào **Điểm học tập → Phiếu điểm kỳ thi**. Tạo kỳ theo năm học, chọn hai môn tự chọn cho từng học sinh, nhập sáu môn rồi **Lưu điểm lên Sheet**. Kiểm tra bằng nút **Xem**, sau đó **Công bố cho PHHS**. Chọn lại kỳ để sửa; mỗi lần lưu sửa sẽ chuyển kỳ về Đang nhập, cần công bố lại.

PHHS xem đủ sáu môn, trung bình lớp và thứ hạng môn. Từ Toán, Văn và hai môn tự chọn, phiếu tạo các tổ hợp ba môn có trong danh mục và tính tổng /30. Không có tổng bốn môn. Khối trong trường `KhoiThi` của `HOC_SINH` được ưu tiên hiển thị. Nếu khối này không tạo được từ bốn môn đã chọn, phiếu báo rõ, không tạo tổng giả.

Thứ hạng tổ hợp tính trong nhóm học sinh có bốn môn đã chọn tạo được tổ hợp đó và có đủ ba điểm; không xếp cùng học sinh chọn tổ hợp khác. Bằng điểm đồng hạng (1, 2, 2, 4). Điểm trống không phải 0. Điểm và thứ hạng dùng cho theo dõi học tập, không phải kết quả xét tuyển đã nhân hệ số/quy đổi/ưu tiên.

## Google Sheets

- `KY_THI`: `MaKy, NamHoc, TenKy, Ngay, TrangThai, CapNhatLuc`.
- `DIEM_KY_THI`: `MaKy, MaHS, TOAN, VAN, ANH, LY, HOA, SINH, TuChon1, TuChon2, CapNhatLuc`.
- Hai mã tự chọn là hai giá trị khác nhau trong `ANH, LY, HOA, SINH`.
- Mỗi cặp `MaKy + MaHS` chỉ có một dòng. Không đổi mã hoặc tiêu đề cột. Có thể chỉnh điểm trên Sheet rồi bấm **Tải từ Google Sheets** trên web. Bản nhập chưa lưu vẫn được giữ để đối chiếu; nếu xung đột, bỏ bản nhập cũ rồi nhập lại trên dữ liệu mới.
- Muốn nhập dần trực tiếp trên Sheet, đặt `TrangThai` là `DRAFT`; chỉ đổi `PUBLISHED` khi hoàn tất. Sửa trực tiếp Sheet của kỳ đang công bố sẽ hiện ngay ở lần tra cứu tiếp theo.
- Chưa có điểm thật sẽ không công bố được. PHHS chỉ nhận phiếu của học sinh khớp mã tra cứu; không nhận bảng điểm các bạn.

## Mã nguồn

`exam-core.js` chứa phép tính dùng chung, `exam-reports.js` chứa giao diện. `ExamReports.gs` là module máy chủ, hiện được nối vào dự án Apps Script 12TA3. Khi cài vào bản khác: thêm route `exam-` trong `doGet` (qua `examHandle` có kiểm tra mã quản trị), và trường `examReports: erParentReports(student.studentCode)` vào kết quả `getStudentData` sau xác thực mã tra cứu. Không thêm endpoint PHHS nhận mã học sinh tùy ý.

Lưu điểm theo từng dòng ngắn, giữ bản nháp và thông báo số dòng đã lưu khi mạng lỗi. Kiểm tra revision ngăn ghi đè cập nhật mới trên Sheet; gửi lại cùng nội dung không tạo dòng trùng. `test-exams.cjs` dùng dữ liệu giả, không kết nối Sheet thật.

Danh mục trong phạm vi sáu môn đã đối chiếu bảng tổ hợp 2026 của [Đại học Quang Trung](https://tuyensinh.qtu.edu.vn/thong-tin-can-biet/thong-tin-tuyen-sinh-dai-hoc-chinh-quy-nam-2026-du-kien) và [Đại học Đồng Tháp](https://qao.dthu.edu.vn/nganh-tuyen-sinh). Mã B08 và D08 cùng ba môn Toán–Sinh–Anh. Việc một trường/ngành có nhận một tổ hợp hay không phải theo thông báo riêng của trường, không suy ra từ phiếu này.
