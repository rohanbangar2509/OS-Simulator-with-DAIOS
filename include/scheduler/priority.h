#pragma once
#include "scheduler/scheduler.h"

inline ScheduleResult runPriority(std::vector<ProcessControlBlock> procs) {
    resetProcesses(procs);
    int n = (int)procs.size();
    int completed = 0, time = 0;
    std::vector<bool> done(n, false);
    std::vector<std::pair<int,int>> gantt;

    while (completed < n) {
        int idx = -1;
        int bestPri = INT_MAX;
        for (int i = 0; i < n; i++) {
            if (!done[i] && procs[i].arrival_time <= time) {
                if (procs[i].priority < bestPri ||
                    (procs[i].priority == bestPri && procs[i].arrival_time < procs[idx].arrival_time)) {
                    bestPri = procs[i].priority;
                    idx = i;
                }
            }
        }
        if (idx == -1) {
            int nextArr = INT_MAX;
            for (int i = 0; i < n; i++)
                if (!done[i]) nextArr = std::min(nextArr, procs[i].arrival_time);
            gantt.push_back({-1, nextArr - time});
            time = nextArr;
            continue;
        }
        procs[idx].start_time = time;
        procs[idx].response_time = time - procs[idx].arrival_time;
        gantt.push_back({procs[idx].pid, procs[idx].burst_time});
        time += procs[idx].burst_time;
        procs[idx].completion_time = time;
        done[idx] = true;
        completed++;
    }

    auto r = computeMetrics("Priority (Non-Preemptive)", procs, time);
    r.gantt = gantt;
    printResult(r);
    printPerProcessTable(procs);
    return r;
}
