/**
 * Formatting utilities for Reminders responses
 */

import type { Reminder, ReminderList } from "../types.js";
import { CHARACTER_LIMIT } from "../constants.js";

/**
 * Format a reminder as markdown
 */
export function formatReminderMarkdown(reminder: Reminder): string {
  const parts: string[] = [];
  
  parts.push(`**${reminder.name}**${reminder.completed ? " ✓" : ""}`);
  
  if (reminder.body) {
    parts.push(`  ${reminder.body}`);
  }
  
  const details: string[] = [];
  
  if (reminder.dueDate) {
    details.push(`Due: ${reminder.dueDate.toLocaleString()}`);
  }
  
  if (reminder.priority > 0) {
    const priorityText = reminder.priority >= 9 ? "High" : reminder.priority >= 5 ? "Medium" : "Low";
    details.push(`Priority: ${priorityText} (${reminder.priority})`);
  }
  
  details.push(`List: ${reminder.listName}`);
  
  if (details.length > 0) {
    parts.push(`  _${details.join(" • ")}_`);
  }
  
  return parts.join("\n");
}

/**
 * Format multiple reminders as markdown
 */
export function formatRemindersMarkdown(reminders: Reminder[]): string {
  if (reminders.length === 0) {
    return "No reminders found.";
  }
  
  const grouped = reminders.reduce((acc, reminder) => {
    if (!acc[reminder.listName]) {
      acc[reminder.listName] = [];
    }
    acc[reminder.listName].push(reminder);
    return acc;
  }, {} as Record<string, Reminder[]>);
  
  const sections: string[] = [];
  
  for (const [listName, listReminders] of Object.entries(grouped)) {
    sections.push(`### ${listName} (${listReminders.length})\n`);
    sections.push(listReminders.map(formatReminderMarkdown).join("\n\n"));
  }
  
  let output = sections.join("\n\n");
  
  if (output.length > CHARACTER_LIMIT) {
    output = output.substring(0, CHARACTER_LIMIT) + `\n\n_... (truncated, showing first ${CHARACTER_LIMIT} characters)_`;
  }
  
  return output;
}

/**
 * Format reminder lists as markdown
 */
export function formatListsMarkdown(lists: ReminderList[]): string {
  if (lists.length === 0) {
    return "No lists found.";
  }
  
  const items = lists.map(list => {
    const count = list.reminderCount !== undefined ? ` (${list.reminderCount})` : "";
    return `- **${list.name}**${count}`;
  });
  
  return items.join("\n");
}

/**
 * Truncate text if needed
 */
export function truncateText(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) {
    return text;
  }
  
  return text.substring(0, limit) + `\n\n_... (truncated, showing first ${limit} characters)_`;
}
