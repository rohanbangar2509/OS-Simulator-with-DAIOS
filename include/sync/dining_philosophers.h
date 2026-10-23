#pragma once
#include <thread>
#include <vector>
#include <chrono>
#include "sync/semaphore_sim.h"
#include "common/logger.h"
#include "common/display.h"

inline void runDiningPhilosophers(int numPhilosophers, int meals) {
    Display::printSubHeader("Dining Philosophers Problem");
    Logger::instance().reset();

    std::vector<SimSemaphore*> forks;
    for (int i = 0; i < numPhilosophers; i++)
        forks.push_back(new SimSemaphore(1, "Fork-" + std::to_string(i)));

    auto philosopher = [&](int id) {
        std::string name = "Phil-" + std::to_string(id);
        int left = id;
        int right = (id + 1) % numPhilosophers;
        // Prevent deadlock: last philosopher picks right first
        if (id == numPhilosophers - 1) std::swap(left, right);

        for (int m = 0; m < meals; m++) {
            Logger::instance().log("PHIL", name + " is thinking...");
            std::this_thread::sleep_for(std::chrono::milliseconds(30));

            forks[left]->wait(name);
            forks[right]->wait(name);

            Logger::instance().log("PHIL", name + " is eating meal " + std::to_string(m + 1));
            std::this_thread::sleep_for(std::chrono::milliseconds(50));

            forks[right]->signal(name);
            forks[left]->signal(name);
        }
        Logger::instance().log("PHIL", name + " finished all meals.");
    };

    std::vector<std::thread> threads;
    for (int i = 0; i < numPhilosophers; i++)
        threads.emplace_back(philosopher, i);
    for (auto& t : threads) t.join();

    for (auto* f : forks) delete f;
    Display::printSuccess("Dining Philosophers simulation complete.");
}
