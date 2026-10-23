#pragma once
#include <vector>
#include <thread>
#include <chrono>
#include <atomic>
#include "sync/semaphore_sim.h"
#include "sync/mutex_sim.h"
#include "common/logger.h"
#include "common/display.h"

inline void runProducerConsumer(int numProducers, int numConsumers,
                                int bufferSize, int itemsToProduce) {
    Display::printSubHeader("Producer-Consumer Problem");
    Logger::instance().reset();

    std::vector<int> buffer;
    SimMutex bufMtx("BufferMutex");
    SimSemaphore empty(bufferSize, "Empty");
    SimSemaphore full(0, "Full");
    std::atomic<int> produced{0};
    std::atomic<int> consumed{0};
    int totalItems = itemsToProduce;

    auto producer = [&](int id) {
        std::string name = "Producer-" + std::to_string(id);
        while (true) {
            int item = produced.fetch_add(1);
            if (item >= totalItems) break;
            empty.wait(name);
            bufMtx.lock(name);
            buffer.push_back(item);
            Logger::instance().log("PROD", name + " produced item " + std::to_string(item)
                + " [buffer size=" + std::to_string(buffer.size()) + "]");
            bufMtx.unlock(name);
            full.signal(name);
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }
    };

    auto consumer = [&](int id) {
        std::string name = "Consumer-" + std::to_string(id);
        while (true) {
            int c = consumed.fetch_add(1);
            if (c >= totalItems) break;
            full.wait(name);
            bufMtx.lock(name);
            int item = buffer.back();
            buffer.pop_back();
            Logger::instance().log("CONS", name + " consumed item " + std::to_string(item)
                + " [buffer size=" + std::to_string(buffer.size()) + "]");
            bufMtx.unlock(name);
            empty.signal(name);
            std::this_thread::sleep_for(std::chrono::milliseconds(80));
        }
    };

    std::vector<std::thread> threads;
    for (int i = 0; i < numProducers; i++)
        threads.emplace_back(producer, i + 1);
    for (int i = 0; i < numConsumers; i++)
        threads.emplace_back(consumer, i + 1);
    for (auto& t : threads) t.join();

    Display::printSuccess("Producer-Consumer simulation complete.");
}
