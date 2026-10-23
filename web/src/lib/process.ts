import { ProcessControlBlock, ThreadControlBlock, ProcessState, LogEntry } from "./types";

export function nextPid(procs: ProcessControlBlock[]): number {
  return procs.length > 0 ? Math.max(...procs.map(p => p.pid)) + 1 : 1;
}

export function nextTid(procs: ProcessControlBlock[]): number {
  const allTids = procs.flatMap(p => p.threads.map(t => t.tid));
  return allTids.length > 0 ? Math.max(...allTids) + 1 : 1;
}

export function createProcess(
  pid: number, burst: number, priority: number, arrival: number, memory: number
): ProcessControlBlock {
  return {
    pid,
    state: ProcessState.NEW,
    burstTime: burst,
    priority,
    arrivalTime: arrival,
    memoryRequirement: memory,
    threads: [],
    remainingBurst: burst,
    waitingTime: 0,
    turnaroundTime: 0,
    responseTime: -1,
    completionTime: 0,
    startTime: -1,
  };
}

export function makeThread(tid: number, burst: number): ThreadControlBlock {
  return { tid, state: ProcessState.READY, remainingBurst: burst };
}

export function transitionProcess(proc: ProcessControlBlock, target: ProcessState): string | null {
  const valid: Record<string, ProcessState[]> = {
    [ProcessState.NEW]: [ProcessState.READY],
    [ProcessState.READY]: [ProcessState.RUNNING],
    [ProcessState.RUNNING]: [ProcessState.READY, ProcessState.WAITING, ProcessState.TERMINATED],
    [ProcessState.WAITING]: [ProcessState.READY],
    [ProcessState.TERMINATED]: [],
  };
  if (!valid[proc.state]?.includes(target)) return null;
  const from = proc.state;
  proc.state = target;
  for (const t of proc.threads) {
    if (target === ProcessState.TERMINATED) t.state = ProcessState.TERMINATED;
    else if (target === ProcessState.READY) t.state = ProcessState.READY;
  }
  return `${from} → ${target}`;
}
