#pragma once
#include <mutex>
#include <condition_variable>
#include <string>
#include "common/logger.h"

class SimMonitor {
public:
    explicit SimMonitor(const std::string& name = "Monitor") : name_(name) {}

    void enter(const std::string& caller = "") {
        Logger::instance().log("SYNC", caller + " entering " + name_);
        mtx_.lock();
        Logger::instance().log("SYNC", caller + " inside " + name_);
    }

    void leave(const std::string& caller = "") {
        mtx_.unlock();
        Logger::instance().log("SYNC", caller + " left " + name_);
    }

    void wait(std::unique_lock<std::mutex>& lk, const std::string& caller = "") {
        Logger::instance().log("SYNC", caller + " waiting in " + name_);
        cv_.wait(lk);
        Logger::instance().log("SYNC", caller + " woke up in " + name_);
    }

    void notify(const std::string& caller = "") {
        cv_.notify_one();
        Logger::instance().log("SYNC", caller + " notified in " + name_);
    }

    void notifyAll(const std::string& caller = "") {
        cv_.notify_all();
        Logger::instance().log("SYNC", caller + " notified all in " + name_);
    }

    std::mutex& mutex() { return mtx_; }

private:
    std::mutex mtx_;
    std::condition_variable cv_;
    std::string name_;
};
