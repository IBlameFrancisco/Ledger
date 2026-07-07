export type TaskType = "daily" | "rotation" | "sequence";
export type Category = "lifestyle" | "streaks" | "skill";

export interface TaskItem {
  name: string;
  detail?: string;
}

export interface CoachNote {
  forDate: string;
  focus: string;
  note: string;
  source: "ai" | "rule";
}

export interface Task {
  id: string;
  cat: Category;
  name: string;
  type: TaskType;
  minutes: number;
  time: string;
  note?: string;
  goal?: string;
  items?: TaskItem[];
  currentIndex: number;
  streak: number;
  best: number;
  lastDone: string | null;
  finished: boolean;
  coach?: CoachNote | null;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface LogRec {
  prevStreak: number;
  prevLast: string | null;
  prevIndex: number;
  prevFinished: boolean;
  prevCoach: CoachNote | null;
  advanced: boolean;
  item: string | null;
  text: string;
}

export interface Entry {
  date: string;
  taskId: string;
  taskName: string;
  item: string | null;
  text: string;
}

export interface AppState {
  tasks: Task[];
  todos: Todo[];
  log: Record<string, Record<string, LogRec>>;
  entries: Entry[];
}

export const CATS: { id: Category; label: string }[] = [
  { id: "lifestyle", label: "Lifestyle" },
  { id: "streaks", label: "Daily streaks" },
  { id: "skill", label: "Resilience and skill" }
];
