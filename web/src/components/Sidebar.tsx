"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const modules = [
  { href: "/process", label: "Process & Thread", num: 1, icon: "⚙" },
  { href: "/scheduler", label: "CPU Scheduling", num: 2, icon: "📊" },
  { href: "/sync", label: "Synchronization", num: 3, icon: "🔒" },
  { href: "/deadlock", label: "Deadlock Analyzer", num: 4, icon: "💀" },
  { href: "/memory", label: "Memory Mgmt", num: 5, icon: "🧠" },
  { href: "/vmem", label: "Virtual Memory", num: 6, icon: "📄" },
  { href: "/filesystem", label: "File System", num: 7, icon: "📁" },
  { href: "/daios", label: "DAIOS Intelligence", num: 8, icon: "🧠" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card h-screen sticky top-0 flex flex-col">
      <Link href="/" className="block p-5 border-b border-border hover:bg-accent/50 transition-colors">
        <h1 className="text-lg font-bold text-primary">Mini OS Simulator</h1>
        <p className="text-xs text-muted-foreground mt-1">Interactive Learning Lab</p>
      </Link>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {modules.map((m) => {
          const active = pathname === m.href;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <span className="text-base">{m.icon}</span>
              <span className="flex-1">{m.label}</span>
              <span className={cn(
                "text-xs font-mono w-5 h-5 flex items-center justify-center rounded",
                active ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {m.num}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        C++17 &amp; TypeScript
      </div>
    </aside>
  );
}
