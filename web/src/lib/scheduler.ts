import { ProcessControlBlock, ScheduleResult } from "./types";

function cloneProcs(procs: ProcessControlBlock[]): ProcessControlBlock[] {
  return procs.map((p) => ({ ...p, threads: [...p.threads] }));
}

function reset(procs: ProcessControlBlock[]) {
  for (const p of procs) {
    p.remainingBurst = p.burstTime;
    p.waitingTime = 0;
    p.turnaroundTime = 0;
    p.responseTime = -1;
    p.completionTime = 0;
    p.startTime = -1;
  }
}

function metrics(name: string, procs: ProcessControlBlock[], totalTime: number): ScheduleResult {
  const n = procs.length;
  let sumW = 0, sumT = 0, sumR = 0, totalBurst = 0;
  for (const p of procs) {
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    sumW += p.waitingTime;
    sumT += p.turnaroundTime;
    sumR += p.responseTime >= 0 ? p.responseTime : 0;
    totalBurst += p.burstTime;
  }
  return {
    algorithmName: name,
    avgWaitingTime: sumW / n,
    avgTurnaroundTime: sumT / n,
    avgResponseTime: sumR / n,
    cpuUtilization: totalTime > 0 ? (100 * totalBurst) / totalTime : 0,
    throughput: totalTime > 0 ? n / totalTime : 0,
    gantt: [],
    processes: procs,
  };
}

export function runFCFS(input: ProcessControlBlock[]): ScheduleResult {
  const procs = cloneProcs(input);
  reset(procs);
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
  let time = 0;
  const gantt: { pid: number; duration: number }[] = [];
  for (const p of procs) {
    if (time < p.arrivalTime) { gantt.push({ pid: -1, duration: p.arrivalTime - time }); time = p.arrivalTime; }
    p.startTime = time;
    p.responseTime = time - p.arrivalTime;
    gantt.push({ pid: p.pid, duration: p.burstTime });
    time += p.burstTime;
    p.completionTime = time;
  }
  const r = metrics("FCFS", procs, time);
  r.gantt = gantt;
  return r;
}

export function runSJF(input: ProcessControlBlock[]): ScheduleResult {
  const procs = cloneProcs(input);
  reset(procs);
  const n = procs.length;
  let completed = 0, time = 0;
  const done = new Array(n).fill(false);
  const gantt: { pid: number; duration: number }[] = [];
  while (completed < n) {
    let idx = -1, minB = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && procs[i].arrivalTime <= time && procs[i].remainingBurst < minB) {
        minB = procs[i].remainingBurst; idx = i;
      }
    }
    if (idx === -1) {
      let next = Infinity;
      for (let i = 0; i < n; i++) if (!done[i]) next = Math.min(next, procs[i].arrivalTime);
      gantt.push({ pid: -1, duration: next - time }); time = next; continue;
    }
    procs[idx].startTime = time;
    procs[idx].responseTime = time - procs[idx].arrivalTime;
    gantt.push({ pid: procs[idx].pid, duration: procs[idx].burstTime });
    time += procs[idx].burstTime;
    procs[idx].completionTime = time;
    procs[idx].remainingBurst = 0;
    done[idx] = true;
    completed++;
  }
  const r = metrics("SJF", procs, time);
  r.gantt = gantt;
  return r;
}

export function runRoundRobin(input: ProcessControlBlock[], quantum: number): ScheduleResult {
  const procs = cloneProcs(input);
  reset(procs);
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
  const n = procs.length;
  const readyQ: number[] = [];
  const inQueue = new Array(n).fill(false);
  const gantt: { pid: number; duration: number }[] = [];
  let time = 0, completed = 0, nxt = 0;
  while (nxt < n && procs[nxt].arrivalTime <= time) { readyQ.push(nxt); inQueue[nxt] = true; nxt++; }
  while (completed < n) {
    if (readyQ.length === 0) {
      let next = Infinity;
      for (let i = 0; i < n; i++) if (procs[i].remainingBurst > 0 && !inQueue[i]) next = Math.min(next, procs[i].arrivalTime);
      gantt.push({ pid: -1, duration: next - time }); time = next;
      while (nxt < n && procs[nxt].arrivalTime <= time) { readyQ.push(nxt); inQueue[nxt] = true; nxt++; }
      continue;
    }
    const cur = readyQ.shift()!;
    if (procs[cur].responseTime < 0) procs[cur].responseTime = time - procs[cur].arrivalTime;
    const run = Math.min(quantum, procs[cur].remainingBurst);
    gantt.push({ pid: procs[cur].pid, duration: run });
    time += run;
    procs[cur].remainingBurst -= run;
    while (nxt < n && procs[nxt].arrivalTime <= time) { readyQ.push(nxt); inQueue[nxt] = true; nxt++; }
    if (procs[cur].remainingBurst > 0) { readyQ.push(cur); }
    else { procs[cur].completionTime = time; completed++; }
  }
  const r = metrics(`Round Robin (q=${quantum})`, procs, time);
  r.gantt = gantt;
  return r;
}

