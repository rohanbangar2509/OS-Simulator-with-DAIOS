#pragma once
#include "scheduler/scheduler.h"
#include <queue>

inline ScheduleResult runMLFQ(std::vector<ProcessControlBlock> procs) {
    resetProcesses(procs);
    int n = (int)procs.size();
    std::sort(procs.begin(), procs.end(),
              [](auto& a, auto& b){ return a.arrival_time < b.arrival_time; });

    const int NUM_QUEUES = 3;
    int quanta[NUM_QUEUES] = {4, 8, 16};
    std::queue<int> queues[NUM_QUEUES];
    std::vector<int> level(n, 0);
    std::vector<bool> inQueue(n, false);

    std::vector<std::pair<int,int>> gantt;
    int time = 0, completed = 0, nextIdx = 0;

    auto enqueueArrivals = [&]() {
        while (nextIdx < n && procs[nextIdx].arrival_time <= time) {
            queues[0].push(nextIdx);
            inQueue[nextIdx] = true;
            nextIdx++;
        }
    };

    enqueueArrivals();

    while (completed < n) {
        int chosenQ = -1;
        for (int q = 0; q < NUM_QUEUES; q++) {
            if (!queues[q].empty()) { chosenQ = q; break; }
        }

        if (chosenQ == -1) {
            int nextArr = INT_MAX;
            for (int i = 0; i < n; i++)
                if (procs[i].remaining_burst > 0 && !inQueue[i])
                    nextArr = std::min(nextArr, procs[i].arrival_time);
            if (nextArr == INT_MAX) break;
            gantt.push_back({-1, nextArr - time});
            time = nextArr;
            enqueueArrivals();
            continue;
        }

        int cur = queues[chosenQ].front();
        queues[chosenQ].pop();

        if (procs[cur].response_time < 0)
            procs[cur].response_time = time - procs[cur].arrival_time;

        int q = quanta[chosenQ];
        int run = std::min(q, procs[cur].remaining_burst);
        gantt.push_back({procs[cur].pid, run});
        time += run;
        procs[cur].remaining_burst -= run;

        enqueueArrivals();

        if (procs[cur].remaining_burst > 0) {
            int nextLevel = std::min(chosenQ + 1, NUM_QUEUES - 1);
            level[cur] = nextLevel;
            queues[nextLevel].push(cur);
        } else {
            procs[cur].completion_time = time;
            inQueue[cur] = false;
            completed++;
        }
    }

    auto r = computeMetrics("MLFQ (3-level: q=4,8,16)", procs, time);
    r.gantt = gantt;
    printResult(r);
    printPerProcessTable(procs);
    return r;
}
