import { query, run } from '../db/sqlite';
import { TaskNote, TaskStatus } from '../types';

export class NoteService {
  static async getByTaskId(taskId: string): Promise<TaskNote[]> {
    const rows = await query<any>(`
      SELECT * FROM task_notes 
      WHERE task_id = ? 
      ORDER BY created_at DESC
    `, [taskId]);

    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      content: r.content,
      taskStatus: r.task_status as TaskStatus,
      createdAt: r.created_at,
    }));
  }

  static async create(taskId: string, content: string, taskStatus: TaskStatus): Promise<TaskNote> {
    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await run(`
      INSERT INTO task_notes (id, task_id, content, task_status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, taskId, content, taskStatus, now]);

    return {
      id,
      taskId,
      content,
      taskStatus,
      createdAt: now,
    };
  }

  static async delete(noteId: string): Promise<void> {
    await run(`DELETE FROM task_notes WHERE id = ?`, [noteId]);
  }
}
