import { query, run } from './sqlite';

export async function seedInitialDataIfNeeded(): Promise<void> {
  // Check if initial seeding was already done in the past
  const seedFlag = await query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['initial_seed_completed']);
  if (seedFlag && seedFlag.length > 0 && seedFlag[0].value === 'true') {
    return; // Already seeded in the past, never resurrect deleted data
  }

  const existingProjects = await query('SELECT count(*) as count FROM projects');
  if (existingProjects && existingProjects[0] && existingProjects[0].count > 0) {
    // If projects already exist from earlier versions, mark flag and return
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_seed_completed', 'true')");
    return;
  }

  const existingTasks = await query('SELECT count(*) as count FROM tasks');
  if (existingTasks && existingTasks[0] && existingTasks[0].count > 0) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_seed_completed', 'true')");
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Calculate yesterday, tomorrow, and day after tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Insert Projects
  await run(`
    INSERT INTO projects (id, name, description, start_date, target_date, status, color, progress, created_at)
    VALUES 
      ('proj-1', 'Học TypeScript', 'Làm chủ Type System, Generic và Decorator', '${todayStr}', '2026-10-01', 'ACTIVE', '#6366f1', 40, datetime('now')),
      ('proj-2', 'Luyện Đàn Piano', 'Học bài Autumn Leaves và kỹ thuật hợp âm jazz', '${todayStr}', '2026-12-31', 'ACTIVE', '#ec4899', 25, datetime('now')),
      ('proj-3', 'Personal Agent App', 'Phát triển trợ lý năng suất cá nhân đa nền tảng', '${todayStr}', '2026-09-30', 'ACTIVE', '#06b6d4', 70, datetime('now'));
  `);

  // Insert Tags
  await run(`
    INSERT INTO tags (id, name, color)
    VALUES
      ('tag-1', 'Study', '#8b5cf6'),
      ('tag-2', 'Work', '#3b82f6'),
      ('tag-3', 'Music', '#ec4899'),
      ('tag-4', 'AI', '#06b6d4');
  `);

  // Insert Scheduled Tasks
  await run(`
    INSERT INTO tasks (id, title, description, project_id, start_date, start_time, end_date, end_time, due_date, priority, status, reminder_minutes, created_at, updated_at)
    VALUES
      ('task-1', 'Họp Sync & Kế hoạch tuần', 'Review tiến độ các dự án cá nhân', 'proj-3', '${todayStr}', '09:00', '${todayStr}', '10:00', '${todayStr}', 'HIGH', 'DONE', 10, datetime('now'), datetime('now')),
      ('task-2', 'Học Type System & Generic nâng cao', 'Nắm vững conditional types và keyof typeof', 'proj-1', '${todayStr}', '14:00', '${todayStr}', '15:30', '${todayStr}', 'HIGH', 'IN_PROGRESS', 15, datetime('now'), datetime('now')),
      ('task-3', 'Luyện đàn Piano (Autumn Leaves)', 'Tập 45 phút chạy ngón và bài chính', 'proj-2', '${todayStr}', '19:00', '${todayStr}', '19:45', '${todayStr}', 'MEDIUM', 'TODO', 10, datetime('now'), datetime('now')),
      ('task-4', 'Design UI 4-theme & Calendar Grid', 'Triển khai Light/Dark/Neon theme', 'proj-3', '${tomorrowStr}', '10:00', '${tomorrowStr}', '12:00', '${tomorrowStr}', 'HIGH', 'TODO', 10, datetime('now'), datetime('now')),
      ('task-5', 'Luyện Piano gam thứ & hợp âm', 'Tập arpeggio 30 phút', 'proj-2', '${tomorrowStr}', '19:30', '${tomorrowStr}', '20:15', '${tomorrowStr}', 'MEDIUM', 'TODO', 10, datetime('now'), datetime('now'));
  `);

  // Insert Unscheduled Tasks (ready to drag into calendar)
  await run(`
    INSERT INTO tasks (id, title, description, project_id, priority, status, reminder_minutes, created_at, updated_at)
    VALUES
      ('task-6', 'Tối ưu hóa Database queries & Index', 'Đảm bảo query lịch nhanh dưới 10ms', 'proj-3', 'MEDIUM', 'TODO', 10, datetime('now'), datetime('now')),
      ('task-7', 'Đọc tài liệu Tailwind CSS & Modern Glassmorphism', 'Cải thiện hiệu ứng thị giác cho ứng dụng', NULL, 'LOW', 'TODO', 10, datetime('now'), datetime('now')),
      ('task-8', 'Mua sách Kiến trúc Clean Architecture', 'Đặt bản in bìa cứng', NULL, 'LOW', 'TODO', 10, datetime('now'), datetime('now')),
      ('task-9', 'Viết prompt & Tool Calling cho Gemini', 'Định nghĩa JSON schema cho các tool', 'proj-3', 'HIGH', 'TODO', 10, datetime('now'), datetime('now'));
  `);

  // Insert Task Tags
  await run(`
    INSERT INTO task_tags (task_id, tag_id)
    VALUES
      ('task-1', 'tag-2'),
      ('task-2', 'tag-1'),
      ('task-3', 'tag-3'),
      ('task-4', 'tag-4'),
      ('task-9', 'tag-4');
  `);

  // Insert Agent Memory
  await run(`
    INSERT INTO agent_memory (key, value, description, updated_at)
    VALUES
      ('preferred_work_time', 'evening', 'Ưu tiên xếp việc học cá nhân vào buổi tối sau 18:30', datetime('now')),
      ('piano_default_duration', '45', 'Thời lượng buổi tập Piano mặc định là 45 phút', datetime('now')),
      ('preferred_focus_session', '60', 'Khung tập trung chuẩn là 60 phút', datetime('now')),
      ('planning_style', 'balanced', 'Lối lập kế hoạch cân bằng giữa công việc và giải trí', datetime('now'));
  `);

  // Permanently mark initial seed as completed
  await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_seed_completed', 'true')");
}
