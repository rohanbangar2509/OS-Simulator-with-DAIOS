#pragma once
#include <vector>
#include <string>
#include <algorithm>
#include <numeric>
#include <iomanip>
#include <climits>
#include <queue>
#include "common/types.h"
#include "common/display.h"

struct ScheduleResult {
    std::string algorithm_name;
    double avg_waiting_time = 0;
    double avg_turnaround_time = 0;
    double avg_response_time = 0;
    double cpu_utilization = 0;
    double throughput = 0;
    std::vector<std::pair<int, int>> gantt; // (pid, duration)
};

inline void resetProcesses(std::vector<ProcessControlBlock>& procs) {
    for (auto& p : procs) {
        p.remaining_burst = p.burst_time;
        p.waiting_time = 0;
        p.turnaround_time = 0;
        p.response_time = -1;
        p.completion_time = 0;
        p.start_time = -1;
        p.state = ProcessState::NEW;
    }
}

inline ScheduleResult computeMetrics(const std::string& name,
                                     std::vector<ProcessControlBlock>& procs,
                                     int totalTime) {
    ScheduleResult r;
    r.algorithm_name = name;
    int n = (int)procs.size();
    double sumW = 0, sumT = 0, sumR = 0;
    for (auto& p : procs) {
        p.turnaround_time = p.completion_time - p.arrival_time;
        p.waiting_time = p.turnaround_time - p.burst_time;
        sumW += p.waiting_time;
        sumT += p.turnaround_time;
        sumR += (p.response_time >= 0 ? p.response_time : 0);
    }
    r.avg_waiting_time = sumW / n;
    r.avg_turnaround_time = sumT / n;
    r.avg_response_time = sumR / n;

    int totalBurst = 0;
    for (auto& p : procs) totalBurst += p.burst_time;
    r.cpu_utilization = (totalTime > 0) ? (100.0 * totalBurst / totalTime) : 0;
    r.throughput = (totalTime > 0) ? ((double)n / totalTime) : 0;
    return r;
}

inline void printGantt(const std::vector<std::pair<int, int>>& gantt) {
    if (gantt.empty()) return;
    std::cout << Display::Color::BOLD << "\nGantt Chart:\n" << Display::Color::RESET;
    std::cout << "|";
    for (auto& [pid, dur] : gantt) {
        std::string label = (pid == -1) ? "idle" : ("P" + std::to_string(pid));
        int w = std::max((int)label.size() + 2, dur);
        int pad = (w - (int)label.size()) / 2;
        std::cout << std::string(pad, ' ') << label
                  << std::string(w - pad - (int)label.size(), ' ') << "|";
    }
    std::cout << "\n";
    int t = 0;
    std::cout << t;
    for (auto& [pid, dur] : gantt) {
        std::string label = (pid == -1) ? "idle" : ("P" + std::to_string(pid));
        int w = std::max((int)label.size() + 2, dur);
        t += dur;
        std::string ts = std::to_string(t);
        std::cout << std::string(w + 1 - (int)ts.size(), ' ') << ts;
    }
    std::cout << "\n";
}

inline void printResult(const ScheduleResult& r) {
    Display::printSubHeader(r.algorithm_name + " Results");
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "  Avg Waiting Time    : " << r.avg_waiting_time << "\n";
    std::cout << "  Avg Turnaround Time : " << r.avg_turnaround_time << "\n";
    std::cout << "  Avg Response Time   : " << r.avg_response_time << "\n";
    std::cout << "  CPU Utilization     : " << r.cpu_utilization << "%\n";
    std::cout << "  Throughput          : " << r.throughput << " proc/unit\n";
    printGantt(r.gantt);
}

inline void printPerProcessTable(const std::vector<ProcessControlBlock>& procs) {
    std::vector<std::string> headers = {
        "PID", "Arrival", "Burst", "Priority", "Completion", "Turnaround", "Waiting", "Response"
    };
    std::vector<std::vector<std::string>> rows;
    for (auto& p : procs) {
        rows.push_back({
            "P" + std::to_string(p.pid),
            std::to_string(p.arrival_time),
            std::to_string(p.burst_time),
            std::to_string(p.priority),
            std::to_string(p.completion_time),
            std::to_string(p.turnaround_time),
            std::to_string(p.waiting_time),
            std::to_string(p.response_time)
        });
    }
    Display::printTable(headers, rows);
}

inline void printComparison(const std::vector<ScheduleResult>& results) {
    Display::printSubHeader("Algorithm Comparison");
    std::vector<std::string> headers = {
        "Algorithm", "Avg Wait", "Avg Turnaround", "Avg Response", "CPU Util%", "Throughput"
    };
    std::vector<std::vector<std::string>> rows;
    std::ostringstream oss;
    for (auto& r : results) {
        oss.str(""); oss << std::fixed << std::setprecision(2) << r.avg_waiting_time;
        std::string w = oss.str();
        oss.str(""); oss << std::fixed << std::setprecision(2) << r.avg_turnaround_time;
        std::string t = oss.str();
        oss.str(""); oss << std::fixed << std::setprecision(2) << r.avg_response_time;
        std::string rr = oss.str();
        oss.str(""); oss << std::fixed << std::setprecision(2) << r.cpu_utilization;
        std::string u = oss.str();
        oss.str(""); oss << std::fixed << std::setprecision(4) << r.throughput;
        std::string tp = oss.str();
        rows.push_back({r.algorithm_name, w, t, rr, u, tp});
    }
    Display::printTable(headers, rows);
}
