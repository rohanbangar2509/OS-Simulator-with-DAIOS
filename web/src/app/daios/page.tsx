"use client";

import { useEffect, useMemo, useState } from "react";
import {
  runFCFS,
  runSJF,
  runRoundRobin,
  runPriority,
  runMLFQ,
} from "@/lib/scheduler";
import type { ProcessControlBlock, ScheduleResult } from "@/lib/types";
import { useWorkload } from "@/lib/workload-context";
import {
  clearSimulatedTelemetry,
  createSimulatedTelemetry,
  exportSimulatedTelemetryCsv,
  loadSimulatedTelemetry,
  saveSimulatedTelemetry,
  type SimulatedTelemetrySnapshot,
} from "@/lib/simulated-telemetry";

type Algorithm = "FCFS" | "SJF" | "Round Robin" | "Priority" | "MLFQ";
type PolicyObjective = "waiting" | "response" | "turnaround" | "throughput";

const algorithms: Algorithm[] = ["FCFS", "SJF", "Round Robin", "Priority", "MLFQ"];

type TimelineSegment = { pid: number; duration: number; start: number; end: number };
type TimelineMetrics = {
  segments: TimelineSegment[];
  busyTime: number;
  idleTime: number;
  elapsedTime: number;
  cpuUtilization: number;
};

/** Derive timeline metrics from the scheduler's Gantt segments, including pid=-1 idle segments. */
function analyzeTimeline(gantt: ScheduleResult["gantt"]): TimelineMetrics {
  let cursor = 0;
  let busyTime = 0;
  let idleTime = 0;
  const segments = gantt
    .filter((segment) => Number.isFinite(segment.duration) && segment.duration > 0)
    .map((segment) => {
      const start = cursor;
      const end = start + segment.duration;
      cursor = end;
      if (segment.pid < 0) idleTime += segment.duration;
      else busyTime += segment.duration;
      return { ...segment, start, end };
    });
  const elapsedTime = cursor;
  return {
    segments,
    busyTime,
    idleTime,
    elapsedTime,
    cpuUtilization: elapsedTime > 0 ? (busyTime / elapsedTime) * 100 : 0,
  };
}

function GanttTimeline({ timeline }: { timeline: TimelineMetrics }) {
  if (timeline.segments.length === 0 || timeline.elapsedTime <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        No execution timeline is available for this workload.
      </div>
    );
  }

  const processColors = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

  return (
    <div className="space-y-2">
      <div className="flex min-h-12 w-full overflow-hidden rounded-lg border border-border bg-muted" aria-label="CPU scheduling Gantt chart">
        {timeline.segments.map((segment, index) => {
          const width = (segment.duration / timeline.elapsedTime) * 100;
          const idle = segment.pid < 0;
          const label = idle ? "IDLE" : `P${segment.pid}`;
          const color = idle ? "#64748b" : processColors[Math.abs(segment.pid - 1) % processColors.length];
          return (
            <div
              key={`${segment.pid}-${segment.start}-${index}`}
              className="flex min-w-0 items-center justify-center border-r border-white/20 px-1 text-xs font-semibold text-white last:border-r-0"
              style={{ width: `${width}%`, minWidth: width > 0 ? "2px" : 0, backgroundColor: color }}
              title={`${label}: ${segment.start}–${segment.end} (${segment.duration} time units)`}
            >
              {width >= 7 ? label : width >= 4 ? (idle ? "—" : `P${segment.pid}`) : null}
            </div>
          );
        })}
      </div>
      <div className="flex w-full items-start text-[10px] font-mono text-muted-foreground" aria-hidden="true">
        {timeline.segments.map((segment, index) => (
          <div key={`${segment.start}-${index}`} className="min-w-0 overflow-visible" style={{ width: `${(segment.duration / timeline.elapsedTime) * 100}%` }}>
            <span>{segment.start}</span>
          </div>
        ))}
        <span className="shrink-0">{timeline.elapsedTime}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" /> Process execution</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500" /> CPU idle (no ready process)</span>
      </div>
    </div>
  );
}

const policyObjectives: { value: PolicyObjective; label: string }[] = [
  { value: "waiting", label: "Minimize average waiting time" },
  { value: "response", label: "Minimize average response time" },
  { value: "turnaround", label: "Minimize average turnaround time" },
  { value: "throughput", label: "Maximize throughput" },
];

