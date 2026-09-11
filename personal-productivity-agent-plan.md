# Personal Productivity Agent — Product & Technical Plan

## 1. Tầm nhìn sản phẩm

Xây dựng một **Desktop App cá nhân trên Windows** theo hướng **Personal Productivity Agent**:

- Quản lý Todo
- Lập kế hoạch công việc
- Quản lý Project/Mục tiêu
- Lịch ngày / tuần / tháng theo trải nghiệm gần với Google Calendar
- Notification của Windows
- Snooze notification
- AI Agent hỗ trợ lập kế hoạch, sắp lịch, truy vấn lịch, tạo/sửa công việc và đề xuất kế hoạch
- Local-first: dữ liệu cá nhân lưu trên máy
- Gemini API đóng vai trò LLM bên ngoài
- Không yêu cầu máy mạnh
- Thiết kế để sau này có thể thay Gemini bằng OpenAI, Claude hoặc model local mà không phải viết lại ứng dụng

---

# 2. Quyết định kiến trúc đã chốt

## 2.1 Nền tảng

Phiên bản đầu:

- Windows Desktop
- Tauri
- React
- TypeScript
- SQLite

Lý do chọn Tauri:

- Nhẹ hơn Electron
- Tiêu thụ RAM thấp hơn
- Phù hợp máy cá nhân cấu hình không cao
- Frontend vẫn dùng React/TypeScript
- Có thể truy cập native capability của Windows qua Tauri/Rust khi cần

---

# 3. Có cần Vector Database không?

## Kết luận

**Không dùng Vector Database trong MVP.**

### Lý do

Ứng dụng ban đầu chủ yếu quản lý dữ liệu có cấu trúc:

- Task
- Project
- Calendar Event
- Reminder
- Priority
- Status
- Tag
- Deadline
- Lịch sử hoàn thành

Những dữ liệu này có thể truy vấn chính xác bằng SQL.

Ví dụ:

> "Tuần này tôi còn việc gì chưa xong?"

Không cần vector search.

SQL có thể xử lý:

```sql
SELECT *
FROM tasks
WHERE status != 'DONE'
AND due_date BETWEEN ? AND ?;
```

Ví dụ:

> "Các việc ưu tiên cao của Project học TypeScript là gì?"

Vẫn chỉ cần SQL:

```sql
SELECT *
FROM tasks
WHERE project_id = ?
AND priority = 'HIGH'
AND status != 'DONE';
```

---

## 3.1 Khi nào mới cần Vector?

Vector/Embedding chỉ cần khi dữ liệu phi cấu trúc tăng nhiều.

Ví dụ tương lai có:

- Hàng nghìn note
- Nhật ký cá nhân
- Tài liệu PDF
- Meeting note
- Web clipping
- Nội dung viết dài
- Knowledge Base cá nhân

Và người dùng muốn hỏi:

> "Lần trước tôi từng viết gì về ý tưởng học piano chậm nhưng đều?"

Câu này khó xử lý bằng SQL hoặc keyword đơn thuần.

Khi đó có thể dùng:

```text
Note
  ↓
Embedding
  ↓
Vector Store
  ↓
Semantic Search
```

---

## 3.2 Hướng thiết kế để không bị khóa

MVP:

```text
SQLite
├── Structured Data
└── Memory Table
```

Tương lai:

```text
SQLite
├── Structured Data
├── Memory Table
└── Embeddings
```

Có thể dùng:

- SQLite + sqlite-vec
- LanceDB
- Qdrant local
- Chroma
- PostgreSQL + pgvector nếu sau này chuyển cloud

Nhưng **không cài trong phiên bản đầu**.

---

# 4. Kiến trúc tổng thể

```text
┌────────────────────────────────────────────┐
│              Windows Desktop App           │
│                                            │
│                 Tauri                      │
│                   │                        │
│             React + TypeScript             │
│                   │                        │
│      ┌────────────┼────────────┐           │
│      │            │            │           │
│   Calendar      Tasks       AI Chat        │
│      │            │            │           │
│      └────────────┼────────────┘           │
│                   │                        │
│            Application Layer               │
│                   │                        │
│      ┌────────────┼─────────────┐          │
│      │            │             │          │
│    SQLite      Notification    Agent       │
│                                Layer       │
└────────────────────────────────┼───────────┘
                                 │
                                 ↓
                           Gemini API
```

---

# 5. Nguyên tắc Local-first

Toàn bộ dữ liệu chính nằm trên máy:

