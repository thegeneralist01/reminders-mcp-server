/**
 * AppleScript service for interacting with macOS Reminders app
 */

import { exec } from "child_process";
import { promisify } from "util";
import type { Reminder, ReminderList } from "../types.js";

const execAsync = promisify(exec);

/**
 * Execute an AppleScript command
 */
async function runAppleScript(script: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AppleScript execution failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Escape quotes in strings for AppleScript
 */
function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Format a date for AppleScript
 */
function formatDateForAppleScript(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  // Format: "7/10/2014 3:00 PM"
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  
  return `${month}/${day}/${year} ${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Format an all-day date for AppleScript
 */
function formatAllDayDateForAppleScript(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Get all reminder lists
 */
export async function getLists(): Promise<ReminderList[]> {
  const script = `
    tell application "Reminders"
      set listNames to name of every list
      set listIDs to id of every list
      set output to ""
      repeat with i from 1 to count of listNames
        set output to output & item i of listIDs & "||" & item i of listNames & "\\n"
      end repeat
      return output
    end tell
  `;
  
  const result = await runAppleScript(script);
  if (!result) return [];
  
  return result.split("\n").filter(Boolean).map(line => {
    const [id, name] = line.split("||");
    return { id, name };
  });
}

/**
 * Create a new reminder
 */
export async function createReminder(params: {
  name: string;
  listName: string;
  body?: string;
  dueDate?: string;
  allDayDueDate?: string;
  remindMeDate?: string;
  priority?: number;
}): Promise<string> {
  const { name, listName, body, dueDate, allDayDueDate, remindMeDate, priority } = params;
  
  let properties = `name:"${escapeAppleScriptString(name)}"`;
  
  if (body) {
    properties += `, body:"${escapeAppleScriptString(body)}"`;
  }
  
  if (dueDate) {
    const formattedDate = formatDateForAppleScript(dueDate);
    properties += `, due date:date "${formattedDate}"`;
  }
  
  if (allDayDueDate) {
    const formattedDate = formatAllDayDateForAppleScript(allDayDueDate);
    properties += `, allday due date:date "${formattedDate}"`;
  }
  
  if (remindMeDate) {
    const formattedDate = formatDateForAppleScript(remindMeDate);
    properties += `, remind me date:date "${formattedDate}"`;
  }
  
  if (priority !== undefined) {
    properties += `, priority:${priority}`;
  }
  
  const script = `
    tell application "Reminders"
      set myList to list "${escapeAppleScriptString(listName)}"
      tell myList
        set newReminder to make new reminder with properties {${properties}}
        return id of newReminder
      end tell
    end tell
  `;
  
  return await runAppleScript(script);
}

/**
 * Get reminders from a list with optional filters
 */
export async function getReminders(params: {
  listName?: string;
  completed?: boolean;
}): Promise<Reminder[]> {
  const { listName, completed } = params;
  
  let script: string;
  
  if (listName) {
    script = `
      tell application "Reminders"
        set myList to list "${escapeAppleScriptString(listName)}"
        set allReminders to reminders of myList
        set output to ""
        repeat with r in allReminders
          ${completed !== undefined ? `if completed of r is ${completed} then` : ""}
            set output to output & id of r & "||" & name of r & "||" & completed of r & "||"
            try
              set output to output & body of r
            on error
              set output to output & ""
            end try
            set output to output & "||"
            try
              set output to output & due date of r
            on error
              set output to output & ""
            end try
            set output to output & "||" & priority of r & "||" & "${escapeAppleScriptString(listName)}" & "\\n"
          ${completed !== undefined ? "end if" : ""}
        end repeat
        return output
      end tell
    `;
  } else {
    script = `
      tell application "Reminders"
        set allLists to every list
        set output to ""
        repeat with myList in allLists
          set listName to name of myList
          set allReminders to reminders of myList
          repeat with r in allReminders
            ${completed !== undefined ? `if completed of r is ${completed} then` : ""}
              set output to output & id of r & "||" & name of r & "||" & completed of r & "||"
              try
                set output to output & body of r
              on error
                set output to output & ""
              end try
              set output to output & "||"
              try
                set output to output & due date of r
              on error
                set output to output & ""
              end try
              set output to output & "||" & priority of r & "||" & listName & "\\n"
            ${completed !== undefined ? "end if" : ""}
          end repeat
        end repeat
        return output
      end tell
    `;
  }
  
  const result = await runAppleScript(script);
  if (!result) return [];
  
  return result.split("\n").filter(Boolean).map(line => {
    const [id, name, completedStr, body, dueDateStr, priorityStr, list] = line.split("||");
    return {
      id,
      name,
      body: body || undefined,
      completed: completedStr === "true",
      dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
      priority: parseInt(priorityStr) || 0,
      listName: list,
      creationDate: new Date(), // Not available in simple query
      modificationDate: new Date()
    };
  });
}

/**
 * Update a reminder
 */
export async function updateReminder(params: {
  listName: string;
  reminderName: string;
  newName?: string;
  body?: string;
  dueDate?: string;
  allDayDueDate?: string;
  remindMeDate?: string;
  priority?: number;
  completed?: boolean;
}): Promise<void> {
  const { listName, reminderName, newName, body, dueDate, allDayDueDate, remindMeDate, priority, completed } = params;
  
  let updates: string[] = [];
  
  if (newName !== undefined) {
    updates.push(`set name of myReminder to "${escapeAppleScriptString(newName)}"`);
  }
  
  if (body !== undefined) {
    updates.push(`set body of myReminder to "${escapeAppleScriptString(body)}"`);
  }
  
  if (dueDate !== undefined) {
    const formattedDate = formatDateForAppleScript(dueDate);
    updates.push(`set due date of myReminder to date "${formattedDate}"`);
  }
  
  if (allDayDueDate !== undefined) {
    const formattedDate = formatAllDayDateForAppleScript(allDayDueDate);
    updates.push(`set allday due date of myReminder to date "${formattedDate}"`);
  }
  
  if (remindMeDate !== undefined) {
    const formattedDate = formatDateForAppleScript(remindMeDate);
    updates.push(`set remind me date of myReminder to date "${formattedDate}"`);
  }
  
  if (priority !== undefined) {
    updates.push(`set priority of myReminder to ${priority}`);
  }
  
  if (completed !== undefined) {
    updates.push(`set completed of myReminder to ${completed}`);
  }
  
  if (updates.length === 0) {
    throw new Error("No updates provided");
  }
  
  const script = `
    tell application "Reminders"
      set myList to list "${escapeAppleScriptString(listName)}"
      set myReminder to reminder "${escapeAppleScriptString(reminderName)}" of myList
      ${updates.join("\n      ")}
    end tell
  `;
  
  await runAppleScript(script);
}

/**
 * Delete a reminder
 */
export async function deleteReminder(listName: string, reminderName: string): Promise<void> {
  const script = `
    tell application "Reminders"
      set myList to list "${escapeAppleScriptString(listName)}"
      delete reminder "${escapeAppleScriptString(reminderName)}" of myList
    end tell
  `;
  
  await runAppleScript(script);
}

/**
 * Create a new list
 */
export async function createList(name: string): Promise<string> {
  const script = `
    tell application "Reminders"
      set newList to make new list with properties {name:"${escapeAppleScriptString(name)}"}
      return id of newList
    end tell
  `;
  
  return await runAppleScript(script);
}

/**
 * Delete a list
 */
export async function deleteList(name: string): Promise<void> {
  const script = `
    tell application "Reminders"
      delete list "${escapeAppleScriptString(name)}"
    end tell
  `;
  
  await runAppleScript(script);
}
