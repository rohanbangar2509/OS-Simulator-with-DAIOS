"use client";
import { useState, useMemo } from "react";
import { runFIFO, runLRU, runOptimal, runClock, sampleRefs } from "@/lib/vmem";
import { ReplacementResult } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function PageTable({ result }: { result: ReplacementResult }) {
  const first = result.frameSnapshots[0];
  const numFrames = first?.frames.length || 0;
  const label = first?.structureLabel || "";

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border border-border w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Step</th>
            <th className="px-2 py-1 text-left font-medium">Ref</th>
            {Array.from({ length: numFrames }, (_, i) => (
              <th key={i} className="px-2 py-1 text-center font-medium">F{i}</th>
            ))}
            <th className="px-2 py-1 text-center font-medium">Fault?</th>
            <th className="px-2 py-1 text-center font-medium">Victim</th>
            <th className="px-2 py-1 text-left font-medium">{label}</th>
          </tr>
        </thead>
        <tbody>
          {result.frameSnapshots.map((snap, i) => (
            <tr key={i} className={`border-t border-border ${snap.fault ? "bg-destructive/10" : ""}`}>
              <td className="px-2 py-1 font-mono">{i + 1}</td>
              <td className="px-2 py-1 font-mono font-bold">{snap.ref}</td>
              {snap.frames.map((f, j) => (
                <td key={j} className={`px-2 py-1 text-center font-mono ${snap.victim !== undefined && f === snap.ref && snap.fault ? "text-primary font-bold" : ""}`}>
                  {f < 0 ? "—" : f}
                </td>
              ))}
              <td className="px-2 py-1 text-center">{snap.fault ? "✗" : "✓"}</td>
              <td className="px-2 py-1 text-center font-mono text-destructive">
                {snap.victim !== undefined ? snap.victim : "—"}
              </td>
              <td className="px-2 py-1 font-mono text-muted-foreground whitespace-nowrap">{snap.structure}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VmemPage() {
  const [refStr, setRefStr] = useState(sampleRefs.join(","));
  const [numFrames, setNumFrames] = useState(3);
  const [tab, setTab] = useState(0);

  const refs = useMemo(() => refStr.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)), [refStr]);

  const results = useMemo<ReplacementResult[]>(() => {
    if (refs.length === 0 || numFrames < 1) return [];
    return [runFIFO(refs, numFrames), runLRU(refs, numFrames), runOptimal(refs, numFrames), runClock(refs, numFrames)];
  }, [refs, numFrames]);

  const algoNames = ["FIFO", "LRU", "Optimal", "Clock"];
  const chartData = results.map((r, i) => ({ name: algoNames[i], "Page Faults": r.pageFaults, Hits: r.hits }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Virtual Memory Simulator</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="space-y-1 flex-1 min-w-[200px]"><span className="text-xs text-muted-foreground">Reference String (comma-separated)</span>
          <input value={refStr} onChange={e => setRefStr(e.target.value)}
            className="block w-full px-2 py-1.5 rounded border border-border bg-card text-sm font-mono" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Frames</span>
          <input type="number" min={1} max={10} value={numFrames} onChange={e => setNumFrames(+e.target.value)}
            className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        <button onClick={() => setRefStr(sampleRefs.join(","))} className="px-4 py-1.5 rounded bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-80">Sample</button>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex gap-1 border-b border-border">
            {[...algoNames, "Compare"].map((name, i) => (
              <button key={name} onClick={() => setTab(i)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {name}
              </button>
            ))}
          </div>

          {tab < 4 && results[tab] && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Page Faults", results[tab].pageFaults],
                  ["Hits", results[tab].hits],
                  ["Fault Rate", ((results[tab].pageFaults / results[tab].totalRefs) * 100).toFixed(1) + "%"],
                ].map(([l, v]) => (
                  <div key={String(l)} className="p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground">{l}</p>
                    <p className="text-xl font-bold font-mono">{v}</p>
                  </div>
                ))}
              </div>
              <PageTable result={results[tab]} />
            </div>
          )}

          {tab === 4 && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border">
                  <thead className="bg-muted"><tr>{["Algorithm","Page Faults","Hits","Fault Rate"].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                  <tbody>{results.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{r.algorithm}</td>
                      <td className="px-3 py-1.5 font-mono">{r.pageFaults}</td>
                      <td className="px-3 py-1.5 font-mono">{r.hits}</td>
                      <td className="px-3 py-1.5 font-mono">{((r.pageFaults / r.totalRefs) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="Page Faults" fill="#ef4444" />
                    <Bar dataKey="Hits" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
