import { TaskService } from './task.service';
import { Task } from '../types';

export interface FreeTimeSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  durationMinutes: number;
}

export class CalendarService {
  static async getEventsForRange(startDate: string, endDate: string): Promise<Task[]> {
    return TaskService.getAll({
      startDate,
      endDate,
    });
  }

  static async findFreeSlots(
    date: string,
    durationMinutes: number = 45,
    startHour: number = 8,
    endHour: number = 22
  ): Promise<FreeTimeSlot[]> {
    const tasks = await TaskService.getAll({ startDate: date });
    
    // Sort scheduled tasks by start_time
    const scheduled = tasks
      .filter((t) => t.startTime && t.status !== 'CANCELLED')
      .map((t) => {
        const [sh, sm] = (t.startTime || '09:00').split(':').map(Number);
        const [eh, em] = (t.endTime || `${sh + 1}:${sm}`).split(':').map(Number);
        return {
          startMinutes: sh * 60 + sm,
          endMinutes: eh * 60 + em,
          title: t.title,
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);

    const minDayMinute = startHour * 60;
    const maxDayMinute = endHour * 60;

    const freeSlots: FreeTimeSlot[] = [];
    let currentPointer = minDayMinute;

    for (const item of scheduled) {
      if (item.startMinutes > currentPointer) {
        const gap = item.startMinutes - currentPointer;
        if (gap >= durationMinutes) {
          const sh = Math.floor(currentPointer / 60).toString().padStart(2, '0');
          const sm = (currentPointer % 60).toString().padStart(2, '0');
          const eh = Math.floor(item.startMinutes / 60).toString().padStart(2, '0');
          const em = (item.startMinutes % 60).toString().padStart(2, '0');
          freeSlots.push({
            startTime: `${sh}:${sm}`,
            endTime: `${eh}:${em}`,
            durationMinutes: gap,
          });
        }
      }
      currentPointer = Math.max(currentPointer, item.endMinutes);
    }

    if (maxDayMinute > currentPointer) {
      const gap = maxDayMinute - currentPointer;
      if (gap >= durationMinutes) {
        const sh = Math.floor(currentPointer / 60).toString().padStart(2, '0');
        const sm = (currentPointer % 60).toString().padStart(2, '0');
        const eh = Math.floor(maxDayMinute / 60).toString().padStart(2, '0');
        const em = (maxDayMinute % 60).toString().padStart(2, '0');
        freeSlots.push({
          startTime: `${sh}:${sm}`,
          endTime: `${eh}:${em}`,
          durationMinutes: gap,
        });
      }
    }

    return freeSlots;
  }
}
