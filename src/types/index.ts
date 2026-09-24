export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  color: string;
  progress?: number; // 0 to 100
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  targetWeekNumber?: number;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  project?: Project;
  milestoneId?: string;
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm or ISO string
  endDate?: string;   // YYYY-MM-DD
  endTime?: string;   // HH:mm or ISO string
  dueDate?: string;   // YYYY-MM-DD
  priority: Priority;
  difficulty?: Difficulty;
  estimatedMinutes?: number; // e.g. 15, 30, 45, 60, 120
  status: TaskStatus;
  color?: string;
  tags?: string[];
  reminderMinutesBefore?: number; // e.g., 10 minutes
  repeatRule?: string; // e.g., 'DAILY', 'WEEKLY'
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes?: TaskNote[];
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  startTime?: string; // HH:mm optional start time
  endTime?: string;   // HH:mm optional end time
  priority?: Priority; // LOW | MEDIUM | HIGH optional
  createdAt: string;
}
export interface TaskNote {
  id: string;
  taskId: string;
  content: string;
  taskStatus: TaskStatus;
  createdAt: string;
}

export interface AgentMemory {
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

export interface AgentAction {
  id: string;
  actionType: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'SCHEDULE_TASK' | 'RESCHEDULE_TASK' | 'CREATE_PROJECT' | 'UPDATE_PROJECT' | 'DELETE_PROJECT' | 'COMPLETE_TASK';
  targetEntity: 'TASK' | 'PROJECT' | 'CALENDAR';
  entityId: string;
  previousState?: string; // JSON string for undo
  newState?: string;      // JSON string
  description: string;
  source: 'AGENT' | 'USER';
  createdAt: string;
  isUndone?: boolean;
}

export interface DailyBriefingData {
  greeting: string;
  dateStr: string;
  topPriorities: Task[];
  scheduledEvents: Task[];
  overdueTasks: Task[];
  goldenSlot?: { startTime: string; endTime: string; durationMinutes: number };
  quote?: string;
}

export interface GoalRoadmapPlan {
  goalName: string;
  durationMonths: number;
  totalEstimatedHours?: number;
  milestones: {
    weekNumber: number;
    title: string;
    description: string;
    tasks: {
      title: string;
      difficulty: Difficulty;
      estimatedMinutes: number;
      dayOfWeek?: string;
    }[];
  }[];
}

export interface WorkSummaryReport {
  timeFrame: string;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  completedTasks: Task[];
  pendingTasks: Task[];
  overdueTasks: Task[];
  completionRatePercent: number;
}

export type ThemeMode = 'light' | 'dark' | 'light-neon' | 'dark-neon';

export type CalendarViewMode = 'day' | 'week' | 'month';
