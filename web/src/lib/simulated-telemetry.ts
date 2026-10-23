import type { ProcessControlBlock, ScheduleResult } from "@/lib/types";

export const DAIOS_TELEMETRY_VERSION = "1.1";

export type SimulatedWorkloadClass = "CPU_BOUND" | "MIXED" | "LIGHTWEIGHT";

export interface SimulatedTelemetrySnapshot {
  schemaVersion: string;
  id: string;
  capturedAt: string;
  source: "MINI_OS_SIMULATOR";
  simulationOnly: true;
  workload: {
    processCount: number;
    totalBurstTime: number;
    averageBurstTime: number;
    maxBurstTime: number;
    minBurstTime: number;
    averagePriority: number;
    averageArrivalTime: number;
    totalMemoryRequirement: number;
    averageThreadsPerProcess: number;
  };
  scheduler: {
    algorithm: string;
    timeQuantum: number | null;
  };
  metrics: {
    simulatedCpuUtilization: number;
    averageWaitingTime: number;
    averageTurnaroundTime: number;
    averageResponseTime: number;
    throughput: number;
    /** Sum of all process-execution Gantt segments. */
    busySimulationTime: number;
    /** Sum of all CPU-idle Gantt segments. */
    idleSimulationTime: number;
    /** Duration represented by the complete Gantt timeline. */
    elapsedSimulationTime: number;
  };
  understanding: {
    workloadClass: SimulatedWorkloadClass;
    confidence: "RULE_BASED";
    explanation: string;
  };
  recommendation: {
    objective: string;
    selectedPolicy: string;
    basis: "SIMULATED_POLICY_COMPARISON";
  };
}

export interface PolicyCandidate {
  algorithmName: string;
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  cpuUtilization: number;
  throughput: number;
}

export interface CaptureTelemetryInput {
  processes: ProcessControlBlock[];
  result: ScheduleResult;
  policies: PolicyCandidate[];
  objective: "waiting" | "response" | "turnaround" | "throughput";
  timeQuantum: number;
}

const STORAGE_KEY = "daios.simulated-telemetry.v1";
const MAX_SNAPSHOTS = 200;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function classifyWorkload(
  processes: ProcessControlBlock[],
  averageBurstTime: number
): SimulatedTelemetrySnapshot["understanding"] {
  if (processes.length === 0) {
    return {
      workloadClass: "LIGHTWEIGHT",
      confidence: "RULE_BASED",
      explanation: "No processes are available in this simulation.",
    };
  }

  const burstVariance = average(
    processes.map((process) => (process.burstTime - averageBurstTime) ** 2)
  );
  const burstStdDev = Math.sqrt(burstVariance);
  const coefficientOfVariation = averageBurstTime > 0 ? burstStdDev / averageBurstTime : 0;

  if (averageBurstTime >= 6 && coefficientOfVariation < 0.8) {
    return {
      workloadClass: "CPU_BOUND",
      confidence: "RULE_BASED",
      explanation:
        "The configured processes have relatively long CPU bursts. This is a simulated CPU-intensive workload profile, not a measurement of physical CPU activity.",
    };
  }

  if (processes.length <= 2 && averageBurstTime < 4) {
    return {
      workloadClass: "LIGHTWEIGHT",
      confidence: "RULE_BASED",
      explanation:
        "The simulation contains few processes with short average bursts. This is a lightweight simulated workload profile.",
    };
  }

  return {
    workloadClass: "MIXED",
    confidence: "RULE_BASED",
    explanation:
      "The process configuration does not meet the current CPU-bound or lightweight rules. It is provisionally labelled mixed; this is a rule-based label, not an ML prediction.",
  };
}

function policyScore(
  policy: PolicyCandidate,
  objective: CaptureTelemetryInput["objective"]
): number {
  switch (objective) {
    case "waiting":
      return policy.avgWaitingTime;
    case "response":
      return policy.avgResponseTime;
    case "turnaround":
      return policy.avgTurnaroundTime;
    case "throughput":
      return -policy.throughput;
  }
}

