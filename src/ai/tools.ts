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
];
