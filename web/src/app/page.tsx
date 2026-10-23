import Link from "next/link";

const modules = [
  { href: "/process",    num: 1, title: "Process & Thread Simulator",  desc: "PCB/TCB, state transitions, context switch, live table" },
  { href: "/scheduler",  num: 2, title: "CPU Scheduling Laboratory",   desc: "FCFS, SJF, RR, Priority, MLFQ with Gantt charts and comparison" },
  { href: "/sync",       num: 3, title: "Synchronization Playground",  desc: "Producer-Consumer, Readers-Writers, Dining Philosophers, Sleeping Barber" },
  { href: "/deadlock",   num: 4, title: "Deadlock Analyzer",           desc: "Resource Allocation Graph, Banker's Algorithm, safe sequence" },
  { href: "/memory",     num: 5, title: "Memory Management",           desc: "First/Best/Worst Fit, fragmentation, compaction, memory map" },
  { href: "/vmem",       num: 6, title: "Virtual Memory",              desc: "Page table, FIFO/LRU/Optimal/Clock replacement, comparison" },
  { href: "/filesystem", num: 7, title: "Mini File System",            desc: "FAT-based virtual disk, shell commands, directory tree, Block I/O Analyzer" },
  {
  href: "/daios",
  num: 8,
  title: "DAIOS Intelligence Layer",
  desc: "Simulated telemetry, workload observations, bottleneck detection and performance history",
  },
];

export default function Home() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3">Mini Operating System Simulator</h1>
        <p className="text-lg text-muted-foreground">
          An interactive, visual laboratory for learning OS concepts. Choose a module to begin.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group block p-5 rounded-xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl font-bold text-primary font-mono w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 shrink-0">
                {m.num}
              </span>
              <div>
                <h2 className="font-semibold text-lg group-hover:text-primary transition-colors">{m.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
