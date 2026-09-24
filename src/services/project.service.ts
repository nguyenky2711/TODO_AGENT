import { query, run } from '../db/sqlite';
import { Project } from '../types';

export class ProjectService {
  static async getAll(): Promise<Project[]> {
    const projects = await query<any>(`
      SELECT p.*,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    return projects.map((p) => {
      const total = Number(p.total_tasks) || 0;
      const done = Number(p.done_tasks) || 0;
      const calculatedProgress = total > 0 ? Math.round((done / total) * 100) : (p.progress || 0);

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        startDate: p.start_date,
        targetDate: p.target_date,
        status: p.status,
        color: p.color || '#6366f1',
        progress: calculatedProgress,
        createdAt: p.created_at,
      };
    });
  }

  static async getById(idOrName: string): Promise<Project | null> {
    const projects = await this.getAll();
    const clean = idOrName.trim().toLowerCase();
    return (
      projects.find(
        (p) =>
          p.id === idOrName ||
          p.name.trim().toLowerCase() === clean ||
          p.name.toLowerCase().includes(clean)
      ) || null
    );
  }

  static async create(data: Partial<Project>): Promise<Project> {
    const id = data.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await run(`
      INSERT INTO projects (id, name, description, start_date, target_date, status, color, progress, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.name || 'Dự án mới',
      data.description || null,
      data.startDate || null,
      data.targetDate || null,
      data.status || 'ACTIVE',
      data.color || '#6366f1',
      data.progress || 0,
      now,
    ]);

    return (await this.getById(id))!;
  }

  static async update(id: string, data: Partial<Project>): Promise<Project> {
    const current = await this.getById(id);
    if (!current) throw new Error(`Project ${id} not found`);

    const name = data.name !== undefined ? data.name : current.name;
    const description = data.description !== undefined ? data.description : current.description;
    const startDate = data.startDate !== undefined ? data.startDate : current.startDate;
    const targetDate = data.targetDate !== undefined ? data.targetDate : current.targetDate;
    const status = data.status !== undefined ? data.status : current.status;
    const color = data.color !== undefined ? data.color : current.color;

    await run(`
      UPDATE projects SET
        name = ?, description = ?, start_date = ?, target_date = ?, status = ?, color = ?
      WHERE id = ?
    `, [name, description, startDate, targetDate, status, color, current.id]);

    return (await this.getById(current.id))!;
  }

  static async delete(idOrName: string): Promise<void> {
    const project = await this.getById(idOrName);
    const targetId = project ? project.id : idOrName;

    // Detach all tasks belonging to this project and clear milestone references
    await run(`UPDATE tasks SET project_id = NULL, milestone_id = NULL WHERE project_id = ?`, [targetId]);
    // Remove milestones belonging to this project
    await run(`DELETE FROM project_milestones WHERE project_id = ?`, [targetId]);
    // Permanently remove the project
    await run(`DELETE FROM projects WHERE id = ?`, [targetId]);
  }
}
