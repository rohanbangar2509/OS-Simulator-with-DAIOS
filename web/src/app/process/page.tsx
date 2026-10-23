"use client";
import { useState, Fragment } from "react";
import { ProcessControlBlock, ProcessState, LogEntry } from "@/lib/types";
import { createProcess, makeThread, transitionProcess, nextPid, nextTid } from "@/lib/process";

const STATE_COLORS: Record<ProcessState, string> = {
  [ProcessState.NEW]: "bg-blue-500",
  [ProcessState.READY]: "bg-yellow-500",
  [ProcessState.RUNNING]: "bg-green-500",
  [ProcessState.WAITING]: "bg-orange-500",
  [ProcessState.TERMINATED]: "bg-red-500",
};

const VALID_TRANSITIONS: Record<ProcessState, ProcessState[]> = {
  [ProcessState.NEW]: [ProcessState.READY],
  [ProcessState.READY]: [ProcessState.RUNNING],
  [ProcessState.RUNNING]: [ProcessState.READY, ProcessState.WAITING, ProcessState.TERMINATED],
  [ProcessState.WAITING]: [ProcessState.READY],
  [ProcessState.TERMINATED]: [],
};

export default function ProcessPage() {
  const [procs, setProcs] = useState<ProcessControlBlock[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [form, setForm] = useState({ burst: 10, priority: 1, arrival: 0, memory: 256 });
  const [threadBurst, setThreadBurst] = useState(5);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const log = (tag: string, message: string) => {
    setLogs(prev => [{ time: Date.now(), tag, message }, ...prev].slice(0, 100));
  };

  const handleCreate = () => {
    const pid = nextPid(procs);
    const p = createProcess(pid, form.burst, form.priority, form.arrival, form.memory);
    setProcs(prev => [...prev, p]);
    log(`P${pid}`, `Created (burst=${form.burst}, pri=${form.priority}, arr=${form.arrival}, mem=${form.memory})`);
  };

  const handleTransition = (pid: number, target: ProcessState) => {
    setProcs(prev => {
      const next = prev.map(p => p.pid === pid ? { ...p, threads: p.threads.map(t => ({ ...t })) } : p);
      const proc = next.find(p => p.pid === pid);
      if (!proc) return prev;
      const msg = transitionProcess(proc, target);
      if (!msg) return prev;
      return next;
    });
    log(`P${pid}`, `${procs.find(p => p.pid === pid)?.state} → ${target}`);
  };

  const handleAddThread = (pid: number) => {
    const proc = procs.find(p => p.pid === pid);
    if (!proc) return;
    const used = proc.threads.reduce((s, t) => s + t.remainingBurst, 0);
    const remaining = proc.burstTime - used;
    if (remaining <= 0) {
      log(`P${pid}`, `Cannot add thread: process burst budget exhausted (${proc.burstTime} total, ${used} already in threads).`);
      return;
    }
    const burst = Math.min(threadBurst, remaining);
    if (burst < threadBurst) {
      log(`P${pid}`, `Thread burst capped to ${burst} (remaining process budget).`);
    }
    const tid = nextTid(procs);
    setProcs(prev => prev.map(p => {
      if (p.pid !== pid) return p;
      return { ...p, threads: [...p.threads, makeThread(tid, burst)] };
    }));
    log(`P${pid}`, `Thread T${tid} added (burst=${burst}, remaining budget: ${remaining - burst})`);
  };

  const handleClear = () => { setProcs([]); setLogs([]); };

  const toggleExpand = (pid: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Process & Thread Simulator</h1>

      <div className="flex flex-wrap gap-3 items-end">
        {([["Burst", "burst", 1], ["Priority", "priority", 0], ["Arrival", "arrival", 0], ["Memory", "memory", 1]] as const).map(([label, key, min]) => (
          <label key={key} className="space-y-1"><span className="text-xs text-muted-foreground">{label}</span>
            <input type="number" min={min} value={form[key]} onChange={e => setForm({ ...form, [key]: +e.target.value })}
              className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        ))}
        <button onClick={handleCreate} className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create Process</button>
        <button onClick={handleClear} className="px-4 py-1.5 rounded bg-destructive text-white text-sm font-medium hover:opacity-90">Clear All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead className="bg-muted"><tr>{["","PID","State","Burst","Priority","Arrival","Memory","Threads","Actions"].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {procs.map(p => (
              <Fragment key={p.pid}>
                <tr className="border-t border-border">
                  <td className="px-3 py-1.5">
                    {p.threads.length > 0 && (
                      <button onClick={() => toggleExpand(p.pid)} className="text-xs text-muted-foreground hover:text-foreground">
                        {expanded.has(p.pid) ? "▼" : "▶"}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono font-bold">P{p.pid}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${STATE_COLORS[p.state]}`}>{p.state}</span>
                  </td>
                  <td className="px-3 py-1.5">{p.burstTime}</td>
                  <td className="px-3 py-1.5">{p.priority}</td>
                  <td className="px-3 py-1.5">{p.arrivalTime}</td>
                  <td className="px-3 py-1.5">{p.memoryRequirement}</td>
                  <td className="px-3 py-1.5" title="Thread count (burst budget left for new threads)">
                    {p.threads.length}
                    <span className="text-muted-foreground text-xs ml-0.5">
                      ({p.burstTime - p.threads.reduce((s, t) => s + t.remainingBurst, 0)} left)
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {VALID_TRANSITIONS[p.state].map(t => (
                        <button key={t} onClick={() => handleTransition(p.pid, t)}
                          className="px-2 py-0.5 rounded text-xs bg-accent hover:bg-primary hover:text-primary-foreground transition-colors">→{t}</button>
                      ))}
                      <span className="inline-flex items-center gap-1">
                        <input type="number" min={1} value={threadBurst} onChange={e => setThreadBurst(+e.target.value)}
                          className="w-12 px-1 py-0.5 rounded border border-border bg-card text-xs text-center" title="Thread burst time" />
                        <button onClick={() => handleAddThread(p.pid)}
                          className="px-2 py-0.5 rounded text-xs bg-accent hover:bg-primary hover:text-primary-foreground transition-colors">+Thread</button>
                      </span>
                    </div>
                  </td>
                </tr>
                {expanded.has(p.pid) && p.threads.map(t => (
                  <tr key={`${p.pid}-${t.tid}`} className="border-t border-border bg-muted/50">
                    <td className="px-3 py-1" /><td className="px-3 py-1" />
                    <td className="px-3 py-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${STATE_COLORS[t.state]}`}>{t.state}</span>
                    </td>
                    <td className="px-3 py-1" colSpan={6}>
                      <span className="text-xs font-mono text-muted-foreground">T{t.tid} — burst: {t.remainingBurst}</span>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {procs.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No processes. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Event Log</h3>
        <div className="h-44 overflow-y-auto rounded bg-card border border-border p-2 text-xs font-mono space-y-0.5">
          {logs.map((l, i) => (
            <div key={i}><span className="text-muted-foreground">[{l.tag}]</span> {l.message}</div>
          ))}
          {logs.length === 0 && <div className="text-muted-foreground">No events yet</div>}
        </div>
      </div>
    </div>
  );
}
