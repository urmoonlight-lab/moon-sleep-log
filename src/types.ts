export const disruptionTypes = [
  "difficulty_falling_asleep", "early_morning_awakening", "frequent_awakenings", "shallow_sleep",
  "vivid_dreams_or_nightmares", "physical_symptoms", "itching_or_skin", "pain", "reflux_or_gi",
  "urination", "anxiety_or_rumination", "information_stimulation", "medication_timing_issue", "unknown", "other",
] as const;

export const preSleepFactors = [
  "caffeine", "alcohol", "late_meal", "spicy_or_irritating_food", "intense_exercise", "low_activity_day",
  "screen_use", "social_media_or_messaging", "emotional_event", "work_or_project_stimulation", "physical_discomfort",
  "skin_flare", "gi_symptoms", "pain", "medication_change_that_day", "travel_or_environment_change", "other",
] as const;

export const medicationModes = [
  "not_recorded", "no_sleep_related_medication", "taken_as_prescribed", "delayed_or_missed",
  "changed_by_clinician", "uncertain", "prefer_not_to_say",
] as const;

export type DisruptionType = typeof disruptionTypes[number];
export type PreSleepFactor = typeof preSleepFactors[number];
export type MedicationRecordMode = typeof medicationModes[number];

export interface SleepLog {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  bedtime: string | null;
  lightsOffTime: string | null;
  estimatedSleepOnsetTime: string | null;
  wakeTime: string | null;
  outOfBedTime: string | null;
  estimatedSleepDurationMinutes: number | null;
  awakeningsCount: number | null;
  disruptionTypes: DisruptionType[];
  preSleepFactors: PreSleepFactor[];
  medicationRecordMode: MedicationRecordMode;
  medicationNote: string | null;
  memoryGap: boolean;
  unusualMessaging: boolean;
  unusualPurchases: boolean;
  eatingWithoutClearMemory: boolean;
  walkingOrActivityWithoutClearMemory: boolean;
  fallOrInjury: boolean;
  breathingDiscomfort: boolean;
  severeNextDaySedation: boolean;
  otherUnusualEvent: boolean;
  unusualEventNote: string | null;
  sleepQualityScore: number | null;
  nextDayEnergyScore: number | null;
  nextDayMoodScore: number | null;
  nextDayCognitiveClarityScore: number | null;
  nextDayPhysicalComfortScore: number | null;
  freeNote: string | null;
  tags: string[];
}

export const disruptionLabels: Record<DisruptionType, string> = {
  difficulty_falling_asleep: "难以入睡", early_morning_awakening: "早醒", frequent_awakenings: "频繁醒来",
  shallow_sleep: "睡眠浅", vivid_dreams_or_nightmares: "多梦或噩梦", physical_symptoms: "身体不适",
  itching_or_skin: "瘙痒或皮肤", pain: "疼痛", reflux_or_gi: "反流或胃肠不适", urination: "夜间如厕",
  anxiety_or_rumination: "焦虑或反复思考", information_stimulation: "信息刺激", medication_timing_issue: "用药时间问题",
  unknown: "原因不明", other: "其他",
};

export const factorLabels: Record<PreSleepFactor, string> = {
  caffeine: "咖啡因", alcohol: "饮酒", late_meal: "进食较晚", spicy_or_irritating_food: "辛辣或刺激食物",
  intense_exercise: "高强度运动", low_activity_day: "白天活动较少", screen_use: "屏幕使用",
  social_media_or_messaging: "社交媒体或聊天", emotional_event: "情绪事件", work_or_project_stimulation: "工作或项目兴奋",
  physical_discomfort: "身体不适", skin_flare: "皮肤状态波动", gi_symptoms: "胃肠症状", pain: "疼痛",
  medication_change_that_day: "当天用药有变化", travel_or_environment_change: "出行或环境变化", other: "其他",
};

export const medicationModeLabels: Record<MedicationRecordMode, string> = {
  not_recorded: "未记录", no_sleep_related_medication: "未服用睡眠相关药物", taken_as_prescribed: "按医嘱服用",
  delayed_or_missed: "延迟或漏服", changed_by_clinician: "由临床医生调整", uncertain: "不确定", prefer_not_to_say: "不愿说明",
};

export const unusualFields = [
  ["memoryGap", "记忆空白"], ["unusualMessaging", "异常发消息"], ["unusualPurchases", "异常购买"],
  ["eatingWithoutClearMemory", "无清晰记忆的进食"], ["walkingOrActivityWithoutClearMemory", "无清晰记忆的走动或活动"],
  ["fallOrInjury", "跌倒或受伤"], ["breathingDiscomfort", "呼吸不适"], ["severeNextDaySedation", "次日严重困倦"],
  ["otherUnusualEvent", "其他异常事件"],
] as const satisfies ReadonlyArray<readonly [keyof SleepLog, string]>;
