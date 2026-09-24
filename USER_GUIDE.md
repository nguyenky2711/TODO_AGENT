# 📖 CẨM NANG SỬ DỤNG PERSONAL PRODUCTIVITY AGENT

Chào mừng bạn đến với **Personal Productivity Agent** — Ứng dụng quản lý công việc và lịch biểu cá nhân hóa trên Windows, kết hợp hoàn hảo giữa **Todo List**, **Google Calendar** và **Trợ lý Trí tuệ Nhân tạo (AI Agent)**.

---

## 📑 MỤC LỤC NHANH
1. [Triết Lý Cốt Lõi & Tính An Toàn (Local-First)](#1-triết-lý-cốt-lõi--tính-an-toàn-local-first)
2. [Quản Lý Công Việc (Todo & Tasks)](#2-quản-lý-công-việc-todo--tasks)
3. [Lịch Biểu Đa Góc Nhìn (Day / Week / Month Calendar)](#3-lịch-biểu-đa-góc-nhìn-day--week--month-calendar)
4. [Quản Lý Dự Án & Mục Tiêu Dài Hạn (Projects & Goals)](#4-quản-lý-dự-án--mục-tiêu-dài-hạn-projects--goals)
5. [7 Tính Năng Trợ Lý AI & Các Câu Lệnh Mẫu](#5-7-tính-năng-trợ-lý-ai--các-câu-lệnh-mẫu)
6. [Bản Tin Sáng (Daily Briefing) & Tổng Kết Ngày (End-of-Day Review)](#6-bản-tin-sáng-daily-briefing--tổng-kết-ngày-end-of-day-review)
7. [Bảng Tra Cứu Phím Tắt Thần Tốc](#7-bảng-tra-cứu-phím-tắt-thần-tốc)
8. [Cài Đặt, Bảo Mật & Hoàn Tác (Undo)](#8-cài-đặt-bảo-mật--hoàn-tác-undo)

---

## 1. Triết Lý Cốt Lõi & Tính An Toàn (Local-First)

* 🛡️ **Dữ liệu hoàn toàn trên máy bạn**: Toàn bộ công việc, dự án, lịch biểu và thói quen cá nhân được lưu trữ trực tiếp trong cơ sở dữ liệu SQLite tại máy tính của bạn thông qua IndexedDB/File System. Không ai ngoài bạn có quyền truy cập dữ liệu này.
* ⚡ **Hoạt động Offline linh hoạt**: Bạn có thể tạo, chỉnh sửa, xếp lịch và kéo thả công việc ngay cả khi không có kết nối Internet.
* 🤖 **AI đồng hành thông minh**: Ứng dụng kết nối tới Gemini API để hỗ trợ lập kế hoạch, phân tích độ ưu tiên và trò chuyện tự nhiên với danh sách việc của bạn. Mọi hành động AI thực hiện đều có thể **Hoàn tác (Undo)** bằng 1 click.

---

## 2. Quản Lý Công Việc (Todo & Tasks)

### 2.1. Tạo công việc mới
* Bấm phím tắt <kbd>Ctrl + N</kbd> hoặc nút **+ Việc mới** trên thanh công cụ.
* Các thông tin bạn có thể thiết lập:
  * **Tiêu đề công việc**: Tên hành động cụ thể (vd: *Gửi báo cáo tài chính quý 3*).
  * **Dự án**: Chọn dự án tương ứng để nhóm công việc.
  * **Độ ưu tiên (Priority)**:
    * `HIGH` (Đỏ): Việc rất quan trọng, cần tập trung cao độ.
    * `MEDIUM` (Vàng): Việc tiêu chuẩn hàng ngày.
    * `LOW` (Xanh/Xám): Việc phụ, có thể làm khi rảnh.
  * **Độ khó (Difficulty)**:
    * `DỄ (Easy)`: Việc đơn giản, tốn ít năng lượng trí óc (trả lời email, thanh toán hóa đơn).
    * `VỪA (Medium)`: Công việc tiêu chuẩn cần sự tập trung.
    * `KHÓ (Hard)`: Công việc đòi hỏi tư duy sâu (Brainstorm, lập trình tính năng cốt lõi, viết tài liệu phức tạp).
  * **Thời lượng ước tính (Estimated Duration)**: Chọn `15 phút`, `30 phút`, `45 phút`, `1 giờ`, `2 giờ`,... giúp AI tính toán khả năng làm việc trong ngày.
  * **Hạn chót (Due Date)**: Ngày bắt buộc phải hoàn thành.
  * **Ngày & Giờ làm việc**: Khung giờ bắt đầu và kết thúc cụ thể nếu muốn gán vào Lịch biểu.

### 2.2. Danh sách Việc Tự Do (Unscheduled Tasks)
* Nằm ở cột bên trái màn hình. Đây là nơi chứa các công việc bạn cần làm nhưng **chưa ấn định ngày giờ cụ thể**.
* **Kéo & Thả (Drag & Drop)**: Chỉ cần giữ chuột vào một công việc tự do và kéo thả trực tiếp vào một ô giờ trên Lịch biểu tuần hoặc ngày. Ứng dụng sẽ tự động xếp lịch chính xác tại giờ bạn thả chuột!

### 2.3. Thao tác hàng loạt (Multi-Selection & Batch Actions)
* Trong danh sách Việc tự do, bấm nút **Chọn nhiều việc** (icon checklist):
  * Tích chọn nhiều công việc cùng lúc.
  * Kéo cả cụm việc vào thùng rác để xóa nhanh.
  * Kéo cả cụm vào lịch để tự động xếp nối tiếp nhau.

---

## 3. Lịch Biểu Đa Góc Nhìn (Day / Week / Month Calendar)

### 3.1. Các chế độ xem
* <kbd>Ctrl + 1</kbd> — **Chế độ Ngày (Day View)**: Xem chi tiết từng khung giờ 24h, cực kỳ phù hợp cho những ngày có lịch trình dày đặc.
* <kbd>Ctrl + 2</kbd> — **Chế độ Tuần (Week View)** *(Mặc định & Khuyên dùng)*: Trải nghiệm chuẩn Google Calendar với lưới 7 ngày từ Thứ Hai đến Chủ Nhật.
* <kbd>Ctrl + 3</kbd> — **Chế độ Tháng (Month View)**: Nhìn tổng quan các hạn chót và khối lượng công việc trong cả tháng.

### 3.2. Tương tác trực tiếp trên Lịch
* **Click vào ô trống**: Nhấp chuột vào bất kỳ ô giờ nào trên lịch để tạo ngay một công việc tại đúng khung giờ đó.
* **Kéo thả đổi lịch (Drag to Reschedule)**: Kéo một block công việc sang một ngày khác hoặc giờ khác để đổi lịch trình trong tích tắc.
* **Kéo dãn thời lượng (Resize Duration)**: Rê chuột vào cạnh dưới của block công việc, biểu tượng mũi tên 2 chiều xuất hiện; kéo xuống dưới để tăng thời lượng hoặc kéo lên để giảm thời lượng.
* **Hoàn thành việc ngay trên lịch**: Nhấp đúp vào công việc hoặc click vào biểu tượng hoàn thành để đánh dấu xong.

---

## 4. Quản Lý Dự Án & Mục Tiêu Dài Hạn (Projects & Goals)

### 4.1. Tạo và quản lý Dự án
* Nhấp vào nút **+** tại mục Dự án ở thanh điều hướng bên trái.
* Chọn tên dự án, mô tả, ngày mục tiêu hoàn thành và **mã màu nhận diện**.
* Khi xem lịch, bạn có thể lọc hiển thị chỉ các công việc thuộc một dự án cụ thể bằng cách nhấp vào tên dự án đó.
* Thanh tiến độ phần trăm (%) của mỗi dự án sẽ tự động tăng lên khi các công việc con bên trong được hoàn thành.

### 4.2. Phân rã mục tiêu lớn bằng AI (Goal Decomposition)
* Với các mục tiêu lớn kéo dài 1 tháng, 3 tháng hoặc 6 tháng (như *“Luyện thi IELTS 6.5”*, *“Làm sản phẩm MVP”*), bạn không cần tự nghĩ từng task nhỏ.
* Dùng Trợ lý AI để tự động tạo ra **Lộ trình chia theo tuần (Weekly Milestones)**. AI sẽ tự động tạo các công việc vừa sức theo từng tuần tương ứng với quỹ thời gian bạn có.

---

## 5. 7 Tính Năng Trợ Lý AI & Các Câu Lệnh Mẫu

Mở Trợ lý AI bất kỳ lúc nào bằng phím tắt <kbd>Ctrl + J</kbd> hoặc biểu tượng ngôi sao lấp lánh (Sparkles).

### 🎯 1. Gợi ý ưu tiên thông minh (Smart Prioritization)
* **Khả năng**: Phân tích ma trận: Hạn chót (Deadline) + Mức độ quan trọng (Priority) + Độ khó & Thời lượng (Difficulty & Duration) để gợi ý danh sách việc nên làm đầu tiên trong ngày.
* **Câu lệnh mẫu**:
  > *"Hôm nay tôi nên làm gì trước?"*  
  > *"Gợi ý ưu tiên cho buổi sáng nhiều năng lượng"*  
  > *"Tôi có 45 phút rảnh, nên giải quyết việc nào nhanh nhất?"*

### 📊 2. Tóm tắt công việc & Báo cáo tiến độ (Work Summary)
* **Khả năng**: Tổng hợp chính xác dữ liệu thực tế từ cơ sở dữ liệu về những việc đã xong, việc còn dở dang và các cảnh báo trễ hạn.
* **Câu lệnh mẫu**:
  > *"Tuần này tôi đã làm được những gì?"*  
  > *"Còn việc gì chưa hoàn thành?"*  
  > *"Có việc nào đang bị trễ deadline không?"*

### 🔍 3. Tìm kiếm bằng ngôn ngữ tự nhiên (Natural Language Search)
* **Khả năng**: Hiểu ngữ cảnh thời gian và từ khóa tự nhiên thay vì phải bật các bộ lọc phức tạp.
* **Câu lệnh mẫu**:
  > *"Mấy việc liên quan đến khách hàng tháng trước"*  
  > *"Tìm các task viết báo cáo chưa hoàn thành"*  
  > *"Những công việc ưu tiên cao của tuần này"*

### 🚀 4. Quản lý mục tiêu & Phân rã theo tuần (Goal Breakdown)
* **Khả năng**: Đóng vai trò chuyên gia chiến lược, biến một mục tiêu lớn mơ hồ thành các cột mốc hàng tuần rõ ràng.
* **Câu lệnh mẫu**:
  > *"Tôi muốn học tiếng Anh trong 6 tháng, hãy lập kế hoạch chia task nhỏ theo tuần cho tôi"*  
  > *"Lên kế hoạch 4 tuần để làm xong website portfolio cá nhân"*

### ☀️ 5. Bản tin buổi sáng (Daily Briefing)
* **Khả năng**: Tóm lược đầu ngày: 3 việc quan trọng nhất hôm nay (Top 3 Focus), lịch các cuộc hẹn cố định, cảnh báo việc trễ từ hôm qua và gợi ý khung giờ vàng để tập trung sâu (Deep Work).
* **Câu lệnh mẫu**:
  > *"Điểm tin sáng nay có gì quan trọng?"*  
  > *"Tóm tắt lịch làm việc ngày hôm nay"*

### 🌙 6. Tổng kết cuối ngày (End-of-Day Review)
* **Khả năng**: Thống kê thành quả ngày, lọc ra các việc đã lên lịch hôm nay nhưng chưa xong, và cung cấp tính năng **1-Click dời toàn bộ việc tồn sang ngày mai**.
* **Câu lệnh mẫu**:
  > *"Tổng kết ngày hôm nay"*  
  > *"Dời tất cả việc chưa xong hôm nay sang sáng mai lúc 9h"*

### 💬 7. Hỏi đáp thông minh trên danh sách Todo (Task Q&A)
* **Khả năng**: Truy vấn chuyên sâu vào lịch trình và phát hiện nguy cơ quá tải thời gian.
* **Câu lệnh mẫu**:
  > *"Tôi có việc gì gấp trong 3 ngày tới không?"*  
  > *"Task nào đang có mức độ ảnh hưởng lớn nhất?"*  
  > *"Tuần này ngày nào tôi bận nhất?"*  
  > *"Tối mai tôi rảnh lúc nào để xếp thêm việc?"*

---

## 6. Bản Tin Sáng (Daily Briefing) & Tổng Kết Ngày (End-of-Day Review)

### ☀️ Bản Tin Buổi Sáng (Morning Briefing)
* **Tự động kích hoạt**: Khi bạn mở ứng dụng lần đầu tiên trong ngày (trước 12h00 trưa), ứng dụng sẽ tự động hiển thị thẻ Chào buổi sáng.
* **Mở thủ công**: Bấm vào nút biểu tượng **☀️ Mặt Trời** trên thanh điều hướng trên cùng (Navbar) bất kỳ lúc nào.
* **Nội dung hiển thị**:
  * Chào ngày mới & Thời gian thực.
  * **Top 3 Tiêu Điểm Hôm Nay**: 3 công việc khẩn cấp & quan trọng nhất cần giải quyết trước.
  * **Khung giờ trống vàng (Golden Slot)**: Khung giờ liên tục dài nhất để bạn làm việc không bị phân tâm.
  * **Cảnh báo tồn đọng**: Các việc trễ hạn cần xử lý gấp.

### 🌙 Tổng Kết Cuối Ngày (End-of-Day Review)
* **Kích hoạt buổi chiều tối**: Sau 17h00 hàng ngày hoặc bấm nút biểu tượng **🌙 Mặt Trăng** trên Navbar.
* **Thành tích**: Ăn mừng số việc đã hoàn thành trong ngày (🎉).
* **Điều phối việc tồn đọng thông minh**:
  * Tích chọn việc chưa xong và bấm **Dời sang 09:00 sáng mai**.
  * Hoặc bấm **Chuyển về Việc tự do (Backlog)** để xếp lịch sau.

---

## 7. Bảng Tra Cứu Phím Tắt Thần Tốc

| Phím tắt | Chức năng thực tế |
|---|---|
| <kbd>Ctrl + K</kbd> | Mở **Command Palette** (tìm kiếm mọi việc, chạy lệnh nhanh) |
| <kbd>Ctrl + N</kbd> | Mở hộp thoại **Tạo công việc mới** |
| <kbd>Ctrl + J</kbd> | Bật / Tắt **Trợ lý AI Agent** bên phải màn hình |
| <kbd>Ctrl + 1</kbd> | Chuyển sang **Chế độ xem Ngày** |
| <kbd>Ctrl + 2</kbd> | Chuyển sang **Chế độ xem Tuần** (Google Calendar) |
| <kbd>Ctrl + 3</kbd> | Chuyển sang **Chế độ xem Tháng** |
| <kbd>F1</kbd> | Mở ngay **Cẩm nang hướng dẫn sử dụng** này |
| <kbd>Esc</kbd> | Đóng nhanh bất kỳ cửa sổ / modal / bảng lệnh nào đang mở |

---

## 8. Cài Đặt, Bảo Mật & Hoàn Tác (Undo)

### 8.1. Cấu hình Gemini API Key
1. Mở Cài đặt bằng cách bấm biểu tượng **Bánh răng (Settings)** ở góc phải thanh Navbar hoặc qua <kbd>Ctrl + K</kbd>.
2. Lấy API Key miễn phí từ Google AI Studio (`https://aistudio.google.com/`).
3. Dán key vào ô **Gemini API Key** và bấm **Lưu**. Key được lưu an toàn trên máy của bạn (Local Storage) và không bao giờ gửi đi đâu khác ngoài máy chủ Google Gemini.

### 8.2. An toàn với nút Hoàn Tác (Undo)
* Mỗi khi Trợ lý AI thực hiện một thay đổi dữ liệu (tạo việc mới, xếp lịch, cập nhật trạng thái), một nút **[Hoàn tác - Undo]** màu tím sẽ xuất hiện ngay dưới tin nhắn của AI.
* Bạn chỉ cần bấm nút này để khôi phục trạng thái ban đầu của công việc ngay lập tức nếu AI hiểu nhầm ý của bạn.
* Với các thao tác xóa (Xóa task, Xóa dự án), AI luôn hiện hộp thoại cảnh báo màu đỏ và bắt buộc bạn phải bấm nút **Xác nhận xóa** thì mới thực hiện.

---

*Chúc bạn có những ngày làm việc hiệu quả và tràn đầy năng lượng cùng Personal Productivity Agent!*