/** Backward-compatible normalization for snapshots captured before busy time was stored. */
function normalizeSnapshot(value: unknown): SimulatedTelemetrySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<SimulatedTelemetrySnapshot>;
  if (!snapshot.metrics || !snapshot.workload || !snapshot.scheduler || !snapshot.understanding || !snapshot.recommendation) {
    return null;
  }

  const metrics = snapshot.metrics as Partial<SimulatedTelemetrySnapshot["metrics"]>;
  const elapsed = Number(metrics.elapsedSimulationTime ?? 0);
  const idle = Number(metrics.idleSimulationTime ?? 0);
  // Total burst time is the best legacy-compatible estimate of CPU busy time:
  // context-switch overhead is not modeled in this simulator.
  const busy = Number(
    metrics.busySimulationTime ?? snapshot.workload.totalBurstTime ?? Math.max(0, elapsed - idle)
  );
  const safeElapsed = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : busy + idle;
  const safeIdle = Number.isFinite(idle) && idle >= 0 ? idle : Math.max(0, safeElapsed - busy);
  const safeBusy = Number.isFinite(busy) && busy >= 0 ? busy : Math.max(0, safeElapsed - safeIdle);
  const utilization = safeElapsed > 0 ? (safeBusy / safeElapsed) * 100 : 0;

  return {
    ...(snapshot as SimulatedTelemetrySnapshot),
    schemaVersion: snapshot.schemaVersion ?? "1.0",
    metrics: {
      ...metrics,
      simulatedCpuUtilization: Number(metrics.simulatedCpuUtilization ?? utilization),
      averageWaitingTime: Number(metrics.averageWaitingTime ?? 0),
      averageTurnaroundTime: Number(metrics.averageTurnaroundTime ?? 0),
      averageResponseTime: Number(metrics.averageResponseTime ?? 0),
      throughput: Number(metrics.throughput ?? 0),
      busySimulationTime: safeBusy,
      idleSimulationTime: safeIdle,
      elapsedSimulationTime: safeElapsed,
    },
  } as SimulatedTelemetrySnapshot;
}

function getStoredSnapshots(): SimulatedTelemetrySnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSnapshot).filter(
      (snapshot): snapshot is SimulatedTelemetrySnapshot => snapshot !== null
    );
  } catch {
    return [];
  }
}

export function loadSimulatedTelemetry(): SimulatedTelemetrySnapshot[] {
  return getStoredSnapshots();
}

