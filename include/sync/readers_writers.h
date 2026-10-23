#pragma once
#include <thread>
#include <chrono>
#include <atomic>
#include "sync/semaphore_sim.h"
#include "sync/mutex_sim.h"
#include "common/logger.h"
#include "common/display.h"

inline void runReadersWriters(int numReaders, int numWriters, int iterations) {
    Display::printSubHeader("Readers-Writers Problem");
    Logger::instance().reset();

    SimSemaphore rwLock(1, "RW-Lock");
    SimMutex readerMtx("ReaderCountMutex");
    int readerCount = 0;
    int sharedData = 0;

    auto reader = [&](int id) {
        std::string name = "Reader-" + std::to_string(id);
        for (int i = 0; i < iterations; i++) {
            readerMtx.lock(name);
            readerCount++;
            if (readerCount == 1) rwLock.wait(name);
            readerMtx.unlock(name);

            Logger::instance().log("READ", name + " reading data = " + std::to_string(sharedData));
            std::this_thread::sleep_for(std::chrono::milliseconds(40));

            readerMtx.lock(name);
            readerCount--;
            if (readerCount == 0) rwLock.signal(name);
            readerMtx.unlock(name);

            std::this_thread::sleep_for(std::chrono::milliseconds(30));
        }
    };

    auto writer = [&](int id) {
        std::string name = "Writer-" + std::to_string(id);
        for (int i = 0; i < iterations; i++) {
            rwLock.wait(name);
            sharedData++;
            Logger::instance().log("WRITE", name + " wrote data = " + std::to_string(sharedData));
            std::this_thread::sleep_for(std::chrono::milliseconds(60));
            rwLock.signal(name);
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }
    };

    std::vector<std::thread> threads;
    for (int i = 0; i < numReaders; i++)
        threads.emplace_back(reader, i + 1);
    for (int i = 0; i < numWriters; i++)
        threads.emplace_back(writer, i + 1);
    for (auto& t : threads) t.join();

    Display::printSuccess("Readers-Writers simulation complete. Final data = " + std::to_string(sharedData));
}
