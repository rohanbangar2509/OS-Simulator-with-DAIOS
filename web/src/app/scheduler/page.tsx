"use client";
import { useState, useMemo } from "react";
import { ProcessControlBlock, ScheduleResult, createPCB } from "@/lib/types";
import { useWorkload } from "@/lib/workload-context";
import { runFCFS, runSJF, runRoundRobin, runPriority, runMLFQ } from "@/lib/scheduler";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LearningGuide } from "@/components/LearningGuide";

const ALGO_NAMES = ["FCFS", "SJF", "Round Robin", "Priority", "MLFQ"];
const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

function GanttChart({ gantt }: { gantt: { pid: number; duration: number }[] }) {
  const total = gantt.reduce((s, g) => s + g.duration, 0);
  let t = 0;
  return (
    <div className="mt-3">
      <div className="flex h-10 rounded overflow-hidden border border-border">
        {gantt.map((g, i) => {
          const w = (g.duration / total) * 100;
          const s = t; t += g.duration;
          return (
            <div key={i} className="relative flex items-center justify-center text-xs font-mono text-white"
              style={{ width: `${w}%`, backgroundColor: g.pid < 0 ? "#64748b" : COLORS[g.pid % COLORS.length], minWidth: g.duration > 0 ? 2 : 0 }}
              title={`${g.pid < 0 ? "Idle" : `P${g.pid}`}: ${s}-${s + g.duration}`}>
              {w > 5 && (g.pid < 0 ? "—" : `P${g.pid}`)}
            </div>
          );
        })}
      </div>
      <div className="flex text-[10px] text-muted-foreground font-mono mt-0.5">
        {(() => { let acc = 0; return gantt.map((g, i) => { const left = acc; acc += g.duration; return <span key={i} style={{ width: `${(g.duration / total) * 100}%` }}>{left}</span>; }); })()}
        <span>{total}</span>
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  const { processes: procs, setProcesses: setProcs, resetWorkload } = useWorkload();
  const [quantum, setQuantum] = useState(3);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ burst: 5, priority: 1, arrival: 0 });

  const results = useMemo<ScheduleResult[]>(() => [
    runFCFS(procs), runSJF(procs), runRoundRobin(procs, quantum), runPriority(procs), runMLFQ(procs)
  ], [procs, quantum]);

  const addProcess = () => {
    const pid = procs.length > 0 ? Math.max(...procs.map(p => p.pid)) + 1 : 1;
    setProcs([...procs, createPCB(pid, form.burst, form.priority, form.arrival, 0)]);
  };

  const compareData = results.map(r => ({
    name: r.algorithmName.length > 10 ? r.algorithmName.slice(0, 10) + "…" : r.algorithmName,
    "Avg Wait": +r.avgWaitingTime.toFixed(2),
    "Avg TAT": +r.avgTurnaroundTime.toFixed(2),
    "Avg Resp": +r.avgResponseTime.toFixed(2),
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">CPU Scheduling Laboratory</h1>
      <LearningGuide module="scheduler" />

      <div className="flex flex-wrap gap-3 items-end">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Burst</span>
          <input type="number" min={1} value={form.burst} onChange={e => setForm({ ...form, burst: +e.target.value })}
            className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Priority</span>
          <input type="number" min={0} value={form.priority} onChange={e => setForm({ ...form, priority: +e.target.value })}
            className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Arrival</span>
          <input type="number" min={0} value={form.arrival} onChange={e => setForm({ ...form, arrival: +e.target.value })}
            className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        <button onClick={addProcess} className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add</button>
        <button onClick={resetWorkload} className="px-4 py-1.5 rounded bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-80">Load Sample</button>
        <button onClick={() => setProcs([])} className="px-4 py-1.5 rounded bg-destructive text-white text-sm font-medium hover:opacity-90">Clear</button>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">RR Quantum</span>
          <input type="number" min={1} value={quantum} onChange={e => setQuantum(+e.target.value)}
            className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
      </div>

      {procs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted"><tr>{["PID","Burst","Priority","Arrival",""].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{procs.map(p => (
              <tr key={p.pid} className="border-t border-border">
                <td className="px-3 py-1.5 font-mono">P{p.pid}</td>
                <td className="px-3 py-1.5">{p.burstTime}</td>
                <td className="px-3 py-1.5">{p.priority}</td>
                <td className="px-3 py-1.5">{p.arrivalTime}</td>
                <td className="px-3 py-1.5"><button onClick={() => setProcs(procs.filter(x => x.pid !== p.pid))} className="text-destructive text-xs hover:underline">Remove</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {[...ALGO_NAMES, "Compare All"].map((name, i) => (
          <button key={name} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {name}
          </button>
        ))}
      </div>

      {tab < 5 && results[tab] && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["Avg Wait", results[tab].avgWaitingTime.toFixed(2)],
              ["Avg TAT", results[tab].avgTurnaroundTime.toFixed(2)],
              ["Avg Response", results[tab].avgResponseTime.toFixed(2)],
              ["CPU Util", results[tab].cpuUtilization.toFixed(1) + "%"],
              ["Throughput", results[tab].throughput.toFixed(3)],
            ].map(([l, v]) => (
              <div key={l} className="p-3 rounded-lg bg-card border border-border">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="text-xl font-bold font-mono">{v}</p>
              </div>
            ))}
          </div>
          <div><h3 className="font-semibold text-sm mb-1">Gantt Chart</h3><GanttChart gantt={results[tab].gantt} /></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted"><tr>{["PID","Burst","Arrival","Start","Completion","Wait","TAT","Response"].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>{results[tab].processes.map(p => (
                <tr key={p.pid} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono">P{p.pid}</td>
                  <td className="px-3 py-1.5">{p.burstTime}</td><td className="px-3 py-1.5">{p.arrivalTime}</td>
                  <td className="px-3 py-1.5">{p.startTime >= 0 ? p.startTime : "—"}</td><td className="px-3 py-1.5">{p.completionTime}</td>
                  <td className="px-3 py-1.5">{p.waitingTime}</td><td className="px-3 py-1.5">{p.turnaroundTime}</td>
                  <td className="px-3 py-1.5">{p.responseTime >= 0 ? p.responseTime : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 5 && (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Avg Wait" fill="#3b82f6" />
              <Bar dataKey="Avg TAT" fill="#22c55e" />
              <Bar dataKey="Avg Resp" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
