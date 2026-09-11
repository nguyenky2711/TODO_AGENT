import { ToolCall } from './types';
import { TaskService } from '../services/task.service';
import { ProjectService } from '../services/project.service';

export class FallbackParser {
  static async parseIntent(prompt: string): Promise<{ toolCalls: ToolCall[]; fallbackResponse?: string } | null> {
    const text = prompt.toLowerCase().trim();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Intent 1: Check schedule for tomorrow / today
    if (text.includes('mai') && (text.includes('có gì') || text.includes('lịch') || text.includes('việc gì') || text.includes('làm gì'))) {
      return {
        toolCalls: [{
          name: 'get_calendar_range',
          args: { startDate: tomorrowStr, endDate: tomorrowStr },
        }],
      };
    }

    if (text.includes('hôm nay') && (text.includes('có gì') || text.includes('lịch') || text.includes('việc gì') || text.includes('làm gì'))) {
      return {
        toolCalls: [{
          name: 'get_calendar_range',
          args: { startDate: todayStr, endDate: todayStr },
        }],
      };
    }

    // Intent 2: Find free time ("rảnh lúc nào", "tìm giờ trống")
    if (text.includes('rảnh') || text.includes('giờ trống') || text.includes('slot trống')) {
      const targetDate = text.includes('mai') ? tomorrowStr : todayStr;
      let duration = 45;
      const durationMatch = text.match(/(\d+)\s*(phút|p|m)/);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10);
      } else if (text.includes('1 tiếng') || text.includes('1 giờ')) {
        duration = 60;
      }

      return {
        toolCalls: [{
          name: 'find_free_time',
          args: { date: targetDate, durationMinutes: duration },
        }],
      };
    }

    // Intent 3: Schedule a task ("xếp piano lúc 19:00", "xếp typescript tối mai")
    if (text.startsWith('xếp') || text.startsWith('lên lịch')) {
      const targetDate = text.includes('mai') ? tomorrowStr : todayStr;
      let startTime = '19:00';
      const timeMatch = text.match(/(\d{1,2})[:h](\d{2})?|(\d{1,2})\s*(giờ|g)/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1] || timeMatch[3], 10);
        let minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        if (text.includes('tối') && hour < 12) hour += 12;
        if (text.includes('chiều') && hour < 12) hour += 12;
        startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }

      // Find best matching task
      const allTasks = await TaskService.getAll();
      let matchedTask = allTasks.find(t => text.toLowerCase().includes(t.title.toLowerCase()));
      if (!matchedTask) {
        // Try loose word matching
        const words = text.replace(/xếp|lên lịch|lúc|mai|hôm nay|tối|chiều|giờ/g, '').trim().split(/\s+/);
        for (const w of words) {
          if (w.length > 2) {
            matchedTask = allTasks.find(t => t.title.toLowerCase().includes(w.toLowerCase()));
            if (matchedTask) break;
          }
        }
      }

      if (matchedTask) {
        return {
          toolCalls: [{
            name: 'schedule_task',
            args: {
              id: matchedTask.id,
              date: targetDate,
              startTime,
            },
          }],
        };
      }
    }

    // Intent 4: Complete task ("hoàn thành [tên]")
    if (text.startsWith('hoàn thành') || text.startsWith('xong')) {
      const allTasks = await TaskService.getAll();
      const matched = allTasks.find(t => text.toLowerCase().includes(t.title.toLowerCase()));
      if (matched) {
        return {
          toolCalls: [{
            name: 'complete_task',
            args: { id: matched.id, isDone: true },
          }],
        };
      }
    }

    // Intent 5: Delete project / goal ("xóa dự án [tên]", "xóa mục tiêu [tên]")
    if (text.startsWith('xóa dự án') || text.startsWith('xóa mục tiêu') || text.startsWith('xóa project')) {
      const allProjects = await ProjectService.getAll();
      const matched = allProjects.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
      if (matched) {
        return {
          toolCalls: [{
            name: 'delete_project',
            args: { id: matched.id },
          }],
        };
      }
    }

    // Intent 6: Delete task ("xóa việc", "xóa task")
    if (text.startsWith('xóa việc') || text.startsWith('xóa task') || text.startsWith('xóa')) {
      const allTasks = await TaskService.getAll();
      const matched = allTasks.find(t => text.toLowerCase().includes(t.title.toLowerCase()));
      if (matched) {
        return {
          toolCalls: [{
            name: 'delete_task',
            args: { id: matched.id },
          }],
        };
      }
    }

    // Intent 6: Quick create task ("thêm cho tôi công việc...", "tạo việc...", "thêm task...")
    if (
      text.includes('thêm cho tôi') ||
      text.includes('tạo cho tôi') ||
      text.startsWith('tạo việc') ||
      text.startsWith('tạo task') ||
      text.startsWith('thêm việc') ||
      text.startsWith('thêm task') ||
      text.startsWith('thêm ')
    ) {
      let targetDate: string | undefined = undefined;
      if (text.includes('hôm nay') || text.includes('nay')) {
        targetDate = todayStr;
      } else if (text.includes('mai')) {
        targetDate = tomorrowStr;
      }

      let title = prompt
        .replace(/^(thêm cho tôi công việc|thêm cho tôi task|thêm công việc|tạo cho tôi công việc|tạo cho tôi task|tạo việc|tạo task|thêm việc|thêm task|thêm)\s*/i, '')
        .replace(/\s*(vào ngày hôm nay|vào ngày mai|hôm nay|ngày mai|ngày nay|nhé|nhe|đi|giúp tôi|cho tôi)\s*/gi, ' ')
        .trim();

      if (title.length > 0) {
        return {
          toolCalls: [{
            name: 'create_task',
            args: {
              title,
              startDate: targetDate,
              priority: text.includes('gấp') || text.includes('quan trọng') ? 'HIGH' : 'MEDIUM',
            },
          }],
        };
      }
    }

    // Intent 7: Project summary
    if (text.includes('dự án') || text.includes('project') || text.includes('mục tiêu')) {
      return {
        toolCalls: [{
          name: 'get_projects',
          args: {},
        }],
      };
    }

    return null;
  }
}
