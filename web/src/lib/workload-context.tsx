
"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ProcessControlBlock } from "@/lib/types";
import { sampleWorkload } from "@/lib/scheduler";

type WorkloadContextValue = {
  processes: ProcessControlBlock[];
  setProcesses: React.Dispatch<
    React.SetStateAction<ProcessControlBlock[]>
  >;
  resetWorkload: () => void;
};

const WorkloadContext = createContext<WorkloadContextValue | null>(null);

export function WorkloadProvider({ children }: { children: ReactNode }) {
  const [processes, setProcesses] = useState<ProcessControlBlock[]>(
    () => sampleWorkload()
  );

  function resetWorkload() {
    setProcesses(sampleWorkload());
  }

  return (
    <WorkloadContext.Provider
      value={{ processes, setProcesses, resetWorkload }}
    >
      {children}
    </WorkloadContext.Provider>
  );
}

export function useWorkload() {
  const context = useContext(WorkloadContext);

  if (!context) {
    throw new Error("useWorkload must be used inside WorkloadProvider");
  }

  return context;
}
