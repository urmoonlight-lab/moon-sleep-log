import {
  disruptionTypes, medicationModes, preSleepFactors, type DisruptionType, type PreSleepFactor, type SleepLog,
} from "./types";

const STORAGE_KEY = "moon-sleep-log:v1";

export function localDate(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function emptyLog(date = localDate()): SleepLog {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), date, createdAt: now, updatedAt: now,
    bedtime: null, lightsOffTime: null, estimatedSleepOnsetTime: null, wakeTime: null, outOfBedTime: null,
    estimatedSleepDurationMinutes: null, awakeningsCount: null, disruptionTypes: [], preSleepFactors: [],
    medicationRecordMode: "not_recorded", medicationNote: null,
    memoryGap: false, unusualMessaging: false, unusualPurchases: false, eatingWithoutClearMemory: false,
    walkingOrActivityWithoutClearMemory: false, fallOrInjury: false, breathingDiscomfort: false,
    severeNextDaySedation: false, otherUnusualEvent: false, unusualEventNote: null,
    sleepQualityScore: null, nextDayEnergyScore: null, nextDayMoodScore: null,
    nextDayCognitiveClarityScore: null, nextDayPhysicalComfortScore: null, freeNote: null, tags: [],
  };
}

function isSleepLog(value: unknown): value is SleepLog {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SleepLog>;
  return typeof item.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date ?? "") &&
    disruptionTypes.every((type) => !item.disruptionTypes?.includes(type) || typeof type === "string") &&
    Array.isArray(item.disruptionTypes) && Array.isArray(item.preSleepFactors);
}

export function loadLogs(): SleepLog[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSleepLog).sort((a, b) => b.date.localeCompare(a.date)) : [];
  } catch {
    return [];
  }
}

export function persistLogs(logs: SleepLog[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function saveLog(logs: SleepLog[], log: SleepLog): SleepLog[] {
  const next = [{ ...log, updatedAt: new Date().toISOString() }, ...logs.filter((item) => item.id !== log.id)]
    .sort((a, b) => b.date.localeCompare(a.date));
  persistLogs(next);
  return next;
}

export function deleteLog(logs: SleepLog[], id: string): SleepLog[] {
  const next = logs.filter((item) => item.id !== id);
  persistLogs(next);
  return next;
}

export function clearLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeInBedMinutes(log: SleepLog): number | null {
  if (!log.bedtime || !log.outOfBedTime) return null;
  const start = timeToMinutes(log.bedtime);
  let end = timeToMinutes(log.outOfBedTime);
  if (end < start) end += 24 * 60;
  return end - start;
}

export function sleepEfficiency(log: SleepLog): number | null {
  const inBed = timeInBedMinutes(log);
  if (!inBed || log.estimatedSleepDurationMinutes == null) return null;
  return Math.round((log.estimatedSleepDurationMinutes / inBed) * 100);
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function mostCommon<T extends string>(items: T[][]): T | null {
  const counts = new Map<T, number>();
  items.flat().forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function summaries(logs: SleepLog[]) {
  return {
    totalLogsCount: logs.length,
    averageSleepDuration: average(logs.map((log) => log.estimatedSleepDurationMinutes)),
    averageSleepQualityScore: average(logs.map((log) => log.sleepQualityScore)),
    averageNextDayEnergyScore: average(logs.map((log) => log.nextDayEnergyScore)),
    mostCommonSleepDisruptionType: mostCommon(logs.map((log) => log.disruptionTypes)),
    mostCommonPreSleepFactor: mostCommon(logs.map((log) => log.preSleepFactors)),
  };
}

export function importLogs(value: unknown): SleepLog[] {
  if (!Array.isArray(value)) throw new Error("导入文件应包含日志数组");
  const valid = value.filter(isSleepLog).map((log) => ({
    ...emptyLog(log.date), ...log,
    disruptionTypes: log.disruptionTypes.filter((item): item is DisruptionType => disruptionTypes.includes(item)),
    preSleepFactors: log.preSleepFactors.filter((item): item is PreSleepFactor => preSleepFactors.includes(item)),
    medicationRecordMode: medicationModes.includes(log.medicationRecordMode) ? log.medicationRecordMode : "not_recorded",
  }));
  if (!valid.length && value.length) throw new Error("没有找到有效的睡眠日志");
  return valid;
}