export function clearSimulatedTelemetry(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportSimulatedTelemetryCsv(snapshots: SimulatedTelemetrySnapshot[]): string {
  const headers = [
    "schema_version", "id", "captured_at", "source", "simulation_only",
    "process_count", "total_burst_time", "average_burst_time", "max_burst_time",
    "min_burst_time", "average_priority", "average_arrival_time",
    "total_memory_requirement", "average_threads_per_process", "algorithm", "time_quantum",
    "simulated_cpu_utilization", "average_waiting_time", "average_turnaround_time",
    "average_response_time", "throughput", "cpu_busy_time", "cpu_idle_time",
    "elapsed_simulation_time", "workload_class", "classification_method",
    "classification_explanation", "optimization_objective", "recommended_policy", "recommendation_basis",
  ];

  const escapeCsv = (value: unknown): string => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const rows = snapshots.map((rawSnapshot) => {
    const snapshot = normalizeSnapshot(rawSnapshot) ?? rawSnapshot;
    const values = [
      snapshot.schemaVersion, snapshot.id, snapshot.capturedAt, snapshot.source,
      snapshot.simulationOnly, snapshot.workload.processCount, snapshot.workload.totalBurstTime,
      snapshot.workload.averageBurstTime, snapshot.workload.maxBurstTime, snapshot.workload.minBurstTime,
      snapshot.workload.averagePriority, snapshot.workload.averageArrivalTime,
      snapshot.workload.totalMemoryRequirement, snapshot.workload.averageThreadsPerProcess,
      snapshot.scheduler.algorithm, snapshot.scheduler.timeQuantum,
      snapshot.metrics.simulatedCpuUtilization, snapshot.metrics.averageWaitingTime,
      snapshot.metrics.averageTurnaroundTime, snapshot.metrics.averageResponseTime,
      snapshot.metrics.throughput, snapshot.metrics.busySimulationTime,
      snapshot.metrics.idleSimulationTime, snapshot.metrics.elapsedSimulationTime,
      snapshot.understanding.workloadClass, snapshot.understanding.confidence,
      snapshot.understanding.explanation, snapshot.recommendation.objective,
      snapshot.recommendation.selectedPolicy, snapshot.recommendation.basis,
    ];
    return values.map(escapeCsv).join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

export function createSimulatedTelemetry(input: CaptureTelemetryInput): SimulatedTelemetrySnapshot {
  const { processes, result, policies, objective, timeQuantum } = input;
  if (processes.length === 0 || result.processes.length === 0) {
    throw new Error("Add at least one process before capturing telemetry.");
  }

  const bursts = processes.map((process) => process.burstTime);
  const priorities = processes.map((process) => process.priority);
  const arrivals = processes.map((process) => process.arrivalTime);
  const totalBurstTime = bursts.reduce((sum, value) => sum + value, 0);
  const averageBurstTime = average(bursts);

  // Use the scheduler's Gantt segments as the source of truth for timeline metrics.
  const busySimulationTime = result.gantt
    .filter((segment) => segment.pid >= 0 && Number.isFinite(segment.duration) && segment.duration > 0)
    .reduce((sum, segment) => sum + segment.duration, 0);
  const idleSimulationTime = result.gantt
    .filter((segment) => segment.pid < 0 && Number.isFinite(segment.duration) && segment.duration > 0)
    .reduce((sum, segment) => sum + segment.duration, 0);
  const elapsedSimulationTime = result.gantt
    .filter((segment) => Number.isFinite(segment.duration) && segment.duration > 0)
    .reduce((sum, segment) => sum + segment.duration, 0);
  const simulatedCpuUtilization = elapsedSimulationTime > 0
    ? (busySimulationTime / elapsedSimulationTime) * 100
    : 0;

  const rankedPolicies = [...policies].sort((a, b) => {
    const difference = policyScore(a, objective) - policyScore(b, objective);
    return difference || a.algorithmName.localeCompare(b.algorithmName);
  });
  const recommendedPolicy = rankedPolicies[0];

  const snapshot: SimulatedTelemetrySnapshot = {
    schemaVersion: DAIOS_TELEMETRY_VERSION,
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    source: "MINI_OS_SIMULATOR",
    simulationOnly: true,
    workload: {
      processCount: processes.length,
      totalBurstTime,
      averageBurstTime: round(averageBurstTime),
      maxBurstTime: Math.max(...bursts),
      minBurstTime: Math.min(...bursts),
      averagePriority: round(average(priorities)),
      averageArrivalTime: round(average(arrivals)),
      totalMemoryRequirement: processes.reduce((sum, process) => sum + process.memoryRequirement, 0),
      averageThreadsPerProcess: round(average(processes.map((process) => process.threads.length))),
    },
    scheduler: {
      algorithm: result.algorithmName,
      timeQuantum: result.algorithmName.startsWith("Round Robin") ? timeQuantum : null,
    },
    metrics: {
      simulatedCpuUtilization: round(simulatedCpuUtilization, 2),
      averageWaitingTime: round(result.avgWaitingTime),
      averageTurnaroundTime: round(result.avgTurnaroundTime),
      averageResponseTime: round(result.avgResponseTime),
      throughput: round(result.throughput),
      busySimulationTime: round(busySimulationTime),
      idleSimulationTime: round(idleSimulationTime),
      elapsedSimulationTime: round(elapsedSimulationTime),
    },
    understanding: classifyWorkload(processes, averageBurstTime),
    recommendation: {
      objective,
      selectedPolicy: recommendedPolicy?.algorithmName ?? "NONE",
      basis: "SIMULATED_POLICY_COMPARISON",
    },
  };
  return snapshot;
}

export function saveSimulatedTelemetry(snapshot: SimulatedTelemetrySnapshot): SimulatedTelemetrySnapshot[] {
  if (typeof window === "undefined") return [snapshot];
  const next = [snapshot, ...getStoredSnapshots()].slice(0, MAX_SNAPSHOTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Could not save telemetry in browser storage. Export or clear older snapshots and try again.");
  }
  return next;
}
