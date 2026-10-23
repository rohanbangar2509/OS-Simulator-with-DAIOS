#include "sync/producer_consumer.h"
#include "sync/readers_writers.h"
#include "sync/dining_philosophers.h"
#include "sync/sleeping_barber.h"
#include "common/display.h"

void runSyncPlayground() {
    Display::printHeader("MODULE 3: SYNCHRONIZATION PLAYGROUND");

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Producer-Consumer");
        Display::printMenuOption(2, "Readers-Writers");
        Display::printMenuOption(3, "Dining Philosophers");
        Display::printMenuOption(4, "Sleeping Barber");
        Display::printMenuOption(0, "Back to Main Menu");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-4]: ", 0, 4);
        if (ch == 0) return;

        if (ch == 1) {
            int np = Display::readInt("Number of producers [1-5]: ", 1, 5);
            int nc = Display::readInt("Number of consumers [1-5]: ", 1, 5);
            int bs = Display::readInt("Buffer size [1-20]: ", 1, 20);
            int items = Display::readInt("Total items to produce [1-50]: ", 1, 50);
            runProducerConsumer(np, nc, bs, items);
        }
        else if (ch == 2) {
            int nr = Display::readInt("Number of readers [1-5]: ", 1, 5);
            int nw = Display::readInt("Number of writers [1-5]: ", 1, 5);
            int it = Display::readInt("Iterations per thread [1-10]: ", 1, 10);
            runReadersWriters(nr, nw, it);
        }
        else if (ch == 3) {
            int np = Display::readInt("Number of philosophers [2-10]: ", 2, 10);
            int meals = Display::readInt("Meals per philosopher [1-10]: ", 1, 10);
            runDiningPhilosophers(np, meals);
        }
        else if (ch == 4) {
            int chairs = Display::readInt("Number of waiting chairs [1-10]: ", 1, 10);
            int custs = Display::readInt("Number of customers [1-20]: ", 1, 20);
            runSleepingBarber(chairs, custs);
        }
    }
}
