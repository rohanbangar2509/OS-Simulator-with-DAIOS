"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { MiniFS, FsEntry } from "@/lib/filesystem";
import { analyzeIO, resolvePosition, OPERATIONS, IOResult, Operation, AnalysisConfig, DEFAULT_CONFIG } from "@/lib/fs-io-cost";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function FileTree({ entry, depth = 0 }: { entry: FsEntry; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  if (!entry.isDir) {
    return (
      <div className="flex items-center gap-1 text-xs" style={{ paddingLeft: depth * 16 }}>
        <span className="text-blue-400">📄</span>
        <span className="text-slate-300">{entry.name}</span>
        <span className="text-slate-500 ml-1">({entry.size}B)</span>
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs hover:text-white text-slate-300" style={{ paddingLeft: depth * 16 }}>
        <span>{open ? "📂" : "📁"}</span>
        <span className="font-medium">{entry.name}/</span>
      </button>
      {open && Array.from(entry.children.values()).map(c => <FileTree key={c.name} entry={c} depth={depth + 1} />)}
    </div>
  );
}

const STRATEGY_COLORS: Record<string, string> = {
  contiguous: "#f97316",
  linked: "#06b6d4",
  indexed: "#a78bfa",
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  contiguous: "Blocks are stored in consecutive disk locations. Fast sequential access but expensive insertions/removals due to block shifting.",
  linked: "Each block contains a pointer to the next block. No shifting needed, but traversal is required to reach a position.",
  indexed: "An index block holds pointers to all data blocks. Constant-time access to any position via the index.",
};

function IOAnalyzerTab() {
  const [n, setN] = useState(100);
  const [pos, setPos] = useState(50);
  const [cfg, setCfg] = useState<AnalysisConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<IOResult[] | null>(null);
  const [activeOp, setActiveOp] = useState<Operation | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const run = (op: Operation) => {
    const resolved = resolvePosition(n, op, pos);
    setResults(analyzeIO(n, resolved, op, cfg));
    setActiveOp(op);
    setExpanded({});
  };

  const chartData = results
    ? results.map(r => ({ name: r.strategyLabel, Reads: r.reads, Writes: r.writes, Total: r.total }))
    : [];

  const opLabel = activeOp ? OPERATIONS.find(o => o.id === activeOp)?.label : null;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
        <h3 className="font-semibold text-sm">Configuration</h3>
        <div className="flex flex-wrap gap-6 items-end">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">File size (blocks)</span>
            <input type="number" min={1} max={1000} value={n} onChange={e => setN(Math.max(1, +e.target.value))}
              className="block w-28 rounded bg-muted border border-border px-2 py-1 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Position (for middle ops, 0-based)</span>
            <input type="number" min={0} max={n - 1} value={pos} onChange={e => setPos(Math.max(0, +e.target.value))}
              className="block w-28 rounded bg-muted border border-border px-2 py-1 text-sm" />
          </label>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={cfg.linkedHasTailPointer}
            onChange={e => setCfg(prev => ({ ...prev, linkedHasTailPointer: e.target.checked }))}
            className="accent-primary w-4 h-4" />
          <span className="text-xs text-muted-foreground">
            Linked list has tail pointer
            <span className="ml-1 text-[10px] opacity-60">(affects Insert at End cost)</span>
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Operations</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {OPERATIONS.map(op => (
              <button key={op.id} onClick={() => run(op.id)}
                className={`text-xs px-3 py-2 rounded border transition-colors ${
                  activeOp === op.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted border-border hover:border-primary/50"
                }`}>
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-[13px]">Assumptions</p>
        <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
          <li>The FCB (File Control Block) is already in memory — FCB reads/writes cost 0 disk I/O</li>
          <li>For indexed allocation the index block is already in memory — 0 extra disk I/O</li>
          <li>Only actual disk block reads and writes are counted</li>
          <li>Contiguous: required free space exists; blocks must shift for begin/middle operations</li>
          <li>Linked: traversal requires reading each block; pointer updates require writing the block</li>
        </ul>
      </div>

      {results && activeOp && (
        <>
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-semibold text-sm mb-1">
              Results: {opLabel}
              <span className="font-normal text-muted-foreground ml-2 text-xs">
                (n={n}, pos={resolvePosition(n, activeOp, pos)})
              </span>
            </h3>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-4">Strategy</th>
                    <th className="pb-2 pr-4 text-right">Reads</th>
                    <th className="pb-2 pr-4 text-right">Writes</th>
                    <th className="pb-2 text-right">Total I/O</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.strategy} className="border-b border-border/50">
                      <td className="py-2 pr-4 flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STRATEGY_COLORS[r.strategy] }} />
                        {r.strategyLabel}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{r.reads}</td>
                      <td className="py-2 pr-4 text-right font-mono">{r.writes}</td>
                      <td className="py-2 text-right font-mono font-bold">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-semibold text-sm mb-3">I/O Comparison</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Reads" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Writes" stackId="a" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Step-by-Step Explanations</h3>
            {results.map(r => {
              const isOpen = expanded[r.strategy] ?? true;
              return (
                <div key={r.strategy} className="rounded-lg border border-border overflow-hidden">
                  <button onClick={() => setExpanded(prev => ({ ...prev, [r.strategy]: !isOpen }))}
                    className="w-full flex items-center justify-between p-3 bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STRATEGY_COLORS[r.strategy] }} />
                      <span className="font-medium">{r.strategyLabel}</span>
                      <span className="text-muted-foreground">— {r.total} total I/O</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="p-3 bg-muted/20 border-t border-border space-y-2">
                      <p className="text-xs text-muted-foreground italic">{STRATEGY_DESCRIPTIONS[r.strategy]}</p>
                      <ol className="list-decimal list-inside space-y-1">
                        {r.steps.map((s, i) => (
                          <li key={i} className="text-xs text-slate-300 leading-relaxed">{s}</li>
                        ))}
                      </ol>
                      <div className="text-xs font-mono mt-2 text-right text-muted-foreground">
                        Reads: {r.reads} | Writes: {r.writes} | Total: {r.total}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!results && (
        <div className="p-8 rounded-lg border border-dashed border-border text-center text-muted-foreground text-sm">
          Select an operation above to compare I/O costs across allocation strategies.
        </div>
      )}
    </div>
  );
}

export default function FilesystemPage() {
  const [tab, setTab] = useState<"terminal" | "analyzer">("terminal");
  const [fs] = useState(() => new MiniFS());
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ cmd: string; output: string }[]>([{ cmd: "", output: "Mini File System v1.0 — Type 'help' for commands." }]);
  const [, setTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const output = fs.exec(input.trim());
    setHistory(prev => [...prev, { cmd: input, output }]);
    setInput("");
    forceUpdate();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Mini File System</h1>

      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setTab("terminal")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "terminal" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          Terminal
        </button>
        <button onClick={() => setTab("analyzer")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "analyzer" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          Block I/O Analyzer
        </button>
      </div>

      {tab === "terminal" && (
        <>
          <div className="grid md:grid-cols-[1fr_240px] gap-4">
            <div className="rounded-lg bg-[#1e1e2e] border border-border flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
                {history.map((h, i) => (
                  <div key={i}>
                    {h.cmd && <div><span className="text-green-400">minifs:{fs.getPath()}$</span> <span className="text-white">{h.cmd}</span></div>}
                    {h.output.split("\n").map((line, j) => (
                      <div key={j} className="text-slate-300 whitespace-pre">{line}</div>
                    ))}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={handleSubmit} className="border-t border-border p-2 flex gap-2">
                <span className="text-green-400 text-xs font-mono self-center">$</span>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} autoFocus
                  className="flex-1 bg-transparent text-white text-xs font-mono outline-none" placeholder="Type a command..." />
              </form>
            </div>

            <div className="rounded-lg bg-[#1e1e2e] border border-border p-3 overflow-y-auto h-[500px]">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">File Browser</h3>
              <FileTree entry={fs.root} />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-card border border-border text-xs text-muted-foreground">
            <span className="font-semibold">Commands:</span> ls, mkdir &lt;name&gt;, cd &lt;dir&gt;, create &lt;name&gt;, write &lt;file&gt; &lt;content&gt;, cat &lt;file&gt;, rm &lt;name&gt;, rename &lt;old&gt; &lt;new&gt;, pwd, format, help
          </div>
        </>
      )}

      {tab === "analyzer" && <IOAnalyzerTab />}
    </div>
  );
}
