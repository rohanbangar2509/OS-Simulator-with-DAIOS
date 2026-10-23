#pragma once
#include <vector>
#include <set>
#include <map>
#include <string>
#include <iostream>
#include "common/display.h"

class ResourceGraph {
public:
    void addProcess(int pid) {
        processes_.insert(pid);
    }

    void addResource(int rid) {
        resources_.insert(rid);
    }

    void addAssignment(int rid, int pid) {
        assignment_[rid] = pid;
    }

    void removeAssignment(int rid) {
        assignment_.erase(rid);
    }

    void addRequest(int pid, int rid) {
        request_[pid].insert(rid);
    }

    void removeRequest(int pid, int rid) {
        request_[pid].erase(rid);
    }

    bool detectCycle(std::vector<int>& cycle) const {
        std::map<int, int> color; // 0=white, 1=gray, 2=black
        for (int p : processes_) color[p] = 0;

        std::vector<int> path;
        for (int p : processes_) {
            if (color[p] == 0) {
                if (dfsCycle(p, color, path, cycle))
                    return true;
            }
        }
        return false;
    }

    void display() const {
        Display::printSubHeader("Resource Allocation Graph");

        std::cout << Display::Color::BOLD << "Processes: " << Display::Color::RESET;
        for (int p : processes_) std::cout << "P" << p << " ";
        std::cout << "\n";

        std::cout << Display::Color::BOLD << "Resources: " << Display::Color::RESET;
        for (int r : resources_) std::cout << "R" << r << " ";
        std::cout << "\n\n";

        std::cout << Display::Color::BOLD << "Assignments (Resource -> Process):\n" << Display::Color::RESET;
        for (auto& [rid, pid] : assignment_)
            std::cout << "  R" << rid << " --> P" << pid << "\n";

        std::cout << Display::Color::BOLD << "\nRequests (Process -> Resource):\n" << Display::Color::RESET;
        for (auto& [pid, rids] : request_)
            for (int rid : rids)
                std::cout << "  P" << pid << " --> R" << rid << "\n";
    }

private:
    bool dfsCycle(int pid, std::map<int,int>& color,
                  std::vector<int>& path, std::vector<int>& cycle) const {
        color[pid] = 1;
        path.push_back(pid);

        auto it = request_.find(pid);
        if (it != request_.end()) {
            for (int rid : it->second) {
                auto ait = assignment_.find(rid);
                if (ait != assignment_.end()) {
                    int holder = ait->second;
                    if (holder == pid) continue;
                    if (color.count(holder) && color[holder] == 1) {
                        cycle.clear();
                        bool found = false;
                        for (int p : path) {
                            if (p == holder) found = true;
                            if (found) cycle.push_back(p);
                        }
                        cycle.push_back(holder);
                        return true;
                    }
                    if (color.count(holder) && color[holder] == 0) {
                        if (dfsCycle(holder, color, path, cycle))
                            return true;
                    }
                }
            }
        }
        path.pop_back();
        color[pid] = 2;
        return false;
    }

    std::set<int> processes_;
    std::set<int> resources_;
    std::map<int, int> assignment_;
    mutable std::map<int, std::set<int>> request_;
};
