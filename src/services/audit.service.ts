import { query, run } from '../db/sqlite';
import { AgentAction } from '../types';
import { TaskService } from './task.service';
import { ProjectService } from './project.service';

export class AuditService {
  static async log(data: Omit<AgentAction, 'id' | 'createdAt' | 'isUndone'>): Promise<AgentAction> {
    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await run(`
      INSERT INTO agent_actions (
        id, action_type, target_entity, entity_id, previous_state, new_state, description, source, created_at, is_undone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      id,
      data.actionType,
      data.targetEntity,
      data.entityId,
      data.previousState || null,
      data.newState || null,
      data.description,
      data.source || 'AGENT',
      now,
    ]);

    return {
      ...data,
      id,
      createdAt: now,
      isUndone: false,
    };
  }

  static async getRecent(limit: number = 20): Promise<AgentAction[]> {
    const rows = await query<any>(`
      SELECT * FROM agent_actions 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);

    return rows.map((r) => ({
      id: r.id,
      actionType: r.action_type,
      targetEntity: r.target_entity,
      entityId: r.entity_id,
      previousState: r.previous_state,
      newState: r.new_state,
      description: r.description,
      source: r.source,
      createdAt: r.created_at,
      isUndone: Boolean(r.is_undone),
    }));
  }

  static async undo(actionId: string): Promise<boolean> {
    const rows = await query<any>(`SELECT * FROM agent_actions WHERE id = ?`, [actionId]);
    if (!rows || rows.length === 0) return false;
    const action = rows[0];
    if (action.is_undone) return false;

    try {
      if (action.target_entity === 'TASK') {
        if (action.action_type === 'CREATE_TASK') {
          // Revert creation: delete task
          await TaskService.delete(action.entity_id);
        } else if (action.action_type === 'DELETE_TASK' && action.previous_state) {
          const prevState = JSON.parse(action.previous_state);
          await TaskService.create({ ...prevState, id: action.entity_id });
        } else if (action.previous_state) {
          // Revert update / schedule / complete
          const prevState = JSON.parse(action.previous_state);
          await TaskService.update(action.entity_id, prevState);
        }
      } else if (action.target_entity === 'PROJECT') {
        if (action.action_type === 'CREATE_PROJECT') {
          await ProjectService.delete(action.entity_id);
        } else if (action.action_type === 'DELETE_PROJECT' && action.previous_state) {
          const prevState = JSON.parse(action.previous_state);
          await ProjectService.create({ ...prevState, id: action.entity_id });
        } else if (action.previous_state) {
          const prevState = JSON.parse(action.previous_state);
          await ProjectService.update(action.entity_id, prevState);
        }
      }

      await run(`UPDATE agent_actions SET is_undone = 1 WHERE id = ?`, [actionId]);
      return true;
    } catch (err) {
      console.error('Failed to undo action:', err);
      return false;
    }
  }
}
