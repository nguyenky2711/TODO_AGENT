import { FunctionDeclaration } from './types';

export const AGENT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_tasks',
    category: 'query',
    description: 'Lấy danh sách các công việc theo bộ lọc (ngày, trạng thái, dự án, hoặc việc chưa xếp lịch)',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Ngày bắt đầu định dạng YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Ngày kết thúc định dạng YYYY-MM-DD' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'], description: 'Trạng thái công việc' },
        unscheduledOnly: { type: 'boolean', description: 'Chỉ lấy các việc chưa có ngày hoặc giờ cụ thể' },
        search: { type: 'string', description: 'Từ khóa tìm kiếm tiêu đề hoặc mô tả' },
      },
    },
  },
  {
    name: 'create_task',
    category: 'mutation',
    description: 'Tạo một công việc mới cho người dùng',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Tiêu đề công việc' },
        description: { type: 'string', description: 'Mô tả chi tiết' },
        startDate: { type: 'string', description: 'Ngày làm (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'Giờ bắt đầu (HH:mm)' },
        endTime: { type: 'string', description: 'Giờ kết thúc (HH:mm)' },
        dueDate: { type: 'string', description: 'Hạn chót hoàn thành (YYYY-MM-DD)' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Mức độ ưu tiên' },
        projectId: { type: 'string', description: 'ID của dự án liên quan' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    category: 'mutation',
    description: 'Cập nhật thông tin của một công việc đã có',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID công việc cần cập nhật' },
        title: { type: 'string', description: 'Tiêu đề mới' },
        description: { type: 'string', description: 'Mô tả mới' },
        startDate: { type: 'string', description: 'Ngày mới (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'Giờ bắt đầu mới (HH:mm)' },
        endTime: { type: 'string', description: 'Giờ kết thúc mới (HH:mm)' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_task',
    category: 'mutation',
    description: 'Đánh dấu công việc đã hoàn thành hoặc mở lại',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID công việc' },
        isDone: { type: 'boolean', description: 'true nếu hoàn thành, false nếu quay lại TODO' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    category: 'mutation',
    description: 'Xóa một công việc (Hành động nguy hiểm, yêu cầu xác nhận)',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID công việc muốn xóa' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_projects',
    category: 'query',
    description: 'Lấy danh sách tất cả các dự án và tiến độ hiện tại',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_project',
    category: 'mutation',
    description: 'Tạo một dự án hoặc mục tiêu mới',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên dự án' },
        description: { type: 'string', description: 'Mô tả mục tiêu' },
        targetDate: { type: 'string', description: 'Ngày mục tiêu hoàn thành (YYYY-MM-DD)' },
        color: { type: 'string', description: 'Mã màu HEX' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_project',
    category: 'mutation',
    description: 'Xóa một dự án hoặc mục tiêu (Hành động nguy hiểm, yêu cầu xác nhận)',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID của dự án cần xóa' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_calendar_range',
    category: 'query',
    description: 'Truy vấn các sự kiện lịch và công việc trong một khoảng ngày',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Ngày bắt đầu (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'Ngày kết thúc (YYYY-MM-DD)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'find_free_time',
    category: 'query',
    description: 'Tìm các khoảng thời gian trống trong một ngày cụ thể',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Ngày cần kiểm tra (YYYY-MM-DD)' },
        durationMinutes: { type: 'number', description: 'Thời lượng cần tìm (phút), mặc định 45 hoặc 60' },
      },
      required: ['date'],
    },
  },
  {
    name: 'schedule_task',
    category: 'mutation',
    description: 'Xếp một công việc vào lịch với ngày và khung giờ cụ thể',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID công việc' },
        date: { type: 'string', description: 'Ngày xếp lịch (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'Giờ bắt đầu (HH:mm)' },
        endTime: { type: 'string', description: 'Giờ kết thúc (HH:mm)' },
      },
      required: ['id', 'date', 'startTime'],
    },
  },
  {
    name: 'suggest_daily_priorities',
    category: 'query',
    description: 'Phân tích deadline, độ quan trọng, độ khó và thời lượng để gợi ý hôm nay nên làm gì trước',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Ngày cần đánh giá (mặc định hôm nay YYYY-MM-DD)' },
        energyPreference: {
          type: 'string',
          enum: ['HIGH', 'LOW', 'BALANCED'],
          description: 'Phong cách năng lượng: HIGH (Eat the Frog, việc khó trước), LOW (Quick Wins, việc nhẹ tạo đà), BALANCED (cân bằng)',
        },
      },
    },
  },
  {
    name: 'summarize_work',
    category: 'query',
    description: 'Tổng kết công việc đã làm được trong tuần/tháng, kiểm tra việc còn chưa xong hoặc bị trễ hạn',
    parameters: {
      type: 'object',
      properties: {
        timeFrame: {
          type: 'string',
          enum: ['today', 'this_week', 'last_week', 'month'],
          description: 'Khung thời gian cần tổng hợp báo cáo (mặc định this_week)',
        },
      },
    },
  },
  {
    name: 'natural_search_tasks',
    category: 'query',
    description: 'Tìm kiếm công việc bằng câu tự nhiên (ví dụ: "mấy việc liên quan đến khách hàng tháng trước", "task báo cáo chưa xong")',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Câu tìm kiếm bằng ngôn ngữ tự nhiên' },
      },
      required: ['query'],
    },
  },
  {
    name: 'breakdown_goal',
    category: 'mutation',
    description: 'Phân rã mục tiêu lớn dài hạn thành các công việc nhỏ theo tuần và khởi tạo dự án',
    parameters: {
      type: 'object',
      properties: {
        goalTitle: { type: 'string', description: 'Tên mục tiêu lớn (ví dụ: "Học tiếng Anh 6 tháng", "Làm portfolio 4 tuần")' },
        durationMonths: { type: 'number', description: 'Thời gian mục tiêu tính theo tháng (ví dụ: 6)' },
        hoursPerWeek: { type: 'number', description: 'Số giờ có thể dành mỗi tuần (ví dụ: 5)' },
      },
      required: ['goalTitle'],
    },
  },
  {
    name: 'get_urgent_tasks',
    category: 'query',
    description: 'Tra cứu danh sách công việc khẩn cấp trong N ngày tới hoặc có mức ưu tiên cao (HIGH)',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Số ngày tới cần kiểm tra hạn chót (mặc định 3)' },
      },
    },
  },
  {
    name: 'reschedule_overdue_tasks',
    category: 'mutation',
    description: 'Dời tất cả công việc chưa xong của ngày hôm nay hoặc công việc quá hạn sang ngày mai hoặc ngày chỉ định',
    parameters: {
      type: 'object',
      properties: {
        targetDate: { type: 'string', description: 'Ngày chuyển sang (YYYY-MM-DD), mặc định ngày mai' },
        startTime: { type: 'string', description: 'Giờ bắt đầu mặc định (HH:mm), mặc định 09:00' },
      },
    },
  },
];
