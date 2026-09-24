import { query } from '../db/sqlite';
import { Task, WorkSummaryReport } from '../types';
import { TaskService } from './task.service';

export class AnalyticsService {
  /**
   * Tính toán khoảng ngày bắt đầu và kết thúc cho khung thời gian
   */
  private static getDateRange(timeFrame: 'today' | 'this_week' | 'last_week' | 'month'): { start: string; end: string; label: string } {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (timeFrame === 'today') {
      return { start: todayStr, end: todayStr, label: 'Hôm nay' };
    }

    if (timeFrame === 'this_week') {
      // Thứ 2 đến Chủ nhật
      const day = now.getDay(); // 0 is Sunday
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
        label: 'Tuần này',
      };
    }

    if (timeFrame === 'last_week') {
      const day = now.getDay();
      const diffToLastMonday = (day === 0 ? -6 : 1) - day - 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToLastMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
        label: 'Tuần trước',
      };
    }

    // month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
      label: `Tháng ${now.getMonth() + 1}`,
    };
  }

  /**
   * Lấy báo cáo tóm tắt công việc chi tiết
   */
  static async getWorkSummary(
    timeFrame: 'today' | 'this_week' | 'last_week' | 'month' = 'this_week'
  ): Promise<WorkSummaryReport> {
    const { start, end, label } = this.getDateRange(timeFrame);
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Công việc hoàn thành trong khoảng thời gian
    // Xét cả completed_at hoặc start_date
    const completedSql = `
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status = 'DONE'
        AND (
          (t.completed_at IS NOT NULL AND substr(t.completed_at, 1, 10) >= ? AND substr(t.completed_at, 1, 10) <= ?)
          OR (t.start_date IS NOT NULL AND t.start_date >= ? AND t.start_date <= ?)
        )
      ORDER BY t.completed_at DESC
    `;
    const completedRows = await query<any>(completedSql, [start, end, start, end]);
    const completedTasks: Task[] = completedRows.map(r => ({
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
      priority: r.priority,
      difficulty: r.difficulty || 'MEDIUM',
      estimatedMinutes: r.estimated_minutes ?? 30,
      status: r.status,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
    }));

    // 2. Công việc chưa hoàn thành (Pending) trong khoảng thời gian hoặc backlog
    const pendingSql = `
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status != 'DONE'
        AND (
          (t.start_date IS NOT NULL AND t.start_date >= ? AND t.start_date <= ?)
          OR (t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ?)
          OR (t.start_date IS NULL AND t.due_date IS NULL)
        )
      ORDER BY t.priority DESC, t.due_date ASC
    `;
    const pendingRows = await query<any>(pendingSql, [start, end, start, end]);
    const pendingTasks: Task[] = pendingRows.map(r => ({
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
      priority: r.priority,
      difficulty: r.difficulty || 'MEDIUM',
      estimatedMinutes: r.estimated_minutes ?? 30,
      status: r.status,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
    }));

    // 3. Công việc bị trễ hạn (Overdue)
    const overdueTasks = await TaskService.getOverdueTasks(todayStr);

    const totalTasks = completedTasks.length + pendingTasks.length;
    const rate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return {
      timeFrame: `${label} (${start} → ${end})`,
      completedCount: completedTasks.length,
      pendingCount: pendingTasks.length,
      overdueCount: overdueTasks.length,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRatePercent: rate,
    };
  }
}