```text
Task
Project
Calendar
Reminder
Preferences
Agent Memory
History
```

Gemini chỉ nhận dữ liệu cần thiết để xử lý yêu cầu hiện tại.

Ví dụ người dùng hỏi:

> "Tối mai tôi rảnh lúc nào?"

Ứng dụng:

```text
User
 ↓
Agent
 ↓
get_calendar_range()
 ↓
SQLite
 ↓
Danh sách lịch ngày mai
 ↓
Gemini
 ↓
Tổng hợp câu trả lời
```

Gemini không cần truy cập trực tiếp database.

---

# 6. Chức năng MVP

## 6.1 Todo

Task gồm:

- ID
- Title
- Description
- Project
- Start Date
- Start Time
- End Date
- End Time
- Due Date
- Priority
- Status
- Tags
- Reminder
- Repeat Rule
- Created At
- Updated At
- Completed At

### Priority

- LOW
- MEDIUM
- HIGH

### Status

- TODO
- IN_PROGRESS
- DONE
- CANCELLED

---

# 7. Project / Goal

Một Project đại diện cho một nhóm công việc.

Ví dụ:

```text
Project: Học TypeScript

├── Học Type cơ bản
├── Học Interface
├── Học Generic
├── Làm Todo App
└── Làm Agent
```

Project gồm:

- ID
- Name
- Description
- Start Date
- Target Date
- Status
- Progress
- Color
- Created At

---

# 8. Calendar

## 8.1 View

Cần có:

- Day View
- Week View
- Month View

Week View là màn hình quan trọng nhất.

Giao diện gần với Google Calendar:

```text
       MON      TUE      WED      THU      FRI

08:00
09:00  ┌─────┐
       │Task │
10:00  └─────┘

11:00

12:00

13:00                    ┌─────────┐
                         │ Meeting │
14:00                    └─────────┘
```

---

# 9. Calendar Interaction

Hỗ trợ:

- Drag task để đổi ngày
- Drag task để đổi giờ
- Resize block để thay đổi duration
- Click vùng trống để tạo task
- Double click task để mở detail
- Drag Todo chưa có lịch vào Calendar
- Filter theo Project
- Filter theo Tag
- Filter theo Priority

---

# 10. Unscheduled Tasks

Sidebar:

```text
Unscheduled Tasks

□ Học TypeScript
□ Đi mua đồ
□ Viết Personal Agent
□ Tập Piano
```

Người dùng có thể kéo:

```text
Học TypeScript
       ↓
Thursday 19:00
```

App tự cập nhật:

```text
start_time = Thursday 19:00
```

---

# 11. Notification

Dùng Windows native notification.

Ví dụ:

```text
19:00 — Học Piano
```

Reminder:

```text
18:50
```

Notification:

> Học Piano bắt đầu sau 10 phút.

---

# 12. Snooze

Notification hỗ trợ:

- Snooze 5 phút
- Snooze 10 phút
- Snooze 30 phút
- Mark Done

---

# 13. AI Agent

Agent là lớp đứng giữa:

```text
User
 ↓
Gemini
 ↓
Tool Selection
 ↓
Application Services
 ↓
SQLite
```

Gemini KHÔNG được:

- truy cập SQLite trực tiếp
- chạy SQL tùy ý
- đọc filesystem tùy ý

---

# 14. Tool Layer

MVP có các tool sau.

## Task Tools

```text
get_tasks
get_task
create_task
update_task
complete_task
delete_task
```

## Project Tools

```text
get_projects
get_project
create_project
update_project
```

## Calendar Tools

```text
get_calendar_range
find_free_time
schedule_task
reschedule_task
```

---

# 15. Quyền của Agent

## Tự thực hiện

Agent được phép tự:

- Đọc task
- Đọc project
- Xem calendar
- Tìm free slot
- Tạo task
- Cập nhật task
- Reschedule task
- Mark Done

## Yêu cầu xác nhận

Agent phải hỏi trước khi:

- Delete task
- Delete project
- Xóa nhiều task
- Di chuyển hàng loạt công việc
- Thay đổi deadline quan trọng hàng loạt

---

# 16. Ví dụ Agent

## Ví dụ 1

Người dùng:

> Mai tôi có gì phải làm?

Agent:

```text
get_calendar_range(tomorrow)
+
get_tasks(tomorrow)
```

Sau đó trả lời:

```text
Ngày mai bạn có:

09:00 — Họp
15:00 — Học TypeScript
19:00 — Piano
```

---

# 17. Ví dụ lập kế hoạch

