#pragma once
#include <vector>
#include <string>
#include <iostream>
#include "common/display.h"

class BankersAlgorithm {
public:
    BankersAlgorithm(int numProcesses, int numResources)
        : n_(numProcesses), m_(numResources),
          allocation_(numProcesses, std::vector<int>(numResources, 0)),
          max_(numProcesses, std::vector<int>(numResources, 0)),
          available_(numResources, 0) {}

    void setAllocation(int pid, const std::vector<int>& alloc) {
        allocation_[pid] = alloc;
    }

    void setMax(int pid, const std::vector<int>& mx) {
        max_[pid] = mx;
    }

    void setAvailable(const std::vector<int>& avail) {
        available_ = avail;
    }

    bool isSafe(std::vector<int>& safeSeq) const {
        std::vector<std::vector<int>> need(n_, std::vector<int>(m_));
        for (int i = 0; i < n_; i++)
            for (int j = 0; j < m_; j++)
                need[i][j] = max_[i][j] - allocation_[i][j];

        std::vector<int> work = available_;
        std::vector<bool> finish(n_, false);
        safeSeq.clear();

        for (int count = 0; count < n_; count++) {
            bool found = false;
            for (int i = 0; i < n_; i++) {
                if (finish[i]) continue;
                bool canRun = true;
                for (int j = 0; j < m_; j++) {
                    if (need[i][j] > work[j]) { canRun = false; break; }
                }
                if (canRun) {
                    for (int j = 0; j < m_; j++)
                        work[j] += allocation_[i][j];
                    finish[i] = true;
                    safeSeq.push_back(i);
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    void displayMatrices() const {
        auto printMatrix = [&](const std::string& title, const std::vector<std::vector<int>>& mat) {
            std::cout << Display::Color::BOLD << title << ":\n" << Display::Color::RESET;
            for (int i = 0; i < n_; i++) {
                std::cout << "  P" << i << ": ";
                for (int j = 0; j < m_; j++)
                    std::cout << mat[i][j] << " ";
                std::cout << "\n";
            }
        };

        printMatrix("Allocation", allocation_);
        printMatrix("Max", max_);

        std::vector<std::vector<int>> need(n_, std::vector<int>(m_));
        for (int i = 0; i < n_; i++)
            for (int j = 0; j < m_; j++)
                need[i][j] = max_[i][j] - allocation_[i][j];
        printMatrix("Need", need);

        std::cout << Display::Color::BOLD << "Available: " << Display::Color::RESET;
        for (int j = 0; j < m_; j++)
            std::cout << available_[j] << " ";
        std::cout << "\n";
    }

private:
    int n_, m_;
    std::vector<std::vector<int>> allocation_;
    std::vector<std::vector<int>> max_;
    std::vector<int> available_;
};
