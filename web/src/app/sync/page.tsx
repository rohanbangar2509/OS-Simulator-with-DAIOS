"use client";
import { useState, useRef, useCallback } from "react";
import { LogEntry } from "@/lib/types";
import { runProducerConsumer, runReadersWriters, runDiningPhilosophers, runSleepingBarber } from "@/lib/sync";

const TAG_COLORS: Record<string, string> = {
  System: "text-blue-400",
  Producer: "text-green-400",
  Consumer: "text-yellow-400",
  Barber: "text-purple-400",
};

function getColor(tag: string) {
  if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  if (tag.startsWith("R")) return "text-cyan-400";
  if (tag.startsWith("W")) return "text-red-400";
  if (tag.startsWith("P")) return "text-orange-400";
  if (tag.startsWith("C")) return "text-pink-400";
  return "text-muted-foreground";
}

function msgClass(msg: string) {
  if (msg.includes("BLOCKED")) return "text-red-300";
  if (msg.includes("ACQUIRED")) return "text-green-300";
  if (msg.includes("RELEASED")) return "text-yellow-200";
  if (msg.includes("sem_signal")) return "text-sky-300";
  if (msg.includes("PASSED") || msg.includes("WOKE UP")) return "text-emerald-300";
  return "text-slate-300";
}

const PRIMITIVES: Record<string, { primitives: string; desc: string }> = {
  pc: {
    primitives: "mutex (buffer access) + semaphore empty (tracks empty slots) + semaphore full (tracks filled slots)",
    desc: "Producer waits on empty, locks mutex, adds item, unlocks, signals full. Consumer waits on full, locks mutex, removes item, unlocks, signals empty.",
  },
  rw: {
    primitives: "rw_mutex (exclusive write access) + rc_mutex (protects reader_count variable)",
    desc: "First reader locks rw_mutex to block writers; last reader unlocks it. Writers always lock rw_mutex exclusively.",
  },
  dp: {
    primitives: "One mutex per fork (N forks total) + ordered locking (lower-numbered fork first) to prevent deadlock",
    desc: "Each philosopher acquires two fork mutexes in order, eats, then releases both. Ordered locking breaks the circular-wait condition.",
  },
  sb: {
    primitives: "seat_mutex (protects chair count) + semaphore customer_ready + semaphore barber_ready",
    desc: "Customer locks seat_mutex, sits if chair free, signals customer_ready. Barber waits on customer_ready, picks a customer, signals barber_ready.",
  },
};

const PROBLEMS = [
  { id: "pc", name: "Producer-Consumer" },
  { id: "rw", name: "Readers-Writers" },
  { id: "dp", name: "Dining Philosophers" },
  { id: "sb", name: "Sleeping Barber" },
] as const;

export default function SyncPage() {
  const [problem, setProblem] = useState<string>("pc");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const signalRef = useRef({ stop: false });
  const logRef = useRef<HTMLDivElement>(null);

  const [pcBuf, setPcBuf] = useState(5);
  const [pcItems, setPcItems] = useState(10);
  const [rwR, setRwR] = useState(3);
  const [rwW, setRwW] = useState(2);
  const [dpN, setDpN] = useState(5);
  const [sbChairs, setSbChairs] = useState(3);
  const [sbCustomers, setSbCustomers] = useState(8);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  const start = async () => {
    setLogs([]);
    setRunning(true);
    signalRef.current = { stop: false };
    try {
      switch (problem) {
        case "pc": await runProducerConsumer(addLog, pcBuf, pcItems, speed, signalRef.current); break;
        case "rw": await runReadersWriters(addLog, rwR, rwW, speed, signalRef.current); break;
        case "dp": await runDiningPhilosophers(addLog, dpN, speed, signalRef.current); break;
        case "sb": await runSleepingBarber(addLog, sbChairs, sbCustomers, speed, signalRef.current); break;
      }
    } finally { setRunning(false); }
  };

  const stop = () => { signalRef.current.stop = true; };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Synchronization Playground</h1>

      <div className="flex gap-1 border-b border-border">
        {PROBLEMS.map(p => (
          <button key={p.id} onClick={() => !running && setProblem(p.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${problem === p.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {problem === "pc" && (
          <>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Buffer Size</span>
              <input type="number" min={1} value={pcBuf} onChange={e => setPcBuf(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Items</span>
              <input type="number" min={1} value={pcItems} onChange={e => setPcItems(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
          </>
        )}
        {problem === "rw" && (
          <>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Readers</span>
              <input type="number" min={1} value={rwR} onChange={e => setRwR(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Writers</span>
              <input type="number" min={1} value={rwW} onChange={e => setRwW(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
          </>
        )}
        {problem === "dp" && (
          <label className="space-y-1"><span className="text-xs text-muted-foreground">Philosophers</span>
            <input type="number" min={2} value={dpN} onChange={e => setDpN(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
        )}
        {problem === "sb" && (
          <>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Chairs</span>
              <input type="number" min={1} value={sbChairs} onChange={e => setSbChairs(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Customers</span>
              <input type="number" min={1} value={sbCustomers} onChange={e => setSbCustomers(+e.target.value)} className="block w-20 px-2 py-1.5 rounded border border-border bg-card text-sm" /></label>
          </>
        )}
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Speed</span>
          <input type="range" min={1} max={10} value={speed} onChange={e => setSpeed(+e.target.value)} className="block w-24" /></label>
        {!running ? (
          <button onClick={start} className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Run</button>
        ) : (
          <button onClick={stop} className="px-4 py-1.5 rounded bg-destructive text-white text-sm font-medium hover:opacity-90">Stop</button>
        )}
      </div>

      <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
        <p><span className="font-semibold">Primitives:</span> <span className="text-muted-foreground">{PRIMITIVES[problem]?.primitives}</span></p>
        <p className="text-xs text-muted-foreground">{PRIMITIVES[problem]?.desc}</p>
        <div className="flex flex-wrap gap-3 text-xs mt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />BLOCKED</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />ACQUIRED / PASSED</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300" />RELEASED</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" />sem_signal</span>
        </div>
      </div>

      <div ref={logRef} className="h-96 overflow-y-auto rounded-lg bg-[#1e1e2e] border border-border p-3 font-mono text-xs space-y-0.5">
        {logs.map((l, i) => (
          <div key={i}>
            <span className="text-slate-500">[{String(l.time).padStart(4, "0")}]</span>{" "}
            <span className={`font-semibold ${getColor(l.tag)}`}>[{l.tag}]</span>{" "}
            <span className={msgClass(l.message)}>{l.message}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="text-slate-500">Click Run to start the simulation...</div>}
      </div>
    </div>
  );
}
