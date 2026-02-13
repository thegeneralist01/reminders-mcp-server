/**
 * Type definitions for Reminders MCP Server
 */

export interface Reminder {
  id: string;
  name: string;
  body?: string;
  completed: boolean;
  completionDate?: Date;
  dueDate?: Date;
  allDayDueDate?: Date;
  remindMeDate?: Date;
  priority: number;
  creationDate: Date;
  modificationDate: Date;
  listName: string;
}

export interface ReminderList {
  id: string;
  name: string;
  reminderCount?: number;
}

export interface CreateReminderParams {
  name: string;
  listName: string;
  body?: string;
  dueDate?: string;
  allDayDueDate?: string;
  remindMeDate?: string;
  priority?: number;
}

export interface UpdateReminderParams {
  listName: string;
  reminderName: string;
  newName?: string;
  body?: string;
  dueDate?: string;
  allDayDueDate?: string;
  remindMeDate?: string;
  priority?: number;
  completed?: boolean;
}

export interface SearchRemindersParams {
  query?: string;
  listName?: string;
  completed?: boolean;
  hasDueDate?: boolean;
  limit?: number;
  offset?: number;
}

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

export interface PaginatedResponse<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  hasMore: boolean;
  nextOffset?: number;
}
