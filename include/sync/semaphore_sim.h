#pragma once
#include <mutex>
#include <condition_variable>
#include <string>
#include "common/logger.h"

class SimSemaphore {
public:
    SimSemaphore(int initial, const std::string& name = "Semaphore")
        : count_(initial), name_(name) {}

    void wait(const std::string& caller = "") {
        std::unique_lock<std::mutex> lk(mtx_);
        Logger::instance().log("SYNC", caller + " waiting on " + name_ + " (count=" + std::to_string(count_) + ")");
        cv_.wait(lk, [this]{ return count_ > 0; });
        count_--;
        Logger::instance().log("SYNC", caller + " passed " + name_ + " (count=" + std::to_string(count_) + ")");
    }

    void signal(const std::string& caller = "") {
        std::lock_guard<std::mutex> lk(mtx_);
        count_++;
        Logger::instance().log("SYNC", caller + " signaled " + name_ + " (count=" + std::to_string(count_) + ")");
        cv_.notify_one();
    }

private:
    std::mutex mtx_;
    std::condition_variable cv_;
    int count_;
    std::string name_;
};
