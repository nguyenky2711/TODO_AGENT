import { query, run } from '../db/sqlite';
import { Task, Priority, Difficulty, TaskStatus } from '../types';

export interface TaskFilter {
  status?: TaskStatus;
  projectId?: string;
  milestoneId?: string;
  startDate?: string;
  endDate?: string;
  unscheduledOnly?: boolean;
  search?: string;
}

export class TaskService {
  static async getAll(filter?: TaskFilter): Promise<Task[]> {
    let sql = `
      SELECT t.*, p.name as project_name, p.color as project_color 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.unscheduledOnly) {
      sql += ` AND (t.start_date IS NULL OR t.start_time IS NULL) AND t.status != 'DONE'`;
    }

    if (filter?.status) {
      sql += ` AND t.status = ?`;
      params.push(filter.status);
    }

    if (filter?.projectId) {
      sql += ` AND t.project_id = ?`;
      params.push(filter.projectId);
    }

    if (filter?.milestoneId) {
      sql += ` AND t.milestone_id = ?`;
      params.push(filter.milestoneId);
    }

    if (filter?.startDate && filter?.endDate) {
      sql += ` AND t.start_date >= ? AND t.start_date <= ?`;
      params.push(filter.startDate, filter.endDate);
    } else if (filter?.startDate) {
      sql += ` AND t.start_date = ?`;
      params.push(filter.startDate);
    }

    if (filter?.search) {
      sql += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    sql += ` ORDER BY t.start_time ASC, t.created_at DESC`;

    const rows = await query<any>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      projectId: r.project_id,
      milestoneId: r.milestone_id,
      project: r.project_id ? {
        id: r.project_id,
        name: r.project_name,
        color: r.project_color || '#6366f1',
        status: 'ACTIVE',
        createdAt: '',
      } : undefined,
      startDate: r.start_date,
      startTime: r.start_time,
      endDate: r.end_date,
      endTime: r.end_time,
      dueDate: r.due_date,
      priority: (r.priority || 'MEDIUM') as Priority,
      difficulty: (r.difficulty || 'MEDIUM') as Difficulty,
      estimatedMinutes: r.estimated_minutes ?? 30,
      status: (r.status || 'TODO') as TaskStatus,
      color: r.color || r.project_color || '#6366f1',
      reminderMinutesBefore: r.reminder_minutes,
      repeatRule: r.repeat_rule,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
    }));
  }

  static async getById(idOrTitle: string): Promise<Task | null> {
    const clean = idOrTitle.trim().toLowerCase();
    const rows = await query<any>(`
      SELECT t.*, p.name as project_name, p.color as project_color 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? OR LOWER(t.title) = ? OR LOWER(t.title) LIKE ?
      ORDER BY CASE 
        WHEN t.id = ? THEN 1 
        WHEN LOWER(t.title) = ? THEN 2 
        ELSE 3 
      END
      LIMIT 1
    `, [idOrTitle, clean, `%${clean}%`, idOrTitle, clean]);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      projectId: r.project_id,
      milestoneId: r.milestone_id,
      project: r.project_id ? {
        id: r.project_id,
        name: r.project_name,
        color: r.project_color || '#6366f1',
        status: 'ACTIVE',
        createdAt: '',
      } : undefined,
      startDate: r.start_date,
      startTime: r.start_time,
      endDate: r.end_date,
      endTime: r.end_time,
      dueDate: r.due_date,
      priority: (r.priority || 'MEDIUM') as Priority,
      difficulty: (r.difficulty || 'MEDIUM') as Difficulty,
      estimatedMinutes: r.estimated_minutes ?? 30,
      status: (r.status || 'TODO') as TaskStatus,
      color: r.color || r.project_color || '#6366f1',
      reminderMinutesBefore: r.reminder_minutes,
      repeatRule: r.repeat_rule,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
    };
  }

  static async create(data: Partial<Task>): Promise<Task> {
    const id = data.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await run(`
      INSERT INTO tasks (
        id, title, description, project_id, milestone_id, start_date, start_time,
        end_date, end_time, due_date, priority, difficulty, estimated_minutes, status, color, reminder_minutes,
        repeat_rule, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.title || 'Công việc mới',
      data.description || null,
      data.projectId || null,
      data.milestoneId || null,
      data.startDate || null,
      data.startTime || null,
      data.endDate || data.startDate || null,
      data.endTime || null,
      data.dueDate || null,
      data.priority || 'MEDIUM',
      data.difficulty || 'MEDIUM',
      data.estimatedMinutes ?? 30,
      data.status || 'TODO',
      data.color || null,
      data.reminderMinutesBefore ?? 10,
      data.repeatRule || null,
      now,
      now,
    ]);

