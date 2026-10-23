#pragma once
#include <thread>
#include <chrono>
#include <atomic>
#include "sync/semaphore_sim.h"
#include "sync/mutex_sim.h"
#include "common/logger.h"
#include "common/display.h"

inline void runSleepingBarber(int numChairs, int numCustomers) {
    Display::printSubHeader("Sleeping Barber Problem");
    Logger::instance().reset();

    SimSemaphore customers(0, "Customers");
    SimSemaphore barberReady(0, "BarberReady");
    SimMutex seatMtx("SeatMutex");
    int freeSeats = numChairs;
    std::atomic<int> served{0};
    std::atomic<bool> shopOpen{true};

    auto barber = [&]() {
        std::string name = "Barber";
        while (shopOpen.load() || served.load() < numCustomers) {
            customers.wait(name);
            seatMtx.lock(name);
            freeSeats++;
            Logger::instance().log("BARBER", name + " called next customer (free seats=" + std::to_string(freeSeats) + ")");
            barberReady.signal(name);
            seatMtx.unlock(name);

            Logger::instance().log("BARBER", name + " is cutting hair...");
            std::this_thread::sleep_for(std::chrono::milliseconds(80));
            served.fetch_add(1);
            Logger::instance().log("BARBER", name + " finished haircut (" + std::to_string(served.load()) + "/" + std::to_string(numCustomers) + ")");
            if (served.load() >= numCustomers) break;
        }
    };

    auto customer = [&](int id) {
        std::string name = "Customer-" + std::to_string(id);
        std::this_thread::sleep_for(std::chrono::milliseconds(id * 30));
        seatMtx.lock(name);
        if (freeSeats > 0) {
            freeSeats--;
            Logger::instance().log("CUST", name + " sat down (free seats=" + std::to_string(freeSeats) + ")");
            customers.signal(name);
            seatMtx.unlock(name);
            barberReady.wait(name);
            Logger::instance().log("CUST", name + " is getting haircut.");
        } else {
            seatMtx.unlock(name);
            Logger::instance().log("CUST", name + " left (no free seats).");
        }
    };

    std::thread barberThread(barber);
    std::vector<std::thread> custThreads;
    for (int i = 0; i < numCustomers; i++)
        custThreads.emplace_back(customer, i + 1);
    for (auto& t : custThreads) t.join();
    shopOpen.store(false);
    customers.signal("System");
    barberThread.join();

    Display::printSuccess("Sleeping Barber simulation complete. Served: " + std::to_string(served.load()));
}
