export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'snow';
export type TimePhase = 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

export interface SubGoal {
  id: string;
  content: string;
  isCompleted: boolean;
  scheduledTime?: string | null;
  duration?: number;
}

export type Priority = 'P0' | 'P1' | 'P2';

export interface Goal {
  id: string;
  content: string;
  parentIds: string[];
  isCompleted: boolean;
  priority: Priority;
  completedAt?: string;
  createdAt: string;
  isToday: boolean;
  scheduledTime?: string | null; // ISO Date string or "HH:mm" format depending on usage, usually we want full date for calendar or just time for daily view. 
  // Requirement says "vertical list of hours", implying a daily view. "scheduledTime" can be just "HH:mm" if we assume it's for "today". 
  // However, generic "scheduledTime" usually implies a specific date.
  // The user requirement says: "Drag a task onto the 14:00 slot saves its time as 14:00."
  // This implies a daily schedule.
  // Let's stick to string for now, and I will decide if it is full ISO or just time.
  // Given "Unscheduled tasks", likely it is for the current day.
  // Let's use "HH:mm" for simplicity as per requirement "06:00 to 24:00".
  duration?: number; // in minutes
  startDate?: string | null; // ISO Date YYYY-MM-DD
  endDate?: string | null; // ISO Date YYYY-MM-DD
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  subGoals: SubGoal[];
  position: { x: number; y: number };
}