function runAlgorithm(
  algorithm: Algorithm,
  quantum: number,
  workload: ProcessControlBlock[]
): ScheduleResult {
  // Always give each scheduler independent process objects so the shared
  // workload in the simulator is not mutated by a comparison run.
  const processes = workload.map((process) => ({
    ...process,
    threads: [...process.threads],
  }));

  switch (algorithm) {
    case "FCFS":
      return runFCFS(processes);
    case "SJF":
      return runSJF(processes);
    case "Round Robin":
      return runRoundRobin(processes, quantum);
    case "Priority":
      return runPriority(processes);
    case "MLFQ":
      return runMLFQ(processes);
  }
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function formatObjectiveValue(
  result: ScheduleResult,
  objective: PolicyObjective
): string {
  switch (objective) {
    case "waiting":
      return result.avgWaitingTime.toFixed(2);
    case "response":
      return result.avgResponseTime.toFixed(2);
    case "turnaround":
      return result.avgTurnaroundTime.toFixed(2);
    case "throughput":
      return result.throughput.toFixed(3);
  }
}

function objectiveDescription(objective: PolicyObjective): string {
  switch (objective) {
    case "waiting":
      return "Lower average waiting time is better.";
    case "response":
      return "Lower average response time is better.";
    case "turnaround":
      return "Lower average turnaround time is better.";
    case "throughput":
      return "Higher throughput is better.";
  }
}

function objectiveScore(result: ScheduleResult, objective: PolicyObjective): number {
  switch (objective) {
    case "waiting":
      return result.avgWaitingTime;
    case "response":
      return result.avgResponseTime;
    case "turnaround":
      return result.avgTurnaroundTime;
    case "throughput":
      return -result.throughput;
  }
}

function downloadCsv(snapshots: SimulatedTelemetrySnapshot[]) {
  const csv = exportSimulatedTelemetryCsv(snapshots);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "daios-simulated-telemetry.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DAIOSPage() {
  const { processes } = useWorkload();
  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [quantum, setQuantum] = useState(3);
  const [objective, setObjective] = useState<PolicyObjective>("waiting");
  const [history, setHistory] = useState<SimulatedTelemetrySnapshot[]>([]);
  const [telemetryMessage, setTelemetryMessage] = useState("");

  // Browser storage is read after mount to avoid server/client rendering mismatch.
  useEffect(() => {
    setHistory(loadSimulatedTelemetry());
  }, []);

  const result = useMemo(() => {
    if (processes.length === 0) return null;
    return runAlgorithm(algorithm, quantum, processes);
  }, [algorithm, quantum, processes]);

  // The Gantt chart is the source of truth for busy, idle, and elapsed time.
  const timeline = useMemo(
    () => analyzeTimeline(result?.gantt ?? []),
    [result]
  );

  const policyResults = useMemo(() => {
    if (processes.length === 0) return [];
    return algorithms.map((name) => runAlgorithm(name, quantum, processes));
  }, [processes, quantum]);

  const rankedPolicies = useMemo(
    () =>
      [...policyResults].sort((a, b) => {
        const difference = objectiveScore(a, objective) - objectiveScore(b, objective);
        return difference || a.algorithmName.localeCompare(b.algorithmName);
      }),
    [policyResults, objective]
  );

  const recommendedPolicy = rankedPolicies[0] ?? null;

  const insights = useMemo(() => {
    if (!result) return [];
    const messages: string[] = [];

    if (result.avgWaitingTime >= 5) {
      messages.push(
        "Average waiting time is relatively high for this workload. Compare other scheduling algorithms."
      );
    } else {
      messages.push(
        "Average waiting time is comparatively low for this run. Compare other policies before drawing conclusions."
      );
    }

    if (result.cpuUtilization < 80) {
      messages.push(
        "Calculated simulated CPU utilization is below 80%. Inspect the Gantt chart for idle time and late process arrivals."
      );
    } else {
      messages.push(
        "Calculated simulated CPU utilization is high for this run. Compare response and waiting times to evaluate fairness."
      );
    }

    const longestWaiting = [...result.processes].sort(
      (a, b) => b.waitingTime - a.waitingTime
    )[0];

    if (longestWaiting) {
      messages.push(
        `Process P${longestWaiting.pid} has the highest waiting time (${longestWaiting.waitingTime} simulated time units).`
      );
    }

    return messages;
  }, [result]);

  function captureSnapshot() {
    if (!result || processes.length === 0) {
      setTelemetryMessage("Add at least one process before capturing telemetry.");
      return;
    }

    try {
      const snapshot = createSimulatedTelemetry({
        processes,
        result,
        policies: policyResults.map((policy) => {
          const policyTimeline = analyzeTimeline(policy.gantt);
          return {
            algorithmName: policy.algorithmName,
            avgWaitingTime: policy.avgWaitingTime,
            avgTurnaroundTime: policy.avgTurnaroundTime,
            avgResponseTime: policy.avgResponseTime,
            cpuUtilization: policyTimeline.cpuUtilization,
            throughput: policy.throughput,
            busySimulationTime: policyTimeline.busyTime,
            idleSimulationTime: policyTimeline.idleTime,
            elapsedSimulationTime: policyTimeline.elapsedTime,
          };
        }),
        objective,
        timeQuantum: quantum,
      });
      setHistory(saveSimulatedTelemetry(snapshot));
      setTelemetryMessage(
        `Captured simulated telemetry. Rule-based workload label: ${snapshot.understanding.workloadClass}.`
      );
    } catch (error) {
      setTelemetryMessage(
        error instanceof Error ? error.message : "Unable to capture simulated telemetry."
      );
    }
  }

  function clearHistory() {
    clearSimulatedTelemetry();
    setHistory([]);
    setTelemetryMessage("Simulated telemetry history cleared.");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          DAIOS · Prototype 0.5
        </p>
        <h1 className="mt-2 text-3xl font-bold">Data-Aware Operating System</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Analyze simulated workloads, compare scheduling policies, inspect bottlenecks,
          and save structured telemetry for later analysis.
        </p>
      </header>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
        <p className="font-semibold">Simulation-only telemetry</p>
        <p className="mt-1 text-sm text-muted-foreground">
          DAIOS uses the shared Mini OS Simulator workload. Metrics describe simulated
          operations, not your physical computer. Snapshots are stored in this browser
          and can be exported as CSV. Workload labels are provisional rule-based labels,
          not ML predictions.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shared workload</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Processes currently configured in CPU Scheduling
          </p>
          <p className="mt-2 font-mono text-2xl font-bold">{processes.length}</p>
          {processes.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2">PID</th>
                    <th className="px-3 py-2">Burst</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Arrival</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((process) => (
                    <tr key={process.pid} className="border-t border-border">
                      <td className="px-3 py-2">P{process.pid}</td>
                      <td className="px-3 py-2">{process.burstTime}</td>
                      <td className="px-3 py-2">{process.priority}</td>
                      <td className="px-3 py-2">{process.arrivalTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No processes are configured. Add processes in the CPU Scheduling Laboratory
              to generate simulated workload telemetry.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Workload analysis</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Scheduling algorithm</span>
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as Algorithm)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              disabled={!result}
            >
              {algorithms.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          {algorithm === "Round Robin" && (
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">Time quantum</span>
              <input
                type="number"
                min={1}
                step={1}
                value={quantum}
                onChange={(event) =>
                  setQuantum(Math.max(1, Math.floor(Number(event.target.value) || 1)))
                }
                className="block w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
          )}

          <button
            onClick={captureSnapshot}
            disabled={!result}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Capture telemetry
          </button>
        </div>
        {telemetryMessage && <p role="status" className="text-sm text-muted-foreground">{telemetryMessage}</p>}
      </section>

      {result && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Simulated OS metrics</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Simulated CPU utilization" value={`${timeline.cpuUtilization.toFixed(1)}%`} description="Busy time ÷ elapsed time from the Gantt timeline" />
              <MetricCard label="Average waiting time" value={result.avgWaitingTime.toFixed(2)} description="Simulated time units" />
              <MetricCard label="Average turnaround" value={result.avgTurnaroundTime.toFixed(2)} description="Simulated time units" />
              <MetricCard label="Average response" value={result.avgResponseTime.toFixed(2)} description="Simulated time units" />
              <MetricCard label="Throughput" value={result.throughput.toFixed(3)} description="Processes per simulated time unit" />
              <MetricCard label="Processes analyzed" value={String(result.processes.length)} description={`Current policy: ${result.algorithmName}`} />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">CPU timeline analysis</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Timeline values are calculated from the selected scheduler's Gantt segments. Gray intervals represent time when no process was running.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricCard label="CPU busy time" value={`${timeline.busyTime.toFixed(2)} units`} description="Sum of process execution segments" />
              <MetricCard label="CPU idle time" value={`${timeline.idleTime.toFixed(2)} units`} description="Sum of idle segments between arrivals" />
              <MetricCard label="Elapsed time" value={`${timeline.elapsedTime.toFixed(2)} units`} description="Busy time + idle time across the timeline" />
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Gantt chart · {result.algorithmName}</h3>
                <span className="text-xs text-muted-foreground">CPU utilization: {timeline.cpuUtilization.toFixed(2)}%</span>
              </div>
              <GanttTimeline timeline={timeline} />
              <p className="mt-3 text-xs text-muted-foreground">
                Utilization = busy time ÷ elapsed time × 100. Context-switch overhead is not modeled in this simulation.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Observe · Compare · Recommend</p>
              <h2 className="mt-1 text-lg font-semibold">DAIOS Policy Advisor</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Evaluate all five policies on the same workload. Timeline metrics are recalculated from each policy’s own Gantt segments.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Optimization objective</span>
                <select
                  value={objective}
                  onChange={(event) => setObjective(event.target.value as PolicyObjective)}
                  className="block w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {policyObjectives.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-muted-foreground">{objectiveDescription(objective)}</p>
            </div>

            {recommendedPolicy && (
              <div className="rounded-xl border border-primary/40 bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Recommended policy · Rank 1</p>
                <h3 className="mt-2 text-2xl font-bold">{recommendedPolicy.algorithmName}</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard label="Selected objective" value={formatObjectiveValue(recommendedPolicy, objective)} description={objective === "throughput" ? "Processes per simulated time unit" : "Simulated time units"} />
                  <MetricCard label="Simulated CPU utilization" value={`${recommendedPolicy.cpuUtilization.toFixed(1)}%`} description="Simulated CPU busy time" />
                  <MetricCard label="Average waiting time" value={recommendedPolicy.avgWaitingTime.toFixed(2)} description="Across configured processes" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  This recommendation uses the selected simulated metric. It is not an ML prediction or an autonomous decision affecting your physical computer.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    {["Rank", "Policy", "Avg wait", "Avg response", "Avg turnaround", "Busy time", "Idle time", "Elapsed", "CPU utilization", "Throughput", "Objective score"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankedPolicies.map((policy, index) => (
                    <tr key={policy.algorithmName} className={`border-t border-border ${index === 0 ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-3 font-mono">{index + 1}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium">
                        {policy.algorithmName}{index === 0 && <span className="ml-2 text-xs font-semibold text-primary">Best</span>}
                      </td>
                      <td className="px-3 py-3">{policy.avgWaitingTime.toFixed(2)}</td>
                      <td className="px-3 py-3">{policy.avgResponseTime.toFixed(2)}</td>
                      <td className="px-3 py-3">{policy.avgTurnaroundTime.toFixed(2)}</td>
                      <td className="px-3 py-3">{analyzeTimeline(policy.gantt).busyTime.toFixed(2)}</td>
                      <td className="px-3 py-3">{analyzeTimeline(policy.gantt).idleTime.toFixed(2)}</td>
                      <td className="px-3 py-3">{analyzeTimeline(policy.gantt).elapsedTime.toFixed(2)}</td>
                      <td className="px-3 py-3">{analyzeTimeline(policy.gantt).cpuUtilization.toFixed(1)}%</td>
                      <td className="px-3 py-3">{policy.throughput.toFixed(3)}</td>
                      <td className="px-3 py-3 font-mono font-semibold">{formatObjectiveValue(policy, objective)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Ranking optimizes one objective at a time. It does not account for every trade-off, context-switch overhead, real hardware measurements, or all operating-system scheduling constraints. MLFQ uses the fixed queue quanta configured in the scheduler.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">DAIOS workload observations</h2>
            <div className="space-y-2">
              {insights.map((message, index) => (
                <div key={index} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <span className="mr-2 font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>
                  {message}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These are rule-based observations from simulation metrics, not ML predictions or autonomous resource-control decisions.
            </p>
          </section>
        </>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Telemetry history</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Structured snapshots persist in this browser (up to 200 entries). Export them to CSV for analysis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadCsv(history)}
              disabled={history.length === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
            >
              Export CSV
            </button>
            <button
              onClick={clearHistory}
              disabled={history.length === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
            >
              Clear history
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No snapshots yet. Select a scheduling algorithm and click Capture telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  {["Captured", "Algorithm", "Processes", "CPU % (simulated)", "Busy time", "Idle time", "Elapsed", "Avg wait", "Avg response", "Avg TAT", "Throughput", "Workload class"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((snapshot) => (
                  <tr key={snapshot.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">{new Date(snapshot.capturedAt).toLocaleString()}</td>
                    <td className="whitespace-nowrap px-3 py-2">{snapshot.scheduler.algorithm}</td>
                    <td className="px-3 py-2">{snapshot.workload.processCount}</td>
                    <td className="px-3 py-2">{snapshot.metrics.simulatedCpuUtilization.toFixed(1)}%</td>
                    <td className="whitespace-nowrap px-3 py-2">{snapshot.metrics.busySimulationTime.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{snapshot.metrics.idleSimulationTime.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{snapshot.metrics.elapsedSimulationTime.toFixed(2)}</td>
                    <td className="px-3 py-2">{snapshot.metrics.averageWaitingTime.toFixed(2)}</td>
                    <td className="px-3 py-2">{snapshot.metrics.averageResponseTime.toFixed(2)}</td>
                    <td className="px-3 py-2">{snapshot.metrics.averageTurnaroundTime.toFixed(2)}</td>
                    <td className="px-3 py-2">{snapshot.metrics.throughput.toFixed(3)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{snapshot.understanding.workloadClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
