import { Task, Difficulty } from '../types';
import { TaskService } from './task.service';

export interface PrioritizedTaskResult {
  task: Task;
  score: number;
  badge: string;
  reason: string;
}

export class PriorityService {
  /**
   * Tính điểm ưu tiên và xếp hạng các công việc cho ngày hôm nay
   */
  static async suggestDailyPriorities(
    targetDateStr?: string,
    energyPreference: 'HIGH' | 'LOW' | 'BALANCED' = 'BALANCED'
  ): Promise<PrioritizedTaskResult[]> {
    const today = targetDateStr || new Date().toISOString().split('T')[0];
    
    // Lấy tất cả công việc chưa xong (cả có lịch hôm nay và trong backlog)
    const allPending = await TaskService.getAll({
      status: 'TODO',
    });

    const inProgress = await TaskService.getAll({
      status: 'IN_PROGRESS',
    });

    const pool = [...inProgress, ...allPending];
    // Lọc trùng theo id
    const uniquePool = Array.from(new Map(pool.map(t => [t.id, t])).values());

    const scoredTasks: PrioritizedTaskResult[] = uniquePool.map(task => {
      let score = 0;
      let badge = '⭐ Nên làm';
      const reasons: string[] = [];

      // 1. Điểm Deadlines (Hạn chót)
      if (task.dueDate) {
        if (task.dueDate < today) {
          score += 120; // Quá hạn - Khẩn cấp tột cùng
          badge = '🔥 Quá hạn';
          reasons.push(`Đã quá hạn từ ${task.dueDate}`);
        } else if (task.dueDate === today) {
          score += 90;
          badge = '⚡ Hạn chót hôm nay';
          reasons.push(`Hạn chót là hôm nay`);
        } else {
          const diffDays = Math.ceil(
            (new Date(task.dueDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
          );
          if (diffDays <= 3) {
            score += 60;
            reasons.push(`Sắp đến hạn trong ${diffDays} ngày tới`);
          }
        }
      }

      // 2. Điểm Độ quan trọng (Priority)
      if (task.priority === 'HIGH') {
        score += 80;
        if (!badge.startsWith('🔥')) badge = '⭐ Rất quan trọng';
        reasons.push('Mức ưu tiên HIGH');
      } else if (task.priority === 'MEDIUM') {
        score += 40;
      } else {
        score += 15;
      }

      // 3. Đang dở dang (IN_PROGRESS)
      if (task.status === 'IN_PROGRESS') {
        score += 35;
        reasons.push('Đang làm dở, nên hoàn tất dứt điểm');
      }

      // 4. Đã xếp giờ hôm nay
      if (task.startDate === today && task.startTime) {
        score += 45;
        reasons.push(`Đã có lịch lúc ${task.startTime}`);
      }

      // 5. Điểm Độ khó & Năng lượng (Difficulty & Chronotype)
      const diff: Difficulty = task.difficulty || 'MEDIUM';
      const duration = task.estimatedMinutes || 30;

      if (energyPreference === 'HIGH') {
        // "Eat the frog": ưu tiên việc khó và tốn nhiều công sức trước
        if (diff === 'HARD') {
          score += 30;
          reasons.push('Việc thách thức (Eat the Frog)');
        }
      } else if (energyPreference === 'LOW') {
        // Cần việc dễ làm để tạo động lực (Quick wins)
        if (diff === 'EASY' || duration <= 30) {
          score += 35;
          badge = '🎯 Quick Win';
          reasons.push(`Dễ làm (${duration} phút), tạo đà hứng khởi`);
        }
      } else {
        // BALANCED
        if (duration <= 30 && task.priority !== 'LOW') {
          score += 15;
        }
      }

      return {
        task,
        score,
        badge,
        reason: reasons.length > 0 ? reasons.join(' • ') : 'Công việc tiêu chuẩn cần xử lý',
      };
    });

    // Sắp xếp điểm từ cao xuống thấp
    scoredTasks.sort((a, b) => b.score - a.score);

    return scoredTasks;
  }
}
