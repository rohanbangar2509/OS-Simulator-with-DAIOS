#pragma once
#include "scheduler/scheduler.h"

inline ScheduleResult runSJF(std::vector<ProcessControlBlock> procs) {
    resetProcesses(procs);
    int n = (int)procs.size();
    int completed = 0, time = 0;
    std::vector<bool> done(n, false);
    std::vector<std::pair<int,int>> gantt;

    while (completed < n) {
        int idx = -1;
        int minBurst = INT_MAX;
        for (int i = 0; i < n; i++) {
            if (!done[i] && procs[i].arrival_time <= time && procs[i].remaining_burst < minBurst) {
                minBurst = procs[i].remaining_burst;
                idx = i;
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
        procs[idx].remaining_burst = 0;
        done[idx] = true;
        completed++;
    }

    auto r = computeMetrics("SJF (Non-Preemptive)", procs, time);
    r.gantt = gantt;
    printResult(r);
    printPerProcessTable(procs);
    return r;
}
