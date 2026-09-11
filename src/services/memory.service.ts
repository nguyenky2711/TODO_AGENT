import { query, run } from '../db/sqlite';
import { AgentMemory } from '../types';

export class MemoryService {
  static async getAll(): Promise<AgentMemory[]> {
    const rows = await query<any>(`SELECT * FROM agent_memory ORDER BY key ASC`);
    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      description: r.description,
      updatedAt: r.updated_at,
    }));
  }

  static async get(key: string): Promise<string | null> {
    const rows = await query<any>(`SELECT value FROM agent_memory WHERE key = ?`, [key]);
    return rows && rows.length > 0 ? rows[0].value : null;
  }

  static async set(key: string, value: string, description?: string): Promise<void> {
    const now = new Date().toISOString();
    await run(`
      INSERT INTO agent_memory (key, value, description, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        description = COALESCE(excluded.description, agent_memory.description),
        updated_at = excluded.updated_at
    `, [key, value, description || null, now]);
  }

  static async delete(key: string): Promise<void> {
    await run(`DELETE FROM agent_memory WHERE key = ?`, [key]);
  }
}
