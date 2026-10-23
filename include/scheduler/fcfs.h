#pragma once
#include "scheduler/scheduler.h"

inline ScheduleResult runFCFS(std::vector<ProcessControlBlock> procs) {
    resetProcesses(procs);
    std::sort(procs.begin(), procs.end(),
              [](auto& a, auto& b){ return a.arrival_time < b.arrival_time; });

    int time = 0;
    std::vector<std::pair<int,int>> gantt;

    for (auto& p : procs) {
        if (time < p.arrival_time) {
            gantt.push_back({-1, p.arrival_time - time});
            time = p.arrival_time;
        }
        p.start_time = time;
        p.response_time = time - p.arrival_time;
        gantt.push_back({p.pid, p.burst_time});
        time += p.burst_time;
        p.completion_time = time;
    }

    auto r = computeMetrics("FCFS", procs, time);
    r.gantt = gantt;
    printResult(r);
    printPerProcessTable(procs);
    return r;
}
