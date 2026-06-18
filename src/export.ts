import { disruptionLabels, factorLabels, medicationModeLabels, type SleepLog } from "./types";

function download(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportJson(logs: SleepLog[], redacted: boolean): void {
  const data = redacted ? logs.map(({ medicationNote: _privateNote, ...log }) => log) : logs;
  download(JSON.stringify(data, null, 2), `moon-sleep-log${redacted ? "-redacted" : ""}.json`, "application/json");
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCsv(logs: SleepLog[], redacted: boolean): void {
  const fields: Array<[string, (log: SleepLog) => unknown]> = [
    ["日期", (log) => log.date], ["上床时间", (log) => log.bedtime], ["关灯时间", (log) => log.lightsOffTime],
    ["估计入睡时间", (log) => log.estimatedSleepOnsetTime], ["醒来时间", (log) => log.wakeTime],
    ["起床时间", (log) => log.outOfBedTime], ["估计睡眠分钟", (log) => log.estimatedSleepDurationMinutes],
    ["醒来次数", (log) => log.awakeningsCount], ["睡眠故障类型", (log) => log.disruptionTypes.map((v) => disruptionLabels[v]).join("、")],
    ["睡前因素", (log) => log.preSleepFactors.map((v) => factorLabels[v]).join("、")],
    ["用药记录模式", (log) => medicationModeLabels[log.medicationRecordMode]],
    ["睡眠质量", (log) => log.sleepQualityScore], ["次日精力", (log) => log.nextDayEnergyScore],
    ["次日心情", (log) => log.nextDayMoodScore], ["次日认知清晰", (log) => log.nextDayCognitiveClarityScore],
    ["次日身体舒适", (log) => log.nextDayPhysicalComfortScore], ["自由备注", (log) => log.freeNote],
    ["标签", (log) => log.tags.join("、")], ["异常事件备注", (log) => log.unusualEventNote],
  ];
  if (!redacted) fields.splice(11, 0, ["可选个人用药备注", (log) => log.medicationNote]);
  const rows = [fields.map(([label]) => csvCell(label)), ...logs.map((log) => fields.map(([, get]) => csvCell(get(log))))];
  download(`\ufeff${rows.map((row) => row.join(",")).join("\n")}`, `moon-sleep-log${redacted ? "-redacted" : ""}.csv`, "text/csv;charset=utf-8");
}
