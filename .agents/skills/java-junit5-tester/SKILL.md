---
name: java-junit5-tester
description: Tự động phân tích mã nguồn Java để tìm lỗi tiềm ẩn (NullPointerException, lỗi logic, tràn mảng, rò rỉ tài nguyên file) và tự động tạo bộ Unit Test chuẩn JUnit 5. Kích hoạt khi người dùng yêu cầu kiểm tra lỗi Java, viết JUnit 5 test, hoặc gọi /java-junit5-tester.
---

# Quy trình Kiểm tra lỗi Java & Viết JUnit 5 Test

Khi được kích hoạt, hãy thực hiện tuần tự 3 giai đoạn sau trên file hoặc class Java được chỉ định:

## Giai đoạn 1: Rà soát lỗi mã nguồn (Static Code Audit)
1. Đọc toàn bộ class Java mục tiêu và các class liên quan (Model, Service, DAO/File Handler).
2. Phát hiện và liệt kê ngắn gọn các lỗi tiềm ẩn:
   - Nguy cơ `NullPointerException` khi chưa kiểm tra đầu vào `null` hoặc chuỗi rỗng.
   - Lỗi điều kiện biên trong vòng lặp, thuật toán sắp xếp/tìm kiếm (`IndexOutOfBoundsException`, sai lệch chỉ số `<` và `<=`).
   - Lỗi không đóng luồng đọc/ghi file (`BufferedReader`, `BufferedWriter`, `Scanner`) dễ gây rò rỉ bộ nhớ (khuyến nghị dùng `try-with-resources`).
   - Lỗi logic nghiệp vụ (so sánh chuỗi bằng `==` thay vì `.equals()`, chia cho 0, ép kiểu sai).
3. Đề xuất bản vá lỗi trực tiếp trên code gốc nếu phát hiện lỗi nghiêm trọng.

## Giai đoạn 2: Khởi tạo file JUnit 5 Test
1. Tạo file test tương ứng với tên `<TenClassGoc>Test.java` trong thư mục test của dự án.
2. Sử dụng thư viện **JUnit 5 (`org.junit.jupiter.api.*`)** với các tiêu chuẩn bắt buộc:
   - Khởi tạo dữ liệu mẫu sạch sẽ trong hàm `@BeforeEach` (`setUp()`).
   - Đặt `@DisplayName("Mô tả rõ kịch bản test bằng tiếng Việt")` cho từng phương thức `@Test`.
   - Tuân thủ cấu trúc 3 phần rõ ràng trong mỗi hàm test: `// Arrange` (Chuẩn bị), `// Act` (Thực thi), `// Assert` (Kiểm chứng).
3. Bao phủ đủ 3 nhóm kịch bản cho mỗi phương thức quan trọng:
   - **Happy Path:** Dữ liệu hợp lệ, kiểm tra kết quả trả về bằng `assertEquals`, `assertTrue`, `assertNotNull`.
   - **Edge Cases (Trường hợp biên):** Danh sách rỗng, chuỗi khoảng trắng, giá trị bằng 0 hoặc giá trị âm, phần tử đầu/cuối mảng.
   - **Exception Testing (Bắt ngoại lệ):** Dùng `assertThrows(ExceptionClass.class, () -> ...)` để đảm bảo code ném đúng ngoại lệ khi truyền dữ liệu sai.

## Giai đoạn 3: Chạy thử và Xác nhận
1. Kiểm tra cấu hình dự án (Maven `pom.xml`, Gradle, hoặc JUnit Platform Console Standalone) và chạy lệnh test trên terminal.
2. Nếu có test case nào thất bại (Failed), phân tích nguyên nhân do code gốc sai hay do dữ liệu test chưa chuẩn để tự động sửa lại cho đến khi Pass 100%.