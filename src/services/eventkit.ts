/**
 * EventKit service for interacting with macOS Reminders without opening the UI app.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import * as fs from "fs/promises";
import * as path from "path";
import type { Reminder, ReminderList } from "../types.js";

const execFileAsync = promisify(execFile);

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const helperSourcePath = path.resolve(moduleDir, "../../native/RemindersEventKitHelper.swift");
const helperBinDir = path.resolve(moduleDir, "../../.cache");
const helperBinaryPath = path.join(helperBinDir, "reminders-eventkit-helper");

let buildPromise: Promise<void> | null = null;

interface HelperSuccess<T> {
  ok: true;
  result: T;
}

interface HelperFailure {
  ok: false;
  error: string;
}

type HelperEnvelope<T> = HelperSuccess<T> | HelperFailure;

interface HelperReminder {
  id: string;
  name: string;
  body?: string;
  completed: boolean;
  completionDate?: string;
  dueDate?: string;
  allDayDueDate?: string;
  remindMeDate?: string;
  priority: number;
  creationDate?: string;
  modificationDate?: string;
  listName: string;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function mapReminder(reminder: HelperReminder): Reminder {
  return {
    id: reminder.id,
    name: reminder.name,
    body: reminder.body || undefined,
    completed: reminder.completed,
    completionDate: parseDate(reminder.completionDate),
    dueDate: parseDate(reminder.dueDate),
    allDayDueDate: parseDate(reminder.allDayDueDate),
    remindMeDate: parseDate(reminder.remindMeDate),
    priority: reminder.priority ?? 0,
    creationDate: parseDate(reminder.creationDate) ?? new Date(),
    modificationDate: parseDate(reminder.modificationDate) ?? new Date(),
    listName: reminder.listName
  };
}

function parseEnvelope<T>(stdout: string, op: string): T {
  const raw = stdout.trim();
  if (!raw) {
    throw new Error(`EventKit helper returned empty response for operation '${op}'`);
  }

  let parsed: HelperEnvelope<T>;
  try {
    parsed = JSON.parse(raw) as HelperEnvelope<T>;
  } catch (error) {
    throw new Error(`Failed to parse EventKit helper response for '${op}': ${raw}`);
  }

  if (!parsed.ok) {
    throw new Error(parsed.error || `EventKit helper failed for operation '${op}'`);
  }

  return parsed.result;
}

async function ensureHelperBuilt(): Promise<void> {
  if (!buildPromise) {
    buildPromise = (async () => {
      await fs.mkdir(helperBinDir, { recursive: true });

      let rebuild = false;
      try {
        const [sourceStat, binaryStat] = await Promise.all([
          fs.stat(helperSourcePath),
          fs.stat(helperBinaryPath)
        ]);
        rebuild = sourceStat.mtimeMs > binaryStat.mtimeMs;
      } catch {
        rebuild = true;
      }

      if (!rebuild) return;

      const { stderr } = await execFileAsync(
        "xcrun",
        ["swiftc", "-O", "-framework", "EventKit", helperSourcePath, "-o", helperBinaryPath],
        { maxBuffer: 10 * 1024 * 1024 }
      );

      if (stderr?.trim()) {
        console.error("EventKit helper build stderr:", stderr.trim());
      }
    })().finally(() => {
      buildPromise = null;
    });
  }

  await buildPromise;
}

async function runHelper<TReturn>(operation: string, payload: unknown = {}): Promise<TReturn> {
  await ensureHelperBuilt();

  const args = [operation, JSON.stringify(payload ?? {})];

  try {
    const { stdout } = await execFileAsync(helperBinaryPath, args, {
      maxBuffer: 20 * 1024 * 1024
    });
    return parseEnvelope<TReturn>(stdout, operation);
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };

    if (err.stdout?.trim()) {
      try {
        return parseEnvelope<TReturn>(err.stdout, operation);
      } catch (parseError) {
        const parseErr = parseError as Error;
        throw new Error(parseErr.message);
      }
    }

    const details = err.stderr?.trim() || err.message;
    throw new Error(`EventKit operation '${operation}' failed: ${details}`);
  }
}

export async function getLists(): Promise<ReminderList[]> {
  const lists = await runHelper<Array<{ id: string; name: string }>>("listLists");
  return lists.map(list => ({ id: list.id, name: list.name }));
}

export async function createReminder(params: {
  name: string;
  listName: string;
  body?: string;
  dueDate?: string;
  allDayDueDate?: string;
  remindMeDate?: string;
  priority?: number;
}): Promise<string> {
  const result = await runHelper<{ id: string }>("createReminder", params);
  return result.id;
}

export async function getPaginatedReminders(params: {
  listName?: string;
  completed?: boolean;
  limit: number;
  offset: number;
}): Promise<{ total: number; reminders: Reminder[] }> {
  const result = await runHelper<{ total: number; reminders: HelperReminder[] }>("listReminders", params);
  return {
    total: result.total,
    reminders: result.reminders.map(mapReminder)
  };
}

export async function getReminders(params: {
  listName?: string;
  completed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Reminder[]> {
  const result = await runHelper<{ total: number; reminders: HelperReminder[] }>("listReminders", {
    listName: params.listName,
    completed: params.completed,
    limit: params.limit,
    offset: params.offset
  });

  return result.reminders.map(mapReminder);
}

export async function getReminderCount(params: {
  listName?: string;
  completed?: boolean;
}): Promise<number> {
  const result = await runHelper<{ count: number }>("countReminders", params);
  return result.count;
}

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
  await runHelper<{ success: boolean }>("updateReminder", params);
}

export async function deleteReminder(listName: string, reminderName: string): Promise<void> {
  await runHelper<{ success: boolean }>("deleteReminder", { listName, reminderName });
}

export async function createList(name: string): Promise<string> {
  const result = await runHelper<{ id: string }>("createList", { name });
  return result.id;
}

export async function deleteList(name: string): Promise<void> {
  await runHelper<{ success: boolean }>("deleteList", { name });
}