export function runPriority(input: ProcessControlBlock[]): ScheduleResult {
  const procs = cloneProcs(input);
  reset(procs);
  const n = procs.length;
  let completed = 0, time = 0;
  const done = new Array(n).fill(false);
  const gantt: { pid: number; duration: number }[] = [];
  while (completed < n) {
    let idx = -1, bestPri = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && procs[i].arrivalTime <= time) {
        if (procs[i].priority < bestPri || (procs[i].priority === bestPri && idx >= 0 && procs[i].arrivalTime < procs[idx].arrivalTime)) {
          bestPri = procs[i].priority; idx = i;
        }
      }
    }
    if (idx === -1) {
      let next = Infinity;
      for (let i = 0; i < n; i++) if (!done[i]) next = Math.min(next, procs[i].arrivalTime);
      gantt.push({ pid: -1, duration: next - time }); time = next; continue;
    }
    procs[idx].startTime = time;
    procs[idx].responseTime = time - procs[idx].arrivalTime;
    gantt.push({ pid: procs[idx].pid, duration: procs[idx].burstTime });
    time += procs[idx].burstTime;
    procs[idx].completionTime = time;
    done[idx] = true;
    completed++;
  }
  const r = metrics("Priority", procs, time);
  r.gantt = gantt;
  return r;
}

export function runMLFQ(input: ProcessControlBlock[]): ScheduleResult {
  const procs = cloneProcs(input);
  reset(procs);
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
  const n = procs.length;
  const NUM_Q = 3, quanta = [4, 8, 16];
  const queues: number[][] = [[], [], []];
  const inQueue = new Array(n).fill(false);
  const gantt: { pid: number; duration: number }[] = [];
  let time = 0, completed = 0, nxt = 0;
  const enqueue = () => { while (nxt < n && procs[nxt].arrivalTime <= time) { queues[0].push(nxt); inQueue[nxt] = true; nxt++; } };
  enqueue();
  while (completed < n) {
    let chosenQ = -1;
    for (let q = 0; q < NUM_Q; q++) { if (queues[q].length > 0) { chosenQ = q; break; } }
    if (chosenQ === -1) {
      let next = Infinity;
      for (let i = 0; i < n; i++) if (procs[i].remainingBurst > 0 && !inQueue[i]) next = Math.min(next, procs[i].arrivalTime);
      if (next === Infinity) break;
      gantt.push({ pid: -1, duration: next - time }); time = next; enqueue(); continue;
    }
    const cur = queues[chosenQ].shift()!;
    if (procs[cur].responseTime < 0) procs[cur].responseTime = time - procs[cur].arrivalTime;
    const run = Math.min(quanta[chosenQ], procs[cur].remainingBurst);
    gantt.push({ pid: procs[cur].pid, duration: run });
    time += run;
    procs[cur].remainingBurst -= run;
    enqueue();
    if (procs[cur].remainingBurst > 0) {
      const nextLevel = Math.min(chosenQ + 1, NUM_Q - 1);
      queues[nextLevel].push(cur);
    } else { procs[cur].completionTime = time; inQueue[cur] = false; completed++; }
  }
  const r = metrics("MLFQ (q=4,8,16)", procs, time);
  r.gantt = gantt;
  return r;
}

export const sampleWorkload: () => ProcessControlBlock[] = () => [
  { pid: 1, arrivalTime: 0, burstTime: 6, priority: 2 },
  { pid: 2, arrivalTime: 1, burstTime: 8, priority: 1 },
  { pid: 3, arrivalTime: 2, burstTime: 7, priority: 4 },
  { pid: 4, arrivalTime: 3, burstTime: 3, priority: 3 },
  { pid: 5, arrivalTime: 4, burstTime: 4, priority: 5 },
].map((p) => ({
  ...p, state: "NEW" as never, memoryRequirement: 0, threads: [],
  remainingBurst: p.burstTime, waitingTime: 0, turnaroundTime: 0,
  responseTime: -1, completionTime: 0, startTime: -1,
}));