Người dùng:

> Mai tôi rảnh từ 7 giờ tối. Xếp cho tôi 45 phút piano và 1 tiếng học TypeScript, ưu tiên piano trước.

Agent:

```text
1. get_calendar_range()
2. find_free_time()
3. schedule_task(Piano)
4. schedule_task(TypeScript)
```

Kết quả:

```text
19:00–19:45 Piano
19:45–20:45 TypeScript
```

---

# 18. Agent Planning

Người dùng:

> Tôi muốn hoàn thành Personal Agent trước cuối tháng.

Agent:

```text
1. Đọc project
2. Đọc deadline
3. Đọc task hiện tại
4. Xác định số ngày còn lại
5. Chia milestone
6. Tạo task
7. Xếp task vào lịch
```

---

# 19. Personal Memory

Không dùng vector.

Tạo table:

```text
agent_memory
```

Ví dụ:

| Key | Value |
|---|---|
| preferred_work_time | evening |
| piano_default_duration | 45 |
| preferred_focus_session | 60 |
| planning_style | balanced |

Agent sử dụng memory để hiểu preference.

Ví dụ:

> "Xếp lịch học như thường lệ."

Agent có thể hiểu:

```text
Piano = 45 phút
Học chuyên môn = 60 phút
Ưu tiên buổi tối
```

---

# 20. Memory không được tự lưu mọi thứ

Chỉ lưu những thông tin hữu ích lâu dài.

Ví dụ:

```text
User thường học piano 45 phút.
```

Có thể lưu.

Nhưng:

```text
Hôm nay user hơi mệt.
```

Không cần lưu lâu dài.

---

# 21. Conversation History

Không gửi toàn bộ lịch sử chat lên Gemini.

Thay vào đó:

```text
Current Request
+
Relevant Context
+
Tool Definitions
+
Relevant Memory
```

Ví dụ:

```text
User:
"Xếp lịch học như thường lệ."

Context:

preferred_work_time = evening
piano_default_duration = 45
typescript_default_duration = 60
```

Điều này giúp tiết kiệm token.

---

# 22. LLM Provider Layer

Không gọi Gemini trực tiếp ở mọi nơi.

Tạo abstraction:

```typescript
interface LLMProvider {
  generate(input: AgentRequest): Promise<AgentResponse>;
}
```

Implementation:

```text
GeminiProvider
```

Tương lai:

```text
OpenAIProvider
ClaudeProvider
LocalModelProvider
```

App không bị khóa vào Gemini.

---

# 23. Gemini

Giai đoạn đầu:

```text
Gemini Free Tier
```

Vai trò:

- Natural Language Understanding
- Tool Selection
- Planning
- Response Generation

Gemini KHÔNG làm:

- Data Storage
- Notification Scheduling
- Permission
- Validation
- Business Rules

---

# 24. Tool Schema mẫu

```json
{
  "name": "create_task",
  "description": "Tạo một công việc mới cho người dùng",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string"
      },
      "startTime": {
        "type": "string"
      },
      "endTime": {
        "type": "string"
      },
      "priority": {
        "type": "string",
        "enum": ["LOW", "MEDIUM", "HIGH"]
      },
      "projectId": {
        "type": "string"
      }
    },
    "required": ["title"]
  }
}
```

---

# 25. Tool Execution

Gemini trả:

```json
{
  "name": "create_task",
  "args": {
    "title": "Học Piano",
    "startTime": "2026-09-09T19:00:00+07:00",
    "endTime": "2026-09-09T19:45:00+07:00",
    "priority": "MEDIUM"
  }
}
```

Application kiểm tra:

```text
Schema validation
↓
Permission
↓
Conflict detection
↓
Database
```

---

# 26. Database

SQLite.

Các table chính:

```text
projects
tasks
tags
task_tags
reminders
recurrence_rules
agent_memory
agent_sessions
agent_actions
settings
```

---

# 27. Audit Log

Agent action nên được log.

Table:

```text
agent_actions
```

Ví dụ:

```text
ID: 123
Action: UPDATE_TASK
Task: 85
Old value: 19:00
New value: 20:00
Source: AGENT
Timestamp: ...
```

Lợi ích:

- Debug
- Undo
- Kiểm tra Agent
- Theo dõi lỗi

---

# 28. Undo

Các action quan trọng nên hỗ trợ Undo.

Ví dụ:

> Agent đã dời "Học Piano" sang 20:00.

```text
[Undo]
```

---

# 29. UI Layout

