export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
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

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  project?: Project;
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm or ISO string
  endDate?: string;   // YYYY-MM-DD
  endTime?: string;   // HH:mm or ISO string
  dueDate?: string;   // YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
  color?: string;
  tags?: string[];
  reminderMinutesBefore?: number; // e.g., 10 minutes
  repeatRule?: string; // e.g., 'DAILY', 'WEEKLY'
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes?: TaskNote[];
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

export type ThemeMode = 'light' | 'dark' | 'light-neon' | 'dark-neon';

export type CalendarViewMode = 'day' | 'week' | 'month';
