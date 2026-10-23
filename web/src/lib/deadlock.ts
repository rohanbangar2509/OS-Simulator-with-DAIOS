export interface RAGState {
  processes: number[];
  resources: number[];
  assignments: Map<number, number>;  // rid -> pid
  requests: Map<number, Set<number>>; // pid -> set of rid
}

export function createRAG(): RAGState {
  return { processes: [], resources: [], assignments: new Map(), requests: new Map() };
}

export function detectCycle(rag: RAGState): number[] | null {
  const color = new Map<number, number>();
  for (const p of rag.processes) color.set(p, 0);

  const path: number[] = [];

  function dfs(pid: number): number[] | null {
    color.set(pid, 1);
    path.push(pid);
    const reqs = rag.requests.get(pid);
    if (reqs) {
      for (const rid of reqs) {
        const holder = rag.assignments.get(rid);
        if (holder !== undefined && holder !== pid) {
          if (color.get(holder) === 1) {
            const cycle: number[] = [];
            let found = false;
            for (const p of path) { if (p === holder) found = true; if (found) cycle.push(p); }
            cycle.push(holder);
            return cycle;
          }
          if (color.get(holder) === 0) {
            const result = dfs(holder);
            if (result) return result;
          }
        }
      }
    }
    path.pop();
    color.set(pid, 2);
    return null;
  }

  for (const p of rag.processes) {
    if (color.get(p) === 0) {
      const result = dfs(p);
      if (result) return result;
    }
  }
  return null;
}

export interface BankersInput {
  n: number; m: number;
  allocation: number[][];
  max: number[][];
  available: number[];
}

export interface BankersStep {
  round: number;
  process: number;
  need: number[];
  work: number[];
  canRun: boolean;
  selected: boolean;
  workAfter: number[];
  skippedProcesses: { pid: number; need: number[]; reason: string }[];
}

export interface BankersResult {
  safe: boolean;
  sequence: number[];
  steps: BankersStep[];
  need: number[][];
}

export function bankersSafe(input: BankersInput): BankersResult {
  const { n, m, allocation, max, available } = input;
  const need = Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => max[i][j] - allocation[i][j])
  );
  const work = [...available];
  const finish = new Array(n).fill(false);
  const seq: number[] = [];
  const steps: BankersStep[] = [];

  for (let round = 0; round < n; round++) {
    let found = false;
    const skipped: { pid: number; need: number[]; reason: string }[] = [];

    for (let i = 0; i < n; i++) {
      if (finish[i]) continue;

      let canRun = true;
      const failIdx: number[] = [];
      for (let j = 0; j < m; j++) {
        if (need[i][j] > work[j]) { canRun = false; failIdx.push(j); }
      }

      if (canRun) {
        const workBefore = [...work];
        for (let j = 0; j < m; j++) work[j] += allocation[i][j];
        finish[i] = true;
        seq.push(i);

        steps.push({
          round: round + 1,
          process: i,
          need: [...need[i]],
          work: workBefore,
          canRun: true,
          selected: true,
          workAfter: [...work],
          skippedProcesses: [...skipped],
        });
        found = true;
        break;
      } else {
        const reason = failIdx.map(j => `Need[${j}]=${need[i][j]} > Work[${j}]=${work[j]}`).join(", ");
        skipped.push({ pid: i, need: [...need[i]], reason });
      }
    }

    if (!found) {
      steps.push({
        round: round + 1,
        process: -1,
        need: [],
        work: [...work],
        canRun: false,
        selected: false,
        workAfter: [...work],
        skippedProcesses: [...skipped],
      });
      return { safe: false, sequence: [], steps, need };
    }
  }
  return { safe: true, sequence: seq, steps, need };
}

export const bankersDemo: BankersInput = {
  n: 5, m: 3,
  allocation: [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
  max: [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],
  available: [3,3,2],
};
