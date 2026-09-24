import { run, query } from '../db/sqlite';
import { Project, ProjectMilestone, Task, GoalRoadmapPlan, Difficulty } from '../types';
import { ProjectService } from './project.service';
import { TaskService } from './task.service';
import { GeminiProvider } from '../ai/gemini.provider';

export class GoalService {
  /**
   * Tạo kế hoạch phân rã mục tiêu (sử dụng Gemini hoặc mẫu chuẩn offline)
   */
  static async planGoalDecomposition(
    goalTitle: string,
    durationMonths: number = 6,
    hoursPerWeek: number = 5
  ): Promise<GoalRoadmapPlan> {
    const apiKey = localStorage.getItem('gemini_api_key');

    if (apiKey) {
      try {
        const gemini = new GeminiProvider();
        const prompt = `
Bạn là một chuyên gia lập kế hoạch chiến lược năng suất cá nhân (Personal Productivity Strategist).
Người dùng có một mục tiêu lớn: "${goalTitle}"
Thời hạn mục tiêu: ${durationMonths} tháng.
Quỹ thời gian dành cho mục tiêu: khoảng ${hoursPerWeek} giờ/tuần.

Hãy phân rã mục tiêu này thành một lộ trình có cấu trúc (Roadmap) gồm các cột mốc theo tuần (tối thiểu 4 đến 8 tuần đại diện tiêu biểu nhất từ tuần đầu đến tuần cuối) để người dùng có thể thực hiện từng bước rõ ràng.

Trả về kết quả ĐÚNG ĐỊNH DẠNG JSON sau (không kèm markdown ngoài text):
{
  "goalName": "${goalTitle}",
  "durationMonths": ${durationMonths},
  "totalEstimatedHours": ${durationMonths * 4 * hoursPerWeek},
  "milestones": [
    {
      "weekNumber": 1,
      "title": "Tiêu đề mốc tuần 1",
      "description": "Mục tiêu cần đạt được trong tuần này",
      "tasks": [
        {
          "title": "Tên việc cụ thể có thể làm ngay",
          "difficulty": "EASY",
          "estimatedMinutes": 45,
          "dayOfWeek": "Thứ Hai"
        }
      ]
    }
  ]
}
Chỉ dùng difficulty là 'EASY' hoặc 'MEDIUM' hoặc 'HARD'.
`.trim();

        const res = await gemini.generate({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          apiKey,
        });

        if (res.content) {
          const cleanJson = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson) as GoalRoadmapPlan;
          if (parsed && parsed.milestones && parsed.milestones.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Gemini goal decomposition failed, using smart template:', err);
      }
    }

    // Smart Offline Roadmap Generator
    const totalWeeks = Math.max(4, Math.min(12, durationMonths * 2));
    const milestones = [];
    const diffs: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'MEDIUM'];

    for (let w = 1; w <= 4; w++) {
      milestones.push({
        weekNumber: w,
        title: `Tuần ${w}: ${w === 1 ? 'Khởi động & Nền tảng cốt lõi' : w === 2 ? 'Rèn luyện kỹ năng thực hành' : w === 3 ? 'Tăng tốc & Giải quyết bài toán khó' : 'Đánh giá & Củng cố kết quả'}`,
        description: `Tập trung vào các mục tiêu then chốt của ${goalTitle} trong giai đoạn ${w}`,
        tasks: [
          {
            title: `[${goalTitle}] Buổi 1: Học lý thuyết & nghiên cứu tài liệu cơ sở`,
            difficulty: diffs[(w - 1) % 4],
            estimatedMinutes: 60,
            dayOfWeek: 'Thứ Ba',
          },
          {
            title: `[${goalTitle}] Buổi 2: Thực hành bài tập & ứng dụng thực tế`,
            difficulty: 'MEDIUM' as Difficulty,
            estimatedMinutes: 60,
            dayOfWeek: 'Thứ Năm',
          },
          {
            title: `[${goalTitle}] Buổi 3: Tổng kết tuần & ghi chú bài học kinh nghiệm`,
            difficulty: 'EASY' as Difficulty,
            estimatedMinutes: 45,
            dayOfWeek: 'Thứ Bảy',
          },
        ],
      });
    }

    return {
      goalName: goalTitle,
      durationMonths,
      totalEstimatedHours: durationMonths * 4 * hoursPerWeek,
      milestones,
    };
  }

  /**
   * Lưu toàn bộ lộ trình mục tiêu và các task vào SQLite
   */
  static async commitGoalRoadmap(plan: GoalRoadmapPlan): Promise<{ project: Project; taskCount: number }> {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setMonth(targetDate.getMonth() + plan.durationMonths);

    // 1. Tạo Project đại diện cho Mục tiêu
    const project = await ProjectService.create({
      name: `🎯 ${plan.goalName}`,
      description: `Mục tiêu dài hạn ${plan.durationMonths} tháng. Kế hoạch phân rã tự động bởi AI.`,
      targetDate: targetDate.toISOString().split('T')[0],
      color: '#8b5cf6', // Neon purple
    });

    let totalCreatedTasks = 0;

    // 2. Tạo Milestones và các Tasks con
    for (const ms of plan.milestones) {
      const milestoneId = `ms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const msDueDate = new Date(today.getTime() + (ms.weekNumber * 7) * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0];

      await run(`
        INSERT INTO project_milestones (
          id, project_id, title, description, target_week_number, due_date, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        milestoneId,
        project.id,
        ms.title,
        ms.description,
        ms.weekNumber,
        msDueDate,
        'PENDING',
        new Date().toISOString(),
      ]);

      // Tạo các task trong tuần đó
      for (let i = 0; i < ms.tasks.length; i++) {
        const t = ms.tasks[i];
        const taskDate = new Date(today.getTime() + ((ms.weekNumber - 1) * 7 + (i * 2 + 1)) * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0];

        await TaskService.create({
          title: t.title,
          description: `Thuộc mốc: ${ms.title}`,
          projectId: project.id,
          milestoneId: milestoneId,
          dueDate: msDueDate,
          startDate: taskDate,
          priority: 'MEDIUM',
          difficulty: t.difficulty,
          estimatedMinutes: t.estimatedMinutes,
          status: 'TODO',
          color: project.color,
        });
        totalCreatedTasks++;
      }
    }

    return { project, taskCount: totalCreatedTasks };
  }
}
