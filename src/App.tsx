import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  clearLogs, deleteLog, emptyLog, importLogs, loadLogs, localDate, persistLogs, saveLog, sleepEfficiency, summaries,
  timeInBedMinutes,
} from "./data";
import { exportCsv, exportJson } from "./export";
import {
  disruptionLabels, disruptionTypes, factorLabels, medicationModeLabels, medicationModes, preSleepFactors,
  unusualFields, type DisruptionType, type PreSleepFactor, type SleepLog,
} from "./types";

type Route = { page: "home" | "history" | "privacy" } | { page: "edit" | "detail"; id?: string };

function routeFromHash(): Route {
  const [page = "home", id] = location.hash.replace(/^#\/?/, "").split("/");
  if (page === "edit" || page === "detail") return { page, id };
  if (page === "history" || page === "privacy") return { page };
  return { page: "home" };
}

function go(path: string): void {
  location.hash = `#/${path}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function MoonMark() {
  return <span className="moon-mark" aria-hidden="true"><i /></span>;
}

function Icon({ name }: { name: "home" | "plus" | "history" | "shield" | "arrow" | "moon" | "download" }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    history: <><path d="M4 5v5h5"/><path d="M5.2 17.5A8 8 0 1 0 4.4 9M12 7v5l3 2"/></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"/>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    moon: <path d="M20 15.2A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11.2Z"/>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [logs, setLogs] = useState<SleepLog[]>(loadLogs);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const save = (log: SleepLog) => {
    setLogs((current) => saveLog(current, log));
    setToast("睡眠记录已保存在此设备");
    go("history");
  };

  const current = "id" in route && route.id ? logs.find((log) => log.id === route.id) : undefined;

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => go("home")} aria-label="回到首页">
          <MoonMark />
          <span><strong>Moon Sleep Log</strong><small>月相睡眠日志</small></span>
        </button>
        <div className="local-pill"><span /> 仅存储于本机</div>
      </header>

      <main>
        {route.page === "home" && <Dashboard logs={logs} />}
        {route.page === "history" && <History logs={logs} />}
        {route.page === "edit" && <Editor initial={current ?? emptyLog(route.id === "today" ? localDate() : undefined)} onSave={save} />}
        {route.page === "detail" && (current ? <Detail log={current} onDelete={() => {
          if (confirm("确定删除这条睡眠记录吗？此操作无法撤销。")) {
            setLogs((items) => deleteLog(items, current.id));
            setToast("记录已删除");
            go("history");
          }
        }} /> : <EmptyState title="没有找到这条记录" action="返回历史记录" onAction={() => go("history")} />)}
        {route.page === "privacy" && <Privacy logs={logs} setLogs={setLogs} notify={setToast} />}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        <NavButton active={route.page === "home"} icon="home" label="首页" path="home" />
        <NavButton active={route.page === "edit"} icon="plus" label="记录" path="edit/today" raised />
        <NavButton active={route.page === "history" || route.page === "detail"} icon="history" label="历史" path="history" />
        <NavButton active={route.page === "privacy"} icon="shield" label="隐私" path="privacy" />
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, path, raised = false }: { active: boolean; icon: Parameters<typeof Icon>[0]["name"]; label: string; path: string; raised?: boolean }) {
  return <button className={`${active ? "active" : ""} ${raised ? "raised" : ""}`} onClick={() => go(path)}><span><Icon name={icon} /></span><small>{label}</small></button>;
}

function Dashboard({ logs }: { logs: SleepLog[] }) {
  const recent = logs.filter((log) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    return log.date >= localDate(cutoff) && log.date <= localDate();
  });
  const stats = summaries(recent);
  const today = logs.find((log) => log.date === localDate());
  const chart = recent.slice().reverse();
  const maxDuration = Math.max(...chart.map((log) => log.estimatedSleepDurationMinutes ?? 0), 480);

  return <div className="page dashboard-page">
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><Icon name="moon" /> 晚安，照顾好今晚的自己</span>
        <h1>记录睡眠，<em>看见节律</em></h1>
        <p>一份安静、私密的睡眠故障日记。所有内容只保存在你的设备上。</p>
        <button className="primary-button" onClick={() => go(today ? `edit/${today.id}` : "edit/today")}><Icon name={today ? "arrow" : "plus"} /> {today ? "继续填写今日记录" : "创建今日睡眠记录"}</button>
      </div>
      <div className="hero-orbit" aria-hidden="true"><span className="stars">✦　·　✧</span><div className="big-moon"><i /></div><span className="orbit-line" /></div>
    </section>

    <section className="section-heading"><div><span className="eyebrow">最近七天</span><h2>你的睡眠概览</h2></div><button className="text-button" onClick={() => go("history")}>查看全部 <Icon name="arrow" /></button></section>
    <div className="stat-grid">
      <Stat label="平均睡眠时长" value={stats.averageSleepDuration == null ? "还没有足够数据" : formatDuration(stats.averageSleepDuration)} note={recent.length ? `${recent.length} 条记录` : "记录几晚后会显示平均值"} accent="gold" compact={stats.averageSleepDuration == null} />
      <Stat label="平均睡眠质量" value={stats.averageSleepQualityScore == null ? "还没有足够数据" : stats.averageSleepQualityScore.toFixed(1)} suffix={stats.averageSleepQualityScore == null ? undefined : "/ 10"} note={stats.averageSleepQualityScore == null ? "记录几晚后会显示平均值" : "主观评分"} accent="lilac" compact={stats.averageSleepQualityScore == null} />
      <Stat label="常见睡眠故障" value={stats.mostCommonSleepDisruptionType ? disruptionLabels[stats.mostCommonSleepDisruptionType] : "还没有足够数据"} note={stats.mostCommonSleepDisruptionType ? "经常出现在你的日志中" : "记录几晚后会显示趋势"} accent="blue" compact />
      <Stat label="常见睡前因素" value={stats.mostCommonPreSleepFactor ? factorLabels[stats.mostCommonPreSleepFactor] : "还没有足够数据"} note={stats.mostCommonPreSleepFactor ? "经常记录的因素" : "记录几晚后会显示趋势"} accent="sage" compact />
    </div>

    <div className="dashboard-grid">
      <section className="panel chart-panel">
        <div className="panel-title"><div><span className="eyebrow">睡眠时长</span><h3>近七日趋势</h3></div><span className="legend"><i /> 小时</span></div>
        {chart.length ? <div className="bar-chart">{chart.map((log) => <div className="bar-column" key={log.id} title={`${formatDate(log.date)}：${formatDuration(log.estimatedSleepDurationMinutes)}`}><span className="bar-value">{log.estimatedSleepDurationMinutes == null ? "—" : (log.estimatedSleepDurationMinutes / 60).toFixed(1)}</span><div className="bar-track"><i style={{ height: `${Math.max(5, ((log.estimatedSleepDurationMinutes ?? 0) / maxDuration) * 100)}%` }} /></div><small>{weekday(log.date)}</small></div>)}</div> : <MiniEmpty text="完成第一条记录后，这里会出现趋势" />}
      </section>
      <section className="panel recent-panel">
        <div className="panel-title"><div><span className="eyebrow">最近记录</span><h3>慢慢积累就好</h3></div></div>
        {logs.length ? logs.slice(0, 3).map((log) => <button className="recent-row" key={log.id} onClick={() => go(`detail/${log.id}`)}><span className="date-tile"><b>{new Date(`${log.date}T12:00:00`).getDate()}</b><small>{new Date(`${log.date}T12:00:00`).toLocaleDateString("zh-CN", { month: "short" })}</small></span><span className="recent-main"><b>{log.disruptionTypes[0] ? disruptionLabels[log.disruptionTypes[0]] : "睡眠记录"}</b><small>{formatDuration(log.estimatedSleepDurationMinutes)} · 质量 {log.sleepQualityScore ?? "—"}/10</small></span><Icon name="arrow" /></button>) : <MiniEmpty text="你的睡眠记录会安静地待在这里" />}
      </section>
    </div>

    <section className="privacy-banner"><Icon name="shield" /><div><strong>你的记录，只属于你</strong><span>无需账号 · 无网络上传 · 随时可导出或清除</span></div><button onClick={() => go("privacy")}>隐私与导出 <Icon name="arrow" /></button></section>
  </div>;
}

function Stat({ label, value, suffix, note, accent, compact }: { label: string; value: string; suffix?: string; note: string; accent: string; compact?: boolean }) {
  return <article className={`stat-card ${accent}`}><span className="stat-dot" /><small>{label}</small><div className={compact ? "compact" : ""}><strong>{value}</strong>{suffix && <span>{suffix}</span>}</div><p>{note}</p></article>;
}

function Editor({ initial, onSave }: { initial: SleepLog; onSave: (log: SleepLog) => void }) {
  const [log, setLog] = useState<SleepLog>({ ...initial });
  const [tagInput, setTagInput] = useState(initial.tags.join("，"));
  const update = <K extends keyof SleepLog>(key: K, value: SleepLog[K]) => setLog((current) => ({ ...current, [key]: value }));
  const toggleArray = <T extends string>(key: "disruptionTypes" | "preSleepFactors", value: T) => setLog((current) => {
    const list = current[key] as T[];
    return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
  });
  const derivedBed = timeInBedMinutes(log);
  const efficiency = sleepEfficiency(log);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) return;
    const tags = tagInput.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
    onSave({ ...log, tags, medicationNote: blankToNull(log.medicationNote), unusualEventNote: blankToNull(log.unusualEventNote), freeNote: blankToNull(log.freeNote) });
  };

  return <div className="page editor-page">
    <section className="page-intro"><button className="back-button" onClick={() => history.back()}>‹</button><div><span className="eyebrow">睡眠日志</span><h1>{initial.updatedAt === initial.createdAt ? "记录一个夜晚" : "编辑睡眠记录"}</h1><p>不必追求完整，记下你能记得的部分就好。</p></div></section>
    <form onSubmit={submit}>
      <FormSection number="01" title="日期与睡眠时间" intro="记录大致时间即可，不确定的项目可以留空。">
        <div className="field-grid date-grid"><Field label="记录日期" required><input type="date" required value={log.date} onChange={(e) => update("date", e.target.value)} /></Field></div>
        <div className="field-grid five-columns">
          <TimeField label="上床" value={log.bedtime} onChange={(v) => update("bedtime", v)} />
          <TimeField label="关灯" value={log.lightsOffTime} onChange={(v) => update("lightsOffTime", v)} />
          <TimeField label="估计入睡" value={log.estimatedSleepOnsetTime} onChange={(v) => update("estimatedSleepOnsetTime", v)} />
          <TimeField label="醒来" value={log.wakeTime} onChange={(v) => update("wakeTime", v)} />
          <TimeField label="起床" value={log.outOfBedTime} onChange={(v) => update("outOfBedTime", v)} />
        </div>
        <div className="field-grid three-columns">
          <NumberField label="估计实际睡眠" value={log.estimatedSleepDurationMinutes} min={0} suffix="分钟" onChange={(v) => update("estimatedSleepDurationMinutes", v)} />
          <NumberField label="夜间醒来次数" value={log.awakeningsCount} min={0} suffix="次" onChange={(v) => update("awakeningsCount", v)} />
          <div className="derived-box"><span>简单计算</span><strong>{derivedBed == null ? "—" : `${Math.floor(derivedBed / 60)} 小时 ${derivedBed % 60} 分`}</strong><small>卧床时长 {efficiency == null ? "" : `· 估计睡眠效率 ${efficiency}%`}</small></div>
        </div>
      </FormSection>

      <FormSection number="02" title="睡眠故障类型" intro="可以多选，选择最接近你体验的描述。">
        <ChipGrid>{disruptionTypes.map((value) => <Chip key={value} selected={log.disruptionTypes.includes(value)} onClick={() => toggleArray<DisruptionType>("disruptionTypes", value)}>{disruptionLabels[value]}</Chip>)}</ChipGrid>
      </FormSection>

      <FormSection number="03" title="睡前因素" intro="这些只是个人记录因素，不代表因果关系。">
        <ChipGrid>{preSleepFactors.map((value) => <Chip key={value} selected={log.preSleepFactors.includes(value)} onClick={() => toggleArray<PreSleepFactor>("preSleepFactors", value)}>{factorLabels[value]}</Chip>)}</ChipGrid>
      </FormSection>

      <FormSection number="04" title="可选个人用药备注" intro="完全可选，仅作为你的私人笔记。应用不会识别、分类或分析这里的内容。" privateSection>
        <div className="field-grid two-columns"><Field label="记录方式"><select value={log.medicationRecordMode} onChange={(e) => update("medicationRecordMode", e.target.value as SleepLog["medicationRecordMode"])}>{medicationModes.map((mode) => <option value={mode} key={mode}>{medicationModeLabels[mode]}</option>)}</select></Field><Field label="个人备注"><input value={log.medicationNote ?? ""} onChange={(e) => update("medicationNote", e.target.value)} placeholder="留空也没关系" /></Field></div>
      </FormSection>

      <FormSection number="05" title="异常事件" intro="如有记忆空白、受伤或明显异常，可在此做事实记录。">
        <ChipGrid>{unusualFields.map(([field, label]) => <Chip key={field} selected={Boolean(log[field])} onClick={() => update(field, !log[field] as never)}>{label}</Chip>)}</ChipGrid>
        <Field label="异常事件备注"><textarea rows={3} value={log.unusualEventNote ?? ""} onChange={(e) => update("unusualEventNote", e.target.value)} placeholder="只记录你观察到的事实，可留空" /></Field>
        <p className="gentle-notice">若出现记忆空白、受伤、呼吸不适或次日严重功能受影响，请考虑联系持证临床医生或药师。</p>
      </FormSection>

      <FormSection number="06" title="次日状态" intro="0 代表很差，10 代表很好。没有把握时可以留空。">
        <div className="score-list">
          <Score label="睡眠质量" value={log.sleepQualityScore} onChange={(v) => update("sleepQualityScore", v)} />
          <Score label="次日精力" value={log.nextDayEnergyScore} onChange={(v) => update("nextDayEnergyScore", v)} />
          <Score label="次日心情" value={log.nextDayMoodScore} onChange={(v) => update("nextDayMoodScore", v)} />
          <Score label="认知清晰度" value={log.nextDayCognitiveClarityScore} onChange={(v) => update("nextDayCognitiveClarityScore", v)} />
          <Score label="身体舒适度" value={log.nextDayPhysicalComfortScore} onChange={(v) => update("nextDayPhysicalComfortScore", v)} />
        </div>
      </FormSection>

      <FormSection number="07" title="自由备注与标签" intro="写下任何你想留给未来自己的信息。">
        <Field label="备注"><textarea rows={5} value={log.freeNote ?? ""} onChange={(e) => update("freeNote", e.target.value)} placeholder="例如：夜间醒来 2 次，次日困倦明显" /></Field>
        <Field label="标签（用逗号分隔）"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="出差，周末，环境变化" /></Field>
      </FormSection>

      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => history.back()}>暂不保存</button><button className="primary-button" type="submit"><Icon name="moon" /> 保存到本机</button><small><Icon name="shield" /> 不会上传到任何服务器</small></div>
    </form>
  </div>;
}

function FormSection({ number, title, intro, children, privateSection = false }: { number: string; title: string; intro: string; children: ReactNode; privateSection?: boolean }) {
  return <section className={`form-section ${privateSection ? "private-section" : ""}`}><header><span>{number}</span><div><h2>{title}</h2><p>{intro}</p></div>{privateSection && <Icon name="shield" />}</header><div className="form-section-body">{children}</div></section>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="field"><span>{label}{required && <b> 必填</b>}</span>{children}</label>; }
function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) { return <Field label={label}><input type="time" value={value ?? ""} onInput={(e) => onChange(e.currentTarget.value || null)} onChange={(e) => onChange(e.target.value || null)} /></Field>; }
function NumberField({ label, value, min, suffix, onChange }: { label: string; value: number | null; min: number; suffix: string; onChange: (value: number | null) => void }) { return <Field label={label}><div className="suffix-input"><input type="number" min={min} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} /><span>{suffix}</span></div></Field>; }
function ChipGrid({ children }: { children: ReactNode }) { return <div className="chip-grid">{children}</div>; }
function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" className={`chip ${selected ? "selected" : ""}`} onClick={onClick}><i>{selected ? "✓" : "+"}</i>{children}</button>; }

function Score({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <div className="score-row"><span>{label}</span><div className="score-buttons"><button type="button" className={value == null ? "selected empty" : ""} onClick={() => onChange(null)}>—</button>{Array.from({ length: 11 }, (_, score) => <button type="button" key={score} className={value === score ? "selected" : ""} onClick={() => onChange(score)}>{score}</button>)}</div><strong>{value == null ? "未评分" : `${value} / 10`}</strong></div>;
}

function History({ logs }: { logs: SleepLog[] }) {
  const [query, setQuery] = useState("");
  const filtered = logs.filter((log) => !query || [log.date, log.freeNote, ...log.tags, ...log.disruptionTypes.map((v) => disruptionLabels[v]), ...log.preSleepFactors.map((v) => factorLabels[v])].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="page history-page"><section className="page-intro split"><div><span className="eyebrow">你的时间线</span><h1>历史记录</h1><p>回看具体事实，留意重复出现的个人模式。</p></div><button className="primary-button" onClick={() => go("edit/today")}><Icon name="plus" /> 新建记录</button></section>
    <div className="history-tools"><label><span>⌕</span><input type="search" placeholder="搜索日期、标签或记录内容" value={query} onChange={(e) => setQuery(e.target.value)} /></label><span>{filtered.length} 条记录</span></div>
    {filtered.length ? <div className="history-list">{filtered.map((log) => <LogCard log={log} key={log.id} />)}</div> : <EmptyState title={logs.length ? "没有匹配的记录" : "这里还很安静"} body={logs.length ? "试试其他关键词。" : "从记录一个夜晚开始，慢慢积累属于你的睡眠线索。"} action={logs.length ? "清除搜索" : "创建第一条记录"} onAction={() => logs.length ? setQuery("") : go("edit/today")} />}
  </div>;
}

function LogCard({ log }: { log: SleepLog }) {
  const hasUnusual = unusualFields.some(([field]) => Boolean(log[field]));
  return <button className="log-card" onClick={() => go(`detail/${log.id}`)}><div className="log-date"><strong>{new Date(`${log.date}T12:00:00`).getDate()}</strong><span>{new Date(`${log.date}T12:00:00`).toLocaleDateString("zh-CN", { year: "numeric", month: "short" })}</span><small>{weekday(log.date)}</small></div><div className="log-card-main"><div className="log-card-title"><h2>{log.disruptionTypes[0] ? disruptionLabels[log.disruptionTypes[0]] : "睡眠记录"}</h2>{hasUnusual && <span className="event-badge">有异常事件记录</span>}</div><div className="log-metrics"><span><b>{formatDuration(log.estimatedSleepDurationMinutes)}</b> 睡眠时长</span><span><b>{log.sleepQualityScore ?? "—"}/10</b> 睡眠质量</span><span><b>{log.awakeningsCount ?? "—"}</b> 醒来次数</span></div><div className="tag-row">{log.disruptionTypes.slice(0, 3).map((value) => <span key={value}>{disruptionLabels[value]}</span>)}{log.preSleepFactors.slice(0, 2).map((value) => <span className="factor" key={value}>{factorLabels[value]}</span>)}</div></div><Icon name="arrow" /></button>;
}

function Detail({ log, onDelete }: { log: SleepLog; onDelete: () => void }) {
  const unusual = unusualFields.filter(([field]) => Boolean(log[field]));
  return <div className="page detail-page"><section className="page-intro split"><div><button className="inline-back" onClick={() => go("history")}>← 历史记录</button><span className="eyebrow">{formatDate(log.date)}</span><h1>这个夜晚的记录</h1><p>最后更新于 {new Date(log.updatedAt).toLocaleString("zh-CN")}</p></div><button className="primary-button" onClick={() => go(`edit/${log.id}`)}>编辑记录 <Icon name="arrow" /></button></section>
    <div className="detail-summary"><DetailMetric label="估计睡眠" value={formatDuration(log.estimatedSleepDurationMinutes)} /><DetailMetric label="卧床时长" value={formatDuration(timeInBedMinutes(log))} /><DetailMetric label="睡眠质量" value={log.sleepQualityScore == null ? "—" : `${log.sleepQualityScore} / 10`} /><DetailMetric label="估计睡眠效率" value={sleepEfficiency(log) == null ? "—" : `${sleepEfficiency(log)}%`} /></div>
    <div className="detail-grid">
      <DetailSection title="时间"><Definition label="上床" value={log.bedtime} /><Definition label="关灯" value={log.lightsOffTime} /><Definition label="估计入睡" value={log.estimatedSleepOnsetTime} /><Definition label="醒来" value={log.wakeTime} /><Definition label="起床" value={log.outOfBedTime} /><Definition label="夜间醒来" value={log.awakeningsCount == null ? null : `${log.awakeningsCount} 次`} /></DetailSection>
      <DetailSection title="次日状态"><Definition label="精力" value={scoreText(log.nextDayEnergyScore)} /><Definition label="心情" value={scoreText(log.nextDayMoodScore)} /><Definition label="认知清晰" value={scoreText(log.nextDayCognitiveClarityScore)} /><Definition label="身体舒适" value={scoreText(log.nextDayPhysicalComfortScore)} /></DetailSection>
      <DetailSection title="睡眠故障类型" wide><DisplayTags items={log.disruptionTypes.map((value) => disruptionLabels[value])} empty="未记录" /></DetailSection>
      <DetailSection title="睡前因素" wide><DisplayTags items={log.preSleepFactors.map((value) => factorLabels[value])} empty="未记录" /></DetailSection>
      <DetailSection title="异常事件" wide><DisplayTags items={unusual.map(([, label]) => label)} empty="未记录异常事件" />{log.unusualEventNote && <p className="detail-note">{log.unusualEventNote}</p>}</DetailSection>
      <DetailSection title="可选个人用药备注" privateSection><Definition label="记录方式" value={medicationModeLabels[log.medicationRecordMode]} /><p className="detail-note">{log.medicationNote || "未填写私人备注"}</p></DetailSection>
      <DetailSection title="自由备注与标签"><p className="detail-note">{log.freeNote || "未填写备注"}</p><DisplayTags items={log.tags} empty="无标签" /></DetailSection>
    </div>
    <button className="danger-text" onClick={onDelete}>删除这条记录</button>
  </div>;
}

function DetailMetric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function DetailSection({ title, children, wide, privateSection }: { title: string; children: ReactNode; wide?: boolean; privateSection?: boolean }) { return <section className={`detail-section ${wide ? "wide" : ""} ${privateSection ? "private-section" : ""}`}><h2>{privateSection && <Icon name="shield" />}{title}</h2>{children}</section>; }
function Definition({ label, value }: { label: string; value: string | null }) { return <div className="definition"><span>{label}</span><strong>{value || "—"}</strong></div>; }
function DisplayTags({ items, empty }: { items: string[]; empty: string }) { return items.length ? <div className="tag-row display-tags">{items.map((item) => <span key={item}>{item}</span>)}</div> : <p className="muted">{empty}</p>; }

function Privacy({ logs, setLogs, notify }: { logs: SleepLog[]; setLogs: (logs: SleepLog[]) => void; notify: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const incoming = importLogs(JSON.parse(await file.text()));
      const byId = new Map(logs.map((log) => [log.id, log]));
      incoming.forEach((log) => byId.set(log.id, log));
      const merged = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
      persistLogs(merged); setLogs(merged); notify(`已导入 ${incoming.length} 条记录`);
    } catch (error) { alert(error instanceof Error ? error.message : "无法读取导入文件"); }
    event.target.value = "";
  };
  return <div className="page privacy-page"><section className="page-intro"><div><span className="eyebrow">本地优先</span><h1>隐私与本地存储</h1><p>你掌控自己的数据。Moon Sleep Log 默认不会发送任何记录。</p></div></section>
    <section className="local-hero"><Icon name="shield" /><div><h2>所有数据都留在这台设备上</h2><p>无需登录，没有分析追踪，也没有后台服务器。清除浏览器数据可能同时移除这些记录，请定期导出备份。</p></div><strong>{logs.length}<small>本地记录</small></strong></section>
    <div className="privacy-grid">
      <section className="privacy-card"><span className="card-icon"><Icon name="download" /></span><h2>导出完整数据</h2><p>包含你填写的所有内容，包括可选个人用药备注。请妥善保存。</p><div className="button-row"><button className="secondary-button" disabled={!logs.length} onClick={() => exportJson(logs, false)}>导出 JSON</button><button className="secondary-button" disabled={!logs.length} onClick={() => exportCsv(logs, false)}>导出 CSV</button></div></section>
      <section className="privacy-card highlighted"><span className="card-icon"><Icon name="shield" /></span><h2>导出隐去用药备注的数据</h2><p>导出的文件将完全省略“可选个人用药备注”字段，适合分享或存档。</p><div className="button-row"><button className="primary-button" disabled={!logs.length} onClick={() => exportJson(logs, true)}>隐去备注 JSON</button><button className="primary-button" disabled={!logs.length} onClick={() => exportCsv(logs, true)}>隐去备注 CSV</button></div></section>
    </div>
    <section className="settings-list"><div><span className="card-icon">↥</span><div><h3>从 JSON 导入</h3><p>导入有效的 Moon Sleep Log 备份；相同 ID 的记录会被更新。</p></div><button className="secondary-button" onClick={() => inputRef.current?.click()}>选择文件</button><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={handleImport} /></div><div className="danger-row"><span className="card-icon">×</span><div><h3>清除全部本地数据</h3><p>永久删除此浏览器中的全部睡眠记录，此操作无法撤销。</p></div><button className="danger-button" disabled={!logs.length} onClick={() => { if (confirm(`确定永久删除全部 ${logs.length} 条记录吗？此操作无法撤销。`)) { clearLogs(); setLogs([]); notify("全部本地数据已清除"); } }}>清除全部</button></div></section>
    <section className="disclaimer"><Icon name="moon" /><div><h2>使用边界</h2><p>Moon Sleep Log 仅用于个人记录，不提供医疗诊断、治疗、处方、剂量调整或用药改变建议，也不会分析个人用药备注。若出现异常反应、记忆空白、受伤或次日严重功能受影响，请咨询持证临床医生或药师。</p></div></section>
  </div>;
}

function EmptyState({ title, body, action, onAction }: { title: string; body?: string; action: string; onAction: () => void }) { return <section className="empty-state"><div className="empty-moon"><i /></div><h2>{title}</h2>{body && <p>{body}</p>}<button className="primary-button" onClick={onAction}>{action} <Icon name="arrow" /></button></section>; }
function MiniEmpty({ text }: { text: string }) { return <div className="mini-empty"><MoonMark /><span>{text}</span></div>; }

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)} 小时 ${rounded % 60} 分`;
}
function formatDate(date: string): string { return new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }); }
function weekday(date: string): string { return new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN", { weekday: "short" }); }
function scoreText(value: number | null): string | null { return value == null ? null : `${value} / 10`; }
function blankToNull(value: string | null): string | null { return value?.trim() || null; }

export default App;
