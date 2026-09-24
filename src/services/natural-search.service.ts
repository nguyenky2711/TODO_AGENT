import { query } from '../db/sqlite';
import { Task, Priority, Difficulty, TaskStatus } from '../types';

export interface ParsedSearchQuery {
  keywords?: string;
  startDate?: string;
  endDate?: string;
  status?: TaskStatus | 'NOT_DONE';
  priority?: Priority;
}

export class NaturalSearchService {
  /**
   * Phân tích câu tìm kiếm tự nhiên tiếng Việt bằng Heuristics offline
   */
  static parseNaturalQuery(text: string): ParsedSearchQuery {
    const lower = text.toLowerCase().trim();
    const result: ParsedSearchQuery = {};
    const now = new Date();

    // 1. Nhận diện thời gian
    if (lower.includes('tháng trước')) {
      const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
      result.startDate = prevMonthFirst.toISOString().split('T')[0];
      result.endDate = prevMonthLast.toISOString().split('T')[0];
    } else if (lower.includes('tháng này')) {
      const thisMonthFirst = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      result.startDate = thisMonthFirst.toISOString().split('T')[0];
      result.endDate = thisMonthLast.toISOString().split('T')[0];
    } else if (lower.includes('tuần trước')) {
      const day = now.getDay();
      const diffToLastMonday = (day === 0 ? -6 : 1) - day - 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToLastMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      result.startDate = monday.toISOString().split('T')[0];
      result.endDate = sunday.toISOString().split('T')[0];
    } else if (lower.includes('tuần này')) {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      result.startDate = monday.toISOString().split('T')[0];
      result.endDate = sunday.toISOString().split('T')[0];
    } else if (lower.includes('hôm nay')) {
      const todayStr = now.toISOString().split('T')[0];
      result.startDate = todayStr;
      result.endDate = todayStr;
    } else if (lower.includes('hôm qua')) {
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      const yStr = yesterday.toISOString().split('T')[0];
      result.startDate = yStr;
      result.endDate = yStr;
    } else if (lower.includes('ngày mai') || lower.includes('mai')) {
      const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
      const tStr = tomorrow.toISOString().split('T')[0];
      result.startDate = tStr;
      result.endDate = tStr;
    }

    // 2. Nhận diện trạng thái
    if (lower.includes('chưa xong') || lower.includes('chưa hoàn thành') || lower.includes('dở dang')) {
      result.status = 'NOT_DONE';
    } else if (lower.includes('đã xong') || lower.includes('hoàn thành')) {
      result.status = 'DONE';
    }

    // 3. Nhận diện ưu tiên
    if (lower.includes('ưu tiên cao') || lower.includes('quan trọng') || lower.includes('gấp')) {
      result.priority = 'HIGH';
    } else if (lower.includes('ưu tiên thấp')) {
      result.priority = 'LOW';
    }

    // 4. Trích xuất từ khóa loại bỏ các stopwords tìm kiếm phổ biến
    let cleanKeywords = lower
      .replace(/mấy việc liên quan đến/g, '')
      .replace(/mấy việc/g, '')
      .replace(/các việc liên quan đến/g, '')
      .replace(/việc liên quan đến/g, '')
      .replace(/tìm các task/g, '')
      .replace(/tìm task/g, '')
      .replace(/tìm việc/g, '')
      .replace(/tháng trước/g, '')
      .replace(/tháng này/g, '')
      .replace(/tuần trước/g, '')
      .replace(/tuần này/g, '')
      .replace(/hôm nay/g, '')
      .replace(/ngày mai/g, '')
      .replace(/hôm qua/g, '')
      .replace(/chưa xong/g, '')
      .replace(/chưa hoàn thành/g, '')
      .replace(/đã xong/g, '')
      .replace(/hoàn thành/g, '')
      .replace(/ưu tiên cao/g, '')
      .replace(/ưu tiên thấp/g, '')
      .replace(/quan trọng/g, '')
      .trim();

    if (cleanKeywords.length > 1) {
      result.keywords = cleanKeywords;
    }

    return result;
  }

  /**
   * Thực thi tìm kiếm đa trường trên SQLite
   */
  static async search(naturalQuery: string): Promise<{ tasks: Task[]; summary: string }> {
    const parsed = this.parseNaturalQuery(naturalQuery);
    let sql = `
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Lọc thời gian
    if (parsed.startDate && parsed.endDate) {
      sql += ` AND (
        (t.start_date IS NOT NULL AND t.start_date >= ? AND t.start_date <= ?)
        OR (t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ?)
        OR (substr(t.created_at, 1, 10) >= ? AND substr(t.created_at, 1, 10) <= ?)
      )`;
      params.push(parsed.startDate, parsed.endDate, parsed.startDate, parsed.endDate, parsed.startDate, parsed.endDate);
    }

    // Lọc trạng thái
    if (parsed.status === 'NOT_DONE') {
      sql += ` AND t.status != 'DONE'`;
    } else if (parsed.status === 'DONE') {
      sql += ` AND t.status = 'DONE'`;
    } else if (parsed.status) {
      sql += ` AND t.status = ?`;
      params.push(parsed.status);
    }

    // Lọc độ ưu tiên
    if (parsed.priority) {
      sql += ` AND t.priority = ?`;
      params.push(parsed.priority);
    }

    // Lọc từ khóa đa trường (tiêu đề, mô tả, tên dự án)
    if (parsed.keywords) {
      sql += ` AND (
        t.title LIKE ? 
        OR t.description LIKE ? 
        OR p.name LIKE ?
      )`;
      const kw = `%${parsed.keywords}%`;
      params.push(kw, kw, kw);
    }

    sql += ` ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC LIMIT 30`;

    const rows = await query<any>(sql, params);
    const tasks: Task[] = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      projectId: r.project_id,
      project: r.project_id ? { id: r.project_id, name: r.project_name, color: r.project_color || '#6366f1', status: 'ACTIVE', createdAt: '' } : undefined,
      startDate: r.start_date,
      startTime: r.start_time,
      endDate: r.end_date,
      endTime: r.end_time,
      dueDate: r.due_date,
      priority: r.priority as Priority,
      difficulty: (r.difficulty || 'MEDIUM') as Difficulty,
      estimatedMinutes: r.estimated_minutes ?? 30,
      status: r.status as TaskStatus,
      color: r.color || r.project_color || '#6366f1',
      reminderMinutesBefore: r.reminder_minutes,
      repeatRule: r.repeat_rule,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
    }));

    let summary = `🔍 Tìm thấy **${tasks.length}** công việc khớp với yêu cầu: "${naturalQuery}"`;
    if (tasks.length === 0) {
      summary = `🔍 Không tìm thấy công việc nào khớp với: "${naturalQuery}". Thử từ khóa khác xem nhé!`;
    }

    return { tasks, summary };
  }
}
