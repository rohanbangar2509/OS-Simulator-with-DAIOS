#pragma once
#include <vector>
#include <string>
#include <algorithm>
#include "common/types.h"
#include "common/display.h"
#include "common/logger.h"

class ProcessManager {
public:
    int createProcess(int burst, int priority, int arrival, int memReq) {
        ProcessControlBlock pcb;
        pcb.pid = nextPid_++;
        pcb.state = ProcessState::NEW;
        pcb.burst_time = burst;
        pcb.remaining_burst = burst;
        pcb.priority = priority;
        pcb.arrival_time = arrival;
        pcb.memory_requirement = memReq;
        processes_.push_back(pcb);
        Logger::instance().log("ProcessMgr",
            "Created process P" + std::to_string(pcb.pid)
            + " (burst=" + std::to_string(burst)
            + ", pri=" + std::to_string(priority)
            + ", arr=" + std::to_string(arrival)
            + ", mem=" + std::to_string(memReq) + ")");
        return pcb.pid;
    }

    int addThread(int pid, int burst) {
        auto* p = findProcess(pid);
        if (!p) return -1;
        ThreadControlBlock tcb;
        tcb.tid = nextTid_++;
        tcb.state = ProcessState::NEW;
        tcb.remaining_burst = burst;
        p->threads.push_back(tcb);
        Logger::instance().log("ProcessMgr",
            "Added thread T" + std::to_string(tcb.tid)
            + " to P" + std::to_string(pid)
            + " (burst=" + std::to_string(burst) + ")");
        return tcb.tid;
    }

    void transitionProcess(int pid, ProcessState newState) {
        auto* p = findProcess(pid);
        if (!p) return;
        auto old = p->state;
        p->state = newState;
        Logger::instance().log("ProcessMgr",
            "P" + std::to_string(pid) + ": "
            + stateToString(old) + " -> " + stateToString(newState));
    }

    void transitionThread(int pid, int tid, ProcessState newState) {
        auto* p = findProcess(pid);
        if (!p) return;
        for (auto& t : p->threads) {
            if (t.tid == tid) {
                auto old = t.state;
                t.state = newState;
                Logger::instance().log("ProcessMgr",
                    "P" + std::to_string(pid) + "/T" + std::to_string(tid) + ": "
                    + stateToString(old) + " -> " + stateToString(newState));
                return;
            }
        }
    }

    void displayProcessTable() const {
        std::vector<std::string> headers = {
            "PID", "State", "Burst", "Priority", "Arrival", "Memory", "Threads"
        };
        std::vector<std::vector<std::string>> rows;
        for (auto& p : processes_) {
            rows.push_back({
                "P" + std::to_string(p.pid),
                stateToString(p.state),
                std::to_string(p.burst_time),
                std::to_string(p.priority),
                std::to_string(p.arrival_time),
                std::to_string(p.memory_requirement) + " KB",
                std::to_string(p.threads.size())
            });
        }
        Display::printTable(headers, rows);
    }

    void displayThreadTable(int pid) const {
        auto* p = findProcessConst(pid);
        if (!p || p->threads.empty()) {
            Display::printInfo("No threads for P" + std::to_string(pid));
            return;
        }
        std::vector<std::string> headers = {"TID", "State", "Remaining Burst"};
        std::vector<std::vector<std::string>> rows;
        for (auto& t : p->threads) {
            rows.push_back({
                "T" + std::to_string(t.tid),
                stateToString(t.state),
                std::to_string(t.remaining_burst)
            });
        }
        Display::printTable(headers, rows);
    }

    std::vector<ProcessControlBlock>& getProcesses() { return processes_; }
    const std::vector<ProcessControlBlock>& getProcesses() const { return processes_; }

    ProcessControlBlock* findProcess(int pid) {
        for (auto& p : processes_)
            if (p.pid == pid) return &p;
        return nullptr;
    }

    void clear() {
        processes_.clear();
        nextPid_ = 1;
        nextTid_ = 1;
    }

private:
    const ProcessControlBlock* findProcessConst(int pid) const {
        for (auto& p : processes_)
            if (p.pid == pid) return &p;
        return nullptr;
    }

    std::vector<ProcessControlBlock> processes_;
    int nextPid_ = 1;
    int nextTid_ = 1;
};
