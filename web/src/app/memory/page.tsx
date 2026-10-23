"use client";
import { useState, useMemo } from "react";
import { MemoryBlock } from "@/lib/types";
import {
  createMemory, allocateFirstFit, allocateBestFit, allocateWorstFit,
  deallocate, compact, externalFragmentation, totalFree,
  createFragmentedDemo, previewAllocation, AllocResult,
} from "@/lib/memory";

const COLORS = ["#3b82f6","#ef4444","#22c55e","#f59e0b","#a855f7","#ec4899","#14b8a6","#f97316","#6366f1","#84cc16"];
const TOTAL = 1024;

const ALGO_LABELS: Record<string, string> = { first: "First Fit", best: "Best Fit", worst: "Worst Fit" };
const HIGHLIGHT: Record<string, string> = { first: "#3b82f6", best: "#22c55e", worst: "#ef4444" };

function MemoryMap({ blocks, total, highlightIdx, highlightColor }: {
  blocks: MemoryBlock[]; total: number; highlightIdx?: number; highlightColor?: string;
}) {
  return (
    <div className="flex h-12 rounded-lg overflow-hidden border border-border">
      {blocks.map((b, i) => {
        const w = (b.size / total) * 100;
        const isHighlighted = highlightIdx === i;
        const bg = b.pid >= 0
          ? COLORS[b.pid % COLORS.length]
          : isHighlighted ? (highlightColor || "#3b82f6") : "#334155";
        return (
          <div key={i}
            className="relative flex items-center justify-center text-xs font-mono text-white transition-all duration-300"
            style={{
              width: `${w}%`, backgroundColor: bg, minWidth: 1,
              outline: isHighlighted ? `3px solid ${highlightColor || "#fff"}` : undefined,
              outlineOffset: isHighlighted ? "-3px" : undefined,
              zIndex: isHighlighted ? 10 : undefined,
            }}
            title={b.pid < 0 ? `Free: ${b.size} @ ${b.start}` : `P${b.pid}: ${b.size} @ ${b.start}`}>
            {w > 4 && (
              <span className="truncate px-0.5">
                {b.pid < 0 ? b.size : `P${b.pid}`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompareView({ blocks, size, total }: { blocks: MemoryBlock[]; size: number; total: number }) {
  const preview = useMemo(() => previewAllocation(blocks, size), [blocks, size]);
  const freeHoles = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.pid === -1 && b.size >= size);

  if (!preview || freeHoles.length === 0) {
    return <p className="text-sm text-muted-foreground">No suitable free block for size {size}. Try a smaller size or deallocate some processes.</p>;
  }

  const allSame = preview.first === preview.best && preview.best === preview.worst;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
        <p className="font-semibold mb-1">Free holes that fit {size}:</p>
        <div className="flex flex-wrap gap-2">
          {freeHoles.map(({ b, i }) => (
            <span key={i} className="px-2 py-0.5 rounded bg-card border border-border font-mono text-xs">
              Hole #{i}: {b.size} @ {b.start}
            </span>
          ))}
        </div>
        {allSame && freeHoles.length === 1 && (
          <p className="mt-2 text-muted-foreground text-xs">
            Only one suitable hole exists — all algorithms will choose the same block.
            Deallocate some processes to create multiple holes and see the difference.
          </p>
        )}
      </div>

      {(["first", "best", "worst"] as const).map((algo) => {
        const idx = preview[algo];
        const block = blocks[idx];
        const label = algo === "first"
          ? "picks the FIRST hole that fits (scans from address 0)"
          : algo === "best"
          ? "picks the SMALLEST hole that fits (minimizes leftover)"
          : "picks the LARGEST hole that fits (maximizes leftover)";
        return (
          <div key={algo} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: HIGHLIGHT[algo] }} />
              <span className="text-sm font-semibold">{ALGO_LABELS[algo]}</span>
              <span className="text-xs text-muted-foreground">— {label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>→ chooses hole #{idx} ({block.size} @ {block.start}), leftover: {block.size - size}</span>
            </div>
            <MemoryMap blocks={blocks} total={total} highlightIdx={idx} highlightColor={HIGHLIGHT[algo]} />
          </div>
        );
      })}
    </div>
  );
}

export default function MemoryPage() {
  const [blocks, setBlocks] = useState<MemoryBlock[]>(createMemory(TOTAL));
  const [algo, setAlgo] = useState<"first" | "best" | "worst">("first");
  const [size, setSize] = useState(100);
  const [pid, setPid] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 80));

  const alloc = () => {
    const fn = algo === "first" ? allocateFirstFit : algo === "best" ? allocateBestFit : allocateWorstFit;
    const result: AllocResult | null = fn(blocks, pid, size);
    if (result) {
      setBlocks(result.blocks);
      addLog(`P${pid} (${size}) → ${result.reason}`);
      setPid(pid + 1);
    } else {
      addLog(`Failed P${pid} (${size}) — no hole >= ${size}`);
    }
  };

  const dealloc = (p: number) => {
    setBlocks(deallocate(blocks, p));
    addLog(`Freed P${p}`);
  };

  const doCompact = () => {
    setBlocks(compact(blocks));
    addLog("Compacted — all free space merged at end");
  };

  const loadDemo = () => {
    const demo = createFragmentedDemo(TOTAL);
    setBlocks(demo.blocks);
    setPid(demo.nextPid);
    setLog(["Demo loaded: P1(100), P2(200), P3(80), P4(60) allocated; 4 free holes of sizes 50, 150, 300, 84"]);
    setShowCompare(true);
  };

  const freeHoles = blocks.filter(b => b.pid === -1);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Memory Management</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Size</span>
          <input type="number" min={1} max={TOTAL} value={size} onChange={e => setSize(+e.target.value)}
            className="block w-24 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Algorithm</span>
          <select value={algo} onChange={e => setAlgo(e.target.value as typeof algo)}
            className="block px-2 py-1.5 rounded border border-border bg-card text-sm">
            <option value="first">First Fit</option><option value="best">Best Fit</option><option value="worst">Worst Fit</option>
          </select></label>
        <button onClick={alloc} className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Allocate P{pid}</button>
        <button onClick={doCompact} className="px-4 py-1.5 rounded bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-80">Compact</button>
        <button onClick={loadDemo} className="px-4 py-1.5 rounded bg-accent text-accent-foreground text-sm font-medium hover:opacity-80 border border-border">
          Load Fragmented Demo
        </button>
        <button onClick={() => setShowCompare(!showCompare)}
          className={`px-4 py-1.5 rounded text-sm font-medium border ${showCompare ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent"}`}>
          Compare All
        </button>
        <button onClick={() => { setBlocks(createMemory(TOTAL)); setPid(1); setLog([]); setShowCompare(false); }}
          className="px-4 py-1.5 rounded bg-destructive text-white text-sm font-medium hover:opacity-90">Reset</button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Memory Map</h3>
        <MemoryMap blocks={blocks} total={TOTAL} />
        <div className="flex flex-wrap gap-2 text-xs mt-2">
          {blocks.filter(b => b.pid >= 0).map(b => (
            <span key={b.pid} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[b.pid % COLORS.length] }} />
              P{b.pid} ({b.size})
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-700" />Free
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total Free", `${totalFree(blocks)}`],
          ["Ext. Fragmentation", `${externalFragmentation(blocks)}`],
          ["Free Holes", `${freeHoles.length}`],
          ["Total Blocks", `${blocks.length}`],
        ].map(([l, v]) => (
          <div key={l} className="p-3 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-xl font-bold font-mono">{v}</p>
          </div>
        ))}
      </div>

      {showCompare && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <h3 className="text-sm font-semibold">Algorithm Comparison — allocating size {size}</h3>
          <CompareView blocks={blocks} size={size} total={TOTAL} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Allocated Processes</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {blocks.filter(b => b.pid >= 0).map(b => (
              <div key={b.pid} className="flex items-center justify-between p-2 rounded bg-card border border-border text-sm">
                <span className="font-mono">P{b.pid} — {b.size} @ {b.start}</span>
                <button onClick={() => dealloc(b.pid)} className="text-destructive text-xs hover:underline">Free</button>
              </div>
            ))}
            {blocks.filter(b => b.pid >= 0).length === 0 && <p className="text-sm text-muted-foreground">No allocations</p>}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Log</h3>
          <div className="h-48 overflow-y-auto rounded bg-card border border-border p-2 text-xs font-mono space-y-0.5">
            {log.map((l, i) => <div key={i} className="text-muted-foreground">{l}</div>)}
            {log.length === 0 && <div className="text-muted-foreground">No events yet. Try &quot;Load Fragmented Demo&quot; to see algorithm differences.</div>}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 border border-border text-sm space-y-2">
        <h3 className="font-semibold">How to see the difference between algorithms:</h3>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Click <span className="font-medium text-foreground">Load Fragmented Demo</span> to create memory with multiple free holes of different sizes.</li>
          <li>Click <span className="font-medium text-foreground">Compare All</span> to see which hole each algorithm would choose for the given size.</li>
          <li>Change the <span className="font-medium text-foreground">Size</span> value and watch how the algorithm choices change.</li>
          <li>Select an algorithm, allocate, then free some processes to create new holes and compare again.</li>
        </ol>
      </div>
    </div>
  );
}
