"use client";
import { useState, useMemo, useCallback } from "react";
import { BankersInput, BankersResult, bankersSafe, bankersDemo, createRAG, detectCycle, RAGState } from "@/lib/deadlock";

function RAGTab() {
  const [rag, setRag] = useState<RAGState>(createRAG());
  const [nextP, setNextP] = useState(0);
  const [nextR, setNextR] = useState(0);
  const [reqPid, setReqPid] = useState(0);
  const [reqRid, setReqRid] = useState(0);
  const [asgPid, setAsgPid] = useState(0);
  const [asgRid, setAsgRid] = useState(0);

  const cycle = useMemo(() => detectCycle(rag), [rag]);

  const addProcess = () => {
    setRag(prev => {
      const s: RAGState = { ...prev, processes: [...prev.processes, nextP], requests: new Map(prev.requests), assignments: new Map(prev.assignments) };
      setNextP(nextP + 1);
      return s;
    });
  };
  const addResource = () => {
    setRag(prev => {
      const s: RAGState = { ...prev, resources: [...prev.resources, nextR], requests: new Map(prev.requests), assignments: new Map(prev.assignments) };
      setNextR(nextR + 1);
      return s;
    });
  };
  const addRequest = () => {
    setRag(prev => {
      const s: RAGState = { ...prev, processes: [...prev.processes], resources: [...prev.resources], requests: new Map(prev.requests), assignments: new Map(prev.assignments) };
      if (!s.requests.has(reqPid)) s.requests.set(reqPid, new Set());
      s.requests.get(reqPid)!.add(reqRid);
      return s;
    });
  };
  const addAssignment = () => {
    setRag(prev => {
      const s: RAGState = { ...prev, processes: [...prev.processes], resources: [...prev.resources], requests: new Map(prev.requests), assignments: new Map(prev.assignments) };
      s.assignments.set(asgRid, asgPid);
      return s;
    });
  };
  const loadDemo = () => {
    const s: RAGState = { processes: [0, 1, 2], resources: [0, 1, 2], assignments: new Map([[0, 1], [1, 2], [2, 0]]), requests: new Map([[0, new Set([0])], [1, new Set([1])], [2, new Set([2])]]) };
    setRag(s); setNextP(3); setNextR(3);
  };
  const reset = () => { setRag(createRAG()); setNextP(0); setNextR(0); };

  const radius = 120, cx = 180, cy = 160;
  const all = [...rag.processes.map(p => ({ id: p, type: "P" as const })), ...rag.resources.map(r => ({ id: r, type: "R" as const }))];
  const positions = new Map<string, { x: number; y: number }>();
  all.forEach((n, i) => {
    const a = (2 * Math.PI * i) / Math.max(all.length, 1) - Math.PI / 2;
    positions.set(`${n.type}${n.id}`, { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={addProcess} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">+ Process P{nextP}</button>
        <button onClick={addResource} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">+ Resource R{nextR}</button>
        <div className="flex items-center gap-1 text-xs">
          P<input type="number" min={0} value={reqPid} onChange={e => setReqPid(+e.target.value)} className="w-12 px-1 py-0.5 rounded border border-border bg-card text-xs" />
          →R<input type="number" min={0} value={reqRid} onChange={e => setReqRid(+e.target.value)} className="w-12 px-1 py-0.5 rounded border border-border bg-card text-xs" />
          <button onClick={addRequest} className="px-2 py-0.5 rounded bg-accent text-xs font-medium hover:bg-primary hover:text-primary-foreground">Request</button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          R<input type="number" min={0} value={asgRid} onChange={e => setAsgRid(+e.target.value)} className="w-12 px-1 py-0.5 rounded border border-border bg-card text-xs" />
          →P<input type="number" min={0} value={asgPid} onChange={e => setAsgPid(+e.target.value)} className="w-12 px-1 py-0.5 rounded border border-border bg-card text-xs" />
          <button onClick={addAssignment} className="px-2 py-0.5 rounded bg-accent text-xs font-medium hover:bg-primary hover:text-primary-foreground">Assign</button>
        </div>
        <button onClick={loadDemo} className="px-3 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">Demo (Cycle)</button>
        <button onClick={reset} className="px-3 py-1 rounded bg-destructive text-white text-xs font-medium">Reset</button>
      </div>

      {cycle && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-sm">
          <span className="font-bold text-destructive">Deadlock detected!</span> Cycle: {cycle.map(p => `P${p}`).join(" → ")}
        </div>
      )}
      {!cycle && rag.processes.length > 0 && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500 text-sm text-green-700">No deadlock</div>
      )}

      <svg width="360" height="320" className="border border-border rounded-lg bg-card mx-auto block">
        <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8" /></marker></defs>
        {rag.processes.map(pid => {
          const reqs = rag.requests.get(pid);
          if (!reqs) return null;
          return Array.from(reqs).map(rid => {
            const from = positions.get(`P${pid}`);
            const to = positions.get(`R${rid}`);
            if (!from || !to) return null;
            const inCycle = cycle && cycle.includes(pid);
            return <line key={`req-${pid}-${rid}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={inCycle ? "#ef4444" : "#94a3b8"} strokeWidth={inCycle ? 2 : 1} markerEnd="url(#arrowhead)" />;
          });
        })}
        {Array.from(rag.assignments.entries()).map(([rid, pid]) => {
          const from = positions.get(`R${rid}`);
          const to = positions.get(`P${pid}`);
          if (!from || !to) return null;
          const inCycle = cycle && cycle.includes(pid);
          return <line key={`asg-${rid}-${pid}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={inCycle ? "#ef4444" : "#3b82f6"} strokeWidth={inCycle ? 2 : 1} strokeDasharray={inCycle ? "" : "4"} markerEnd="url(#arrowhead)" />;
        })}
        {rag.processes.map(p => { const pos = positions.get(`P${p}`); if (!pos) return null; const inCycle = cycle?.includes(p); return (
          <g key={`P${p}`}><circle cx={pos.x} cy={pos.y} r="18" fill={inCycle ? "#ef4444" : "#3b82f6"} /><text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">P{p}</text></g>
        ); })}
        {rag.resources.map(r => { const pos = positions.get(`R${r}`); if (!pos) return null; return (
          <g key={`R${r}`}><rect x={pos.x - 16} y={pos.y - 16} width="32" height="32" fill="#f59e0b" rx="4" /><text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">R{r}</text></g>
        ); })}
      </svg>
    </div>
  );
}

function BankersTab() {
  const [input, setInput] = useState<BankersInput>(bankersDemo);
  const result: BankersResult = useMemo(() => bankersSafe(input), [input]);

  const updateCell = (matrix: "allocation" | "max", i: number, j: number, val: number) => {
    setInput(prev => {
      const next = { ...prev, [matrix]: prev[matrix].map((row, ri) => ri === i ? row.map((c, ci) => ci === j ? val : c) : [...row]) };
      return next;
    });
  };
  const updateAvail = (j: number, val: number) => {
    setInput(prev => ({ ...prev, available: prev.available.map((v, i) => i === j ? val : v) }));
  };

  const addProcess = () => {
    setInput(prev => ({
      ...prev, n: prev.n + 1,
      allocation: [...prev.allocation, new Array(prev.m).fill(0)],
      max: [...prev.max, new Array(prev.m).fill(0)],
    }));
  };

  const vec = (v: number[]) => `[${v.join(", ")}]`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setInput(bankersDemo)} className="px-3 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">Load Demo</button>
        <button onClick={addProcess} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium">+ Process</button>
      </div>

      <div className={`p-3 rounded-lg border text-sm font-medium ${result.safe ? "bg-green-500/10 border-green-500 text-green-700" : "bg-destructive/10 border-destructive text-destructive"}`}>
        {result.safe ? `Safe! Sequence: ${result.sequence.map(i => `P${i}`).join(" → ")}` : "Unsafe state — deadlock possible!"}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(["allocation", "max"] as const).map(m => (
          <div key={m}>
            <h4 className="text-sm font-semibold mb-1 capitalize">{m} Matrix</h4>
            <table className="text-xs border border-border w-full">
              <thead className="bg-muted"><tr><th className="px-2 py-1">Proc</th>{Array.from({ length: input.m }, (_, j) => <th key={j} className="px-2 py-1">R{j}</th>)}</tr></thead>
              <tbody>{input[m].map((row, i) => (
                <tr key={i} className="border-t border-border"><td className="px-2 py-1 font-mono">P{i}</td>
                  {row.map((v, j) => <td key={j} className="px-2 py-1"><input type="number" min={0} value={v} onChange={e => updateCell(m, i, j, +e.target.value)} className="w-12 px-1 py-0.5 rounded border border-border bg-card text-xs text-center" /></td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-1">Available</h4>
        <div className="flex gap-2">
          {input.available.map((v, j) => (
            <label key={j} className="text-xs space-y-0.5">
              <span className="text-muted-foreground">R{j}</span>
              <input type="number" min={0} value={v} onChange={e => updateAvail(j, +e.target.value)} className="block w-14 px-1 py-0.5 rounded border border-border bg-card text-xs text-center" />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-1">Need Matrix (Max − Allocation)</h4>
        <table className="text-xs border border-border">
          <thead className="bg-muted"><tr><th className="px-2 py-1">Proc</th>{Array.from({ length: input.m }, (_, j) => <th key={j} className="px-2 py-1">R{j}</th>)}</tr></thead>
          <tbody>{input.allocation.map((row, i) => (
            <tr key={i} className="border-t border-border"><td className="px-2 py-1 font-mono">P{i}</td>
              {row.map((v, j) => <td key={j} className="px-2 py-1 text-center font-mono">{input.max[i][j] - v}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
        <h4 className="text-sm font-semibold">Algorithm Walkthrough</h4>
        <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
          <p><span className="font-semibold text-foreground">How Banker&apos;s Algorithm works:</span></p>
          <p>1. Compute <span className="font-mono">Need = Max − Allocation</span> for each process.</p>
          <p>2. Initialize <span className="font-mono">Work = Available</span> (the resources the system can hand out right now).</p>
          <p>3. Find any unfinished process P<sub>i</sub> where <span className="font-mono">Need[i] ≤ Work</span> (every resource type).</p>
          <p className="pl-3">— If found: pretend P<sub>i</sub> runs to completion and releases its resources → <span className="font-mono">Work = Work + Allocation[i]</span>. Add P<sub>i</sub> to the safe sequence.</p>
          <p className="pl-3">— If not found: no process can finish → <span className="font-bold text-destructive">UNSAFE</span> (deadlock possible).</p>
          <p>4. Repeat until all processes are in the sequence (<span className="font-bold text-green-600">SAFE</span>) or stuck.</p>
        </div>

        <div className="space-y-3">
          {result.steps.map((step) => (
            <div key={step.round} className={`p-3 rounded border text-xs font-mono space-y-1.5 ${step.selected ? "bg-green-500/5 border-green-500/30" : "bg-destructive/5 border-destructive/30"}`}>
              <p className="font-sans font-semibold text-sm">Round {step.round}</p>
              <p>Work = {vec(step.work)}</p>

              {step.skippedProcesses.length > 0 && (
                <div className="space-y-0.5 text-muted-foreground">
                  {step.skippedProcesses.map((s) => (
                    <p key={s.pid}>
                      <span className="text-red-500">✗</span> P{s.pid}: Need={vec(s.need)} → <span className="text-red-400">{s.reason}</span>
                    </p>
                  ))}
                </div>
              )}

              {step.selected ? (
                <div className="space-y-0.5">
                  <p><span className="text-green-500">✓</span> P{step.process}: Need={vec(step.need)} ≤ Work={vec(step.work)} → <span className="text-green-600 font-sans font-semibold">can run</span></p>
                  <p>P{step.process} finishes → releases Allocation[{step.process}]={vec(input.allocation[step.process])}</p>
                  <p>Work = {vec(step.work)} + {vec(input.allocation[step.process])} = <span className="font-semibold text-foreground">{vec(step.workAfter)}</span></p>
                </div>
              ) : (
                <p className="text-destructive font-sans font-semibold">No process can proceed — UNSAFE!</p>
              )}
            </div>
          ))}
        </div>

        {result.safe && (
          <p className="text-sm font-semibold text-green-600">
            All processes finished. Safe sequence: {result.sequence.map(i => `P${i}`).join(" → ")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DeadlockPage() {
  const [tab, setTab] = useState<"rag" | "bankers">("rag");
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Deadlock Analyzer</h1>
      <div className="flex gap-1 border-b border-border">
        {[["rag", "Resource Allocation Graph"], ["bankers", "Banker's Algorithm"]] .map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "rag" ? <RAGTab /> : <BankersTab />}
    </div>
  );
}