    return (await this.getById(id))!;
  }

  static async update(idOrTitle: string, data: Partial<Task>): Promise<Task> {
    const now = new Date().toISOString();
    const current = await this.getById(idOrTitle);
    if (!current) throw new Error(`Task ${idOrTitle} not found`);
    const targetId = current.id;

    const title = data.title !== undefined ? data.title : current.title;
    const description = data.description !== undefined ? data.description : current.description;
    const projectId = data.projectId !== undefined ? data.projectId : current.projectId;
    const milestoneId = data.milestoneId !== undefined ? data.milestoneId : current.milestoneId;
    const startDate = data.startDate !== undefined ? data.startDate : current.startDate;
    const startTime = data.startTime !== undefined ? data.startTime : current.startTime;
    const endDate = data.endDate !== undefined ? data.endDate : current.endDate;
    const endTime = data.endTime !== undefined ? data.endTime : current.endTime;
    const dueDate = data.dueDate !== undefined ? data.dueDate : current.dueDate;
    const priority = data.priority !== undefined ? data.priority : current.priority;
    const difficulty = data.difficulty !== undefined ? data.difficulty : (current.difficulty || 'MEDIUM');
    const estimatedMinutes = data.estimatedMinutes !== undefined ? data.estimatedMinutes : (current.estimatedMinutes || 30);
    const status = data.status !== undefined ? data.status : current.status;
    const color = data.color !== undefined ? data.color : current.color;
    const reminderMinutes = data.reminderMinutesBefore !== undefined ? data.reminderMinutesBefore : current.reminderMinutesBefore;
    const repeatRule = data.repeatRule !== undefined ? data.repeatRule : current.repeatRule;
    const completedAt = status === 'DONE' && current.status !== 'DONE' ? now : (status !== 'DONE' ? null : current.completedAt);

    await run(`
      UPDATE tasks SET
        title = ?, description = ?, project_id = ?, milestone_id = ?, start_date = ?, start_time = ?,
        end_date = ?, end_time = ?, due_date = ?, priority = ?, difficulty = ?, estimated_minutes = ?, status = ?,
        color = ?, reminder_minutes = ?, repeat_rule = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `, [
      title, description, projectId, milestoneId, startDate, startTime,
      endDate, endTime, dueDate, priority, difficulty, estimatedMinutes, status,
      color, reminderMinutes, repeatRule, now, completedAt, targetId
    ]);

    return (await this.getById(targetId))!;
  }

  static async delete(idOrTitle: string): Promise<void> {
    const task = await this.getById(idOrTitle);
    const targetId = task ? task.id : idOrTitle;
    await run(`DELETE FROM tasks WHERE id = ?`, [targetId]);
  }

  static async complete(id: string, isDone: boolean = true): Promise<Task> {
    return this.update(id, {
      status: isDone ? 'DONE' : 'TODO',
      completedAt: isDone ? new Date().toISOString() : undefined,
    });
  }

  static async schedule(id: string, date: string, startTime: string, endTime?: string): Promise<Task> {
    // If no endTime provided, default based on estimatedMinutes or +60 mins
    let calculatedEndTime = endTime;
    if (!calculatedEndTime && startTime) {
      const task = await this.getById(id);
      const duration = task?.estimatedMinutes || 60;
      const [h, m] = startTime.split(':').map(Number);
      const totalMin = h * 60 + m + duration;
      const endH = Math.min(23, Math.floor(totalMin / 60)).toString().padStart(2, '0');
      const endM = (totalMin % 60).toString().padStart(2, '0');
      calculatedEndTime = `${endH}:${endM}`;
    }

    return this.update(id, {
      startDate: date,
      startTime: startTime,
      endDate: date,
      endTime: calculatedEndTime,
    });
  }

  // Get tasks whose due_date is before today and not DONE
  static async getOverdueTasks(referenceDateStr?: string): Promise<Task[]> {
    const todayStr = referenceDateStr || new Date().toISOString().split('T')[0];
    const sql = `
      SELECT t.*, p.name as project_name, p.color as project_color 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status != 'DONE' 
        AND t.due_date IS NOT NULL 
        AND t.due_date < ?
      ORDER BY t.due_date ASC, t.priority DESC
    `;
    const rows = await query<any>(sql, [todayStr]);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      projectId: r.project_id,
      milestoneId: r.milestone_id,
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
  }

  // Get urgent tasks: due within N days or priority = HIGH
  static async getUrgentTasks(days: number = 3): Promise<Task[]> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const sql = `
      SELECT t.*, p.name as project_name, p.color as project_color 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status != 'DONE' 
        AND (
          (t.due_date IS NOT NULL AND t.due_date <= ?)
          OR (t.priority = 'HIGH')
        )
      ORDER BY 
        CASE 
          WHEN t.due_date < ? THEN 1
          WHEN t.due_date = ? THEN 2
          WHEN t.priority = 'HIGH' THEN 3
          ELSE 4
        END,
        t.due_date ASC
    `;
    const rows = await query<any>(sql, [targetDateStr, todayStr, todayStr]);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      projectId: r.project_id,
      milestoneId: r.milestone_id,
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
  }

  // Batch reschedule multiple tasks to target date
  static async batchReschedule(taskIds: string[], targetDate: string, startTime: string = '09:00'): Promise<number> {
    let count = 0;
    for (const id of taskIds) {
      try {
        await this.schedule(id, targetDate, startTime);
        count++;
      } catch (err) {
        console.error(`Failed to reschedule task ${id}:`, err);
      }
    }
    return count;
  }
}