Màn hình chính:

```text
┌──────────────────────────────────────────────────────┐
│ Today       Calendar       Projects       Settings  │
├───────────────┬───────────────────────────┬──────────┤
│               │                           │          │
│ Sidebar       │       Calendar            │ AI       │
│               │                           │ Agent    │
│ Projects      │                           │          │
│ Tags          │                           │          │
│ Todo          │                           │          │
│               │                           │          │
└───────────────┴───────────────────────────┴──────────┘
```

---

# 30. Full Screen Calendar

Khi mở Full Screen:

```text
┌────────────────────────────────────────────────────┐
│ < >  September 2026        Day Week Month          │
├────────────────────────────────────────────────────┤
│                                                    │
│                                                    │
│                 CALENDAR                           │
│                                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

AI panel có thể collapse.

---

# 31. Agent Panel

Ví dụ:

```text
┌─────────────────────────────┐
│ Assistant                   │
├─────────────────────────────┤
│                             │
│ Bạn:                        │
│ Mai tôi rảnh lúc nào?       │
│                             │
│ AI:                         │
│ Bạn rảnh từ 18:30–22:00.    │
│                             │
├─────────────────────────────┤
│ Ask anything...             │
└─────────────────────────────┘
```

---

# 32. Quick Add

Shortcut:

```text
Ctrl + N
```

Mở:

```text
Add Task
```

Ngoài ra có Natural Language Quick Add:

```text
"Piano mai 7 giờ tối 45 phút"
```

Agent parse thành Task.

---

# 33. Keyboard Shortcut

Đề xuất:

```text
Ctrl + N       New Task
Ctrl + K       Command Palette
Ctrl + J       Open AI Agent
Ctrl + 1       Day
Ctrl + 2       Week
Ctrl + 3       Month
Esc            Close Panel
```

---

# 34. Command Palette

```text
Ctrl + K
```

Ví dụ:

```text
> Add Task
> Open Today
> Search Task
> Ask Agent
> Open Project
```

---

# 35. Search

Giai đoạn đầu:

```text
SQLite FTS
```

Không dùng vector.

Search được:

```text
Task Title
Description
Project
Tag
```

Ví dụ:

```text
piano
```

Trả:

```text
Học Piano
Luyện Autumn Leaves
Luyện hợp âm
```

---

# 36. Roadmap

## Phase 0 — Setup

Mục tiêu:

- Tauri
- React
- TypeScript
- SQLite
- Project structure

Done khi:

```text
App mở được
Database hoạt động
Build Windows thành công
```

---

## Phase 1 — Todo Core

Xây:

- Task CRUD
- Priority
- Status
- Tags
- Due Date
- Task Detail

Done khi:

```text
User có thể quản lý Todo hoàn toàn không cần AI.
```

---

## Phase 2 — Project

Xây:

- Project CRUD
- Task trong Project
- Progress
- Target Date

Done khi:

```text
Có thể quản lý nhiều Project.
```

---

## Phase 3 — Calendar

Xây:

- Day
- Week
- Month
- Drag & Drop
- Resize
- Unscheduled Task

Done khi:

```text
Có thể dùng app như một calendar planner.
```

---

## Phase 4 — Notification

Xây:

- Windows Notification
- Reminder
- Snooze
- Mark Done

Done khi:

```text
App có thể nhắc task đúng thời điểm.
```

---

## Phase 5 — Gemini

Xây:

```text
Gemini Provider
Agent Endpoint
Tool Calling
```

Tool đầu tiên:

```text
get_tasks
create_task
update_task
```

Done khi:

```text
User có thể tạo và tìm task bằng ngôn ngữ tự nhiên.
```

---

## Phase 6 — Agent Scheduling

Thêm:

```text
get_calendar_range
find_free_time
schedule_task
reschedule_task
```

Done khi Agent xử lý được:

> "Xếp giúp tôi 1 tiếng học TypeScript tối mai."

---

## Phase 7 — Project Planning Agent

Agent có thể:

- đọc project
- đọc deadline
- chia task
- đề xuất milestone
- schedule

Done khi xử lý được:

> "Tôi muốn hoàn thành project trước cuối tháng."

---

## Phase 8 — Personal Memory

Thêm:

```text
agent_memory
```

Agent bắt đầu hiểu:

- thời gian làm việc ưa thích
- duration thường dùng
- planning preference
- lịch làm việc

---

## Phase 9 — Advanced Productivity

Có thể thêm:

- Habit
- Focus Session
- Pomodoro
- Daily Review
- Weekly Review
- Productivity Analytics

---

# 37. Khi nào thêm Vector?

Chỉ cân nhắc khi xuất hiện ít nhất một nhu cầu:

### Case 1

Có hàng nghìn note.

### Case 2

Muốn semantic search:

> "Tìm những ghi chú có ý tưởng tương tự chuyện học có kỷ luật."

### Case 3

Import:

- PDF
- Document
- Web page
- Meeting note

### Case 4

Personal Knowledge Base.

Khi đó mới thêm:

```text
Embedding Layer
+
Vector Store
```

---

# 38. Không nên làm trong MVP

Không làm ngay:

- Vector DB
- RAG
- Multi Agent
- Local LLM
- Fine-tuning
- Cloud Sync
- Mobile App
- Team Collaboration
- Google Calendar Sync
- Outlook Sync

Mục tiêu là giữ sản phẩm đơn giản.

---

# 39. Cấu trúc Source Code đề xuất

```text
src/
│
├── app/
│
├── components/
│   ├── calendar/
│   ├── task/
│   ├── project/
│   └── agent/
│
├── features/
│   ├── tasks/
│   ├── projects/
│   ├── calendar/
│   ├── reminders/
│   └── agent/
│
├── services/
│   ├── task.service.ts
│   ├── calendar.service.ts
│   ├── reminder.service.ts
│   └── agent.service.ts
│
├── ai/
│   ├── provider.ts
│   ├── gemini.provider.ts
│   ├── tools/
│   ├── prompts/
│   └── agent-loop.ts
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── repository/
│
└── shared/
```

Tauri:

```text
src-tauri/
├── commands/
├── notification/
├── database/
└── permissions/
```

---

# 40. Nguyên tắc kỹ thuật

## Rule 1

LLM không truy cập Database trực tiếp.

## Rule 2

Tool phải có schema rõ ràng.

## Rule 3

Response từ tool phải có cấu trúc.

## Rule 4

Action nguy hiểm phải xác nhận.

## Rule 5

Agent action phải log.

## Rule 6

Có Undo khi hợp lý.

## Rule 7

LLM Provider phải thay thế được.

## Rule 8

Local app vẫn hoạt động khi Gemini không khả dụng.

---

# 41. Product Principle

Ứng dụng phải có giá trị ngay cả khi không có AI.

```text
Todo
+
Project
+
Calendar
+
Notification
```

là sản phẩm hoàn chỉnh.

AI Agent là lớp:

```text
Automation
+
Natural Language
+
Planning
```

không phải nền móng bắt buộc của app.

---

# 42. MVP cuối cùng

MVP được coi là hoàn thành khi người dùng có thể:

1. Tạo Project.
2. Tạo Task.
3. Kéo Task lên Calendar.
4. Xem Day/Week/Month.
5. Nhận Windows Notification.
6. Snooze.
7. Hỏi Agent lịch ngày mai.
8. Tạo Task bằng tiếng Việt.
9. Yêu cầu Agent sắp một Task vào giờ trống.
10. Agent lưu preference đơn giản.
11. App vẫn chạy bình thường khi mất Internet.

---

# 43. Stack chính thức

```text
Desktop:
Tauri

Frontend:
React
TypeScript

Database:
SQLite

Search:
SQLite FTS

AI:
Gemini Developer API

AI Architecture:
Tool Calling

Memory:
Structured Memory

Notification:
Windows Native Notification
```

Không có:

```text
Vector DB
RAG
Fine-tuning
Local LLM
```

trong phiên bản đầu.

---

# 44. Hướng phát triển dài hạn

```text
V1
Todo + Project + Calendar
         ↓
V2
Notification + Agent
         ↓
V3
Planning + Personal Memory
         ↓
V4
Daily / Weekly Productivity Assistant
         ↓
V5
Personal Knowledge Base
         ↓
Vector / RAG nếu thực sự cần
```

---

# 45. Quyết định cuối cùng

Đối với ứng dụng cá nhân này:

> **Structured data trước, Vector sau.**

Không nên thêm Vector Database chỉ vì sản phẩm có AI.

Vector chỉ là một công cụ phục vụ một bài toán cụ thể:

> Semantic Retrieval trên dữ liệu phi cấu trúc lớn.

Trong giai đoạn đầu, SQL + SQLite FTS + Memory có cấu trúc là đủ, nhẹ hơn, rẻ hơn, dễ debug hơn và phù hợp hơn với Gemini Free Tier.
