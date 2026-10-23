#pragma once
#include "scheduler/scheduler.h"
#include <queue>

inline ScheduleResult runRoundRobin(std::vector<ProcessControlBlock> procs, int quantum) {
    resetProcesses(procs);
    int n = (int)procs.size();
    std::sort(procs.begin(), procs.end(),
              [](auto& a, auto& b){ return a.arrival_time < b.arrival_time; });

    std::queue<int> readyQ;
    std::vector<bool> inQueue(n, false);
    std::vector<std::pair<int,int>> gantt;
    int time = 0, completed = 0;
    int idx = 0;

    while (idx < n && procs[idx].arrival_time <= time) {
        readyQ.push(idx);
        inQueue[idx] = true;
        idx++;
    }

    while (completed < n) {
        if (readyQ.empty()) {
            int nextArr = INT_MAX;
            for (int i = 0; i < n; i++)
                if (procs[i].remaining_burst > 0 && !inQueue[i])
                    nextArr = std::min(nextArr, procs[i].arrival_time);
            gantt.push_back({-1, nextArr - time});
            time = nextArr;
            while (idx < n && procs[idx].arrival_time <= time) {
                readyQ.push(idx);
                inQueue[idx] = true;
                idx++;
            }
            continue;
        }

        int cur = readyQ.front();
        readyQ.pop();

        if (procs[cur].response_time < 0)
            procs[cur].response_time = time - procs[cur].arrival_time;

        int run = std::min(quantum, procs[cur].remaining_burst);
        gantt.push_back({procs[cur].pid, run});
        time += run;
        procs[cur].remaining_burst -= run;

        while (idx < n && procs[idx].arrival_time <= time) {
            readyQ.push(idx);
            inQueue[idx] = true;
            idx++;
        }

        if (procs[cur].remaining_burst > 0) {
            readyQ.push(cur);
        } else {
            procs[cur].completion_time = time;
            completed++;
        }
    }

    auto r = computeMetrics("Round Robin (q=" + std::to_string(quantum) + ")", procs, time);
    r.gantt = gantt;
    printResult(r);
    printPerProcessTable(procs);
    return r;
}
