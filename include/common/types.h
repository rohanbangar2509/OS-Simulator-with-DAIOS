#pragma once
#include <string>
#include <vector>

enum class ProcessState { NEW, READY, RUNNING, WAITING, TERMINATED };

inline std::string stateToString(ProcessState s) {
    switch (s) {
        case ProcessState::NEW:        return "NEW";
        case ProcessState::READY:      return "READY";
        case ProcessState::RUNNING:    return "RUNNING";
        case ProcessState::WAITING:    return "WAITING";
        case ProcessState::TERMINATED: return "TERMINATED";
    }
    return "UNKNOWN";
}

struct ThreadControlBlock {
    int tid = 0;
    ProcessState state = ProcessState::NEW;
    int remaining_burst = 0;
};

struct ProcessControlBlock {
    int pid = 0;
    ProcessState state = ProcessState::NEW;
    int burst_time = 0;
    int priority = 0;
    int arrival_time = 0;
    int memory_requirement = 0;
    std::vector<ThreadControlBlock> threads;

    int remaining_burst = 0;
    int waiting_time = 0;
    int turnaround_time = 0;
    int response_time = -1;
    int completion_time = 0;
    int start_time = -1;
};
