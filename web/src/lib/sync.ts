import { LogEntry } from "./types";

type LogFn = (entry: LogEntry) => void;

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function runProducerConsumer(
  log: LogFn, bufSize: number, numItems: number, speed: number, signal: { stop: boolean }
) {
  const buffer: number[] = [];
  let mutexLocked = false, mutexHolder = "";
  let t = 0;
  const tick = () => ++t;
  const wait = () => delay(Math.max(50, 400 / speed));
  let emptySlots = bufSize; // semaphore: counts empty slots
  let fullSlots = 0;        // semaphore: counts filled slots

  const acquireMutex = async (who: string) => {
    while (mutexLocked && !signal.stop) {
      log({ time: tick(), tag: who, message: `🔒 mutex.lock() — BLOCKED (held by ${mutexHolder})` });
      await wait();
    }
    if (signal.stop) return false;
    mutexLocked = true;
    mutexHolder = who;
    log({ time: tick(), tag: who, message: "🔒 mutex.lock() — ACQUIRED" });
    return true;
  };
  const releaseMutex = (who: string) => {
    mutexLocked = false;
    mutexHolder = "";
    log({ time: tick(), tag: who, message: "🔓 mutex.unlock() — RELEASED" });
  };

  const produce = async () => {
    for (let i = 1; i <= numItems && !signal.stop; i++) {
      // sem_wait(empty)
      while (emptySlots <= 0 && !signal.stop) {
        log({ time: tick(), tag: "Producer", message: `⏳ sem_wait(empty) — BLOCKED (empty=0, buffer full ${buffer.length}/${bufSize})` });
        await wait();
      }
      if (signal.stop) return;
      emptySlots--;
      log({ time: tick(), tag: "Producer", message: `✅ sem_wait(empty) — PASSED (empty=${emptySlots})` });

      if (!(await acquireMutex("Producer"))) return;
      buffer.push(i);
      log({ time: tick(), tag: "Producer", message: `📦 Produced item ${i} → buffer [${buffer.join(",")}]` });
      releaseMutex("Producer");

      // sem_signal(full)
      fullSlots++;
      log({ time: tick(), tag: "Producer", message: `📢 sem_signal(full) — full=${fullSlots}` });
      await wait();
    }
  };

  const consume = async () => {
    let consumed = 0;
    while (consumed < numItems && !signal.stop) {
      // sem_wait(full)
      while (fullSlots <= 0 && !signal.stop) {
        log({ time: tick(), tag: "Consumer", message: `⏳ sem_wait(full) — BLOCKED (full=0, buffer empty)` });
        await wait();
      }
      if (signal.stop) return;
      fullSlots--;
      log({ time: tick(), tag: "Consumer", message: `✅ sem_wait(full) — PASSED (full=${fullSlots})` });

      if (!(await acquireMutex("Consumer"))) return;
      const item = buffer.shift()!;
      consumed++;
      log({ time: tick(), tag: "Consumer", message: `📤 Consumed item ${item} ← buffer [${buffer.join(",")}]` });
      releaseMutex("Consumer");

      // sem_signal(empty)
      emptySlots++;
      log({ time: tick(), tag: "Consumer", message: `📢 sem_signal(empty) — empty=${emptySlots}` });
      await wait();
    }
  };

  log({ time: tick(), tag: "System", message: `Starting Producer-Consumer — mutex + 2 semaphores (empty=${bufSize}, full=0), buffer=${bufSize}` });
  await Promise.all([produce(), consume()]);
  if (!signal.stop) log({ time: tick(), tag: "System", message: "Producer-Consumer complete" });
}

export async function runReadersWriters(
  log: LogFn, numReaders: number, numWriters: number, speed: number, signal: { stop: boolean }
) {
  let readerCount = 0;
  let rwLocked = false, rwHolder = "";
  let rcMutexLocked = false, rcMutexHolder = "";
  let t = 0;
  const tick = () => ++t;
  const wait = () => delay(Math.max(50, 500 / speed));

  const acquireRW = async (who: string) => {
    while (rwLocked && !signal.stop) {
      log({ time: tick(), tag: who, message: `🔒 rw_mutex.lock() — BLOCKED (held by ${rwHolder})` });
      await wait();
    }
    if (signal.stop) return false;
    rwLocked = true;
    rwHolder = who;
    log({ time: tick(), tag: who, message: "🔒 rw_mutex.lock() — ACQUIRED" });
    return true;
  };
  const releaseRW = (who: string) => {
    rwLocked = false;
    rwHolder = "";
    log({ time: tick(), tag: who, message: "🔓 rw_mutex.unlock() — RELEASED" });
  };

  const acquireRC = async (who: string) => {
    while (rcMutexLocked && !signal.stop) {
      log({ time: tick(), tag: who, message: `🔒 rc_mutex.lock() — BLOCKED (held by ${rcMutexHolder})` });
      await wait();
    }
    if (signal.stop) return false;
    rcMutexLocked = true;
    rcMutexHolder = who;
    log({ time: tick(), tag: who, message: "🔒 rc_mutex.lock() — ACQUIRED (protects reader_count)" });
    return true;
  };
  const releaseRC = (who: string) => {
    rcMutexLocked = false;
    rcMutexHolder = "";
    log({ time: tick(), tag: who, message: "🔓 rc_mutex.unlock() — RELEASED" });
  };

  log({ time: tick(), tag: "System", message: `Starting Readers-Writers — rw_mutex (exclusive write access) + rc_mutex (protects reader_count)` });

  const reader = async (id: number) => {
    const who = `R${id}`;
    for (let ops = 0; ops < 3 && !signal.stop; ops++) {
      if (!(await acquireRC(who))) return;
      readerCount++;
      log({ time: tick(), tag: who, message: `reader_count++ → ${readerCount}` });
      if (readerCount === 1) {
        releaseRC(who);
        log({ time: tick(), tag: who, message: "First reader — must lock rw_mutex to block writers" });
        if (!(await acquireRW(who))) return;
      } else {
        releaseRC(who);
      }

      log({ time: tick(), tag: who, message: `📖 Reading... (active readers: ${readerCount})` });
      await wait();

      if (!(await acquireRC(who))) return;
      readerCount--;
      log({ time: tick(), tag: who, message: `reader_count-- → ${readerCount}` });
      if (readerCount === 0) {
        releaseRC(who);
        log({ time: tick(), tag: who, message: "Last reader — releasing rw_mutex for writers" });
        releaseRW(who);
      } else {
        releaseRC(who);
      }
      await wait();
    }
  };

  const writer = async (id: number) => {
    const who = `W${id}`;
    for (let ops = 0; ops < 2 && !signal.stop; ops++) {
      log({ time: tick(), tag: who, message: "Requesting exclusive rw_mutex..." });
      if (!(await acquireRW(who))) return;
      log({ time: tick(), tag: who, message: "✏️  Writing... (exclusive access)" });
      await wait();
      releaseRW(who);
      log({ time: tick(), tag: who, message: "Done writing" });
      await wait();
    }
  };

  const tasks: Promise<void>[] = [];
  for (let i = 1; i <= numReaders; i++) tasks.push(reader(i));
  for (let i = 1; i <= numWriters; i++) tasks.push(writer(i));
  await Promise.all(tasks);
  if (!signal.stop) log({ time: tick(), tag: "System", message: "Readers-Writers complete" });
}

export async function runDiningPhilosophers(
  log: LogFn, numPhilosophers: number, speed: number, signal: { stop: boolean }
) {
  const forkMutex = new Array(numPhilosophers).fill(false);
  const forkHolder = new Array(numPhilosophers).fill("");
  let t = 0;
  const tick = () => ++t;
  const wait = () => delay(Math.max(50, 500 / speed));

  log({ time: tick(), tag: "System", message: `Starting Dining Philosophers (${numPhilosophers}) — each fork is a mutex, ordered lock to prevent deadlock` });

  const acquireFork = async (forkId: number, who: string) => {
    while (forkMutex[forkId] && !signal.stop) {
      log({ time: tick(), tag: who, message: `🔒 fork[${forkId}].lock() — BLOCKED (held by ${forkHolder[forkId]})` });
      await wait();
    }
    if (signal.stop) return false;
    forkMutex[forkId] = true;
    forkHolder[forkId] = who;
    log({ time: tick(), tag: who, message: `🔒 fork[${forkId}].lock() — ACQUIRED` });
    return true;
  };
  const releaseFork = (forkId: number, who: string) => {
    forkMutex[forkId] = false;
    forkHolder[forkId] = "";
    log({ time: tick(), tag: who, message: `🔓 fork[${forkId}].unlock() — RELEASED` });
  };

  const philosopher = async (id: number) => {
    const who = `P${id}`;
    const left = id;
    const right = (id + 1) % numPhilosophers;
    // ordered locking to prevent deadlock
    const [first, second] = id % 2 === 0 ? [left, right] : [right, left];

    for (let meal = 0; meal < 3 && !signal.stop; meal++) {
      log({ time: tick(), tag: who, message: `💭 Thinking... (forks needed: ${first}, ${second})` });
      await wait();

      log({ time: tick(), tag: who, message: `Trying fork[${first}] first (ordered locking)` });
      if (!(await acquireFork(first, who))) return;

      log({ time: tick(), tag: who, message: `Trying fork[${second}] second` });
      if (!(await acquireFork(second, who))) {
        releaseFork(first, who);
        return;
      }

      log({ time: tick(), tag: who, message: `🍝 Eating meal ${meal + 1}/3 (holding forks ${first} & ${second})` });
      await wait();

      releaseFork(second, who);
      releaseFork(first, who);
    }
  };

  await Promise.all(Array.from({ length: numPhilosophers }, (_, i) => philosopher(i)));
  if (!signal.stop) log({ time: tick(), tag: "System", message: "Dining Philosophers complete — no deadlock (ordered locking)" });
}

export async function runSleepingBarber(
  log: LogFn, numChairs: number, numCustomers: number, speed: number, signal: { stop: boolean }
) {
  const waiting: number[] = [];
  let barberSleeping = true, currentCustomer = -1, t = 0, served = 0;
  let seatMutexLocked = false, seatMutexHolder = "";
  // Semaphores
  let customerReady = 0; // signaled when a customer sits
  let barberReady = 0;   // signaled when barber is free
  const tick = () => ++t;
  const wait = () => delay(Math.max(50, 500 / speed));

  const acquireSeatMutex = async (who: string) => {
    while (seatMutexLocked && !signal.stop) {
      log({ time: tick(), tag: who, message: `🔒 seat_mutex.lock() — BLOCKED (held by ${seatMutexHolder})` });
      await wait();
    }
    if (signal.stop) return false;
    seatMutexLocked = true;
    seatMutexHolder = who;
    log({ time: tick(), tag: who, message: "🔒 seat_mutex.lock() — ACQUIRED (protects waiting chairs)" });
    return true;
  };
  const releaseSeatMutex = (who: string) => {
    seatMutexLocked = false;
    seatMutexHolder = "";
    log({ time: tick(), tag: who, message: "🔓 seat_mutex.unlock() — RELEASED" });
  };

  log({ time: tick(), tag: "System", message: `Starting Sleeping Barber — seat_mutex + 2 semaphores (customer_ready, barber_ready), chairs=${numChairs}` });

  const barber = async () => {
    while (served < numCustomers && !signal.stop) {
      // sem_wait(customer_ready)
      while (customerReady <= 0 && served < numCustomers && !signal.stop) {
        barberSleeping = true;
        log({ time: tick(), tag: "Barber", message: "⏳ sem_wait(customer_ready) — BLOCKED (no customers, sleeping...)" });
        await wait();
      }
      if (signal.stop || served >= numCustomers) return;
      customerReady--;
      barberSleeping = false;
      log({ time: tick(), tag: "Barber", message: `✅ sem_wait(customer_ready) — WOKE UP (customer_ready=${customerReady})` });

      if (!(await acquireSeatMutex("Barber"))) return;
      currentCustomer = waiting.shift()!;
      log({ time: tick(), tag: "Barber", message: `Picked customer ${currentCustomer} from chair (waiting: ${waiting.length}/${numChairs})` });
      releaseSeatMutex("Barber");

      // sem_signal(barber_ready)
      barberReady++;
      log({ time: tick(), tag: "Barber", message: `📢 sem_signal(barber_ready) — barber_ready=${barberReady}` });

      log({ time: tick(), tag: "Barber", message: `✂️  Cutting hair of customer ${currentCustomer}...` });
      await wait();
      log({ time: tick(), tag: "Barber", message: `✅ Finished customer ${currentCustomer}` });
      served++;
      currentCustomer = -1;
    }
  };

  const customer = async (id: number) => {
    const who = `C${id}`;
    await delay(Math.random() * (800 / speed));
    if (signal.stop) return;

    if (!(await acquireSeatMutex(who))) return;
    if (waiting.length < numChairs) {
      waiting.push(id);
      log({ time: tick(), tag: who, message: `🪑 Sat in waiting chair (${waiting.length}/${numChairs})` });
      releaseSeatMutex(who);

      // sem_signal(customer_ready)
      customerReady++;
      log({ time: tick(), tag: who, message: `📢 sem_signal(customer_ready) — customer_ready=${customerReady}` });
      if (barberSleeping) log({ time: tick(), tag: who, message: "Waking up barber!" });

      // sem_wait(barber_ready) — wait until barber calls me
      while (barberReady <= 0 && !signal.stop) {
        log({ time: tick(), tag: who, message: "⏳ sem_wait(barber_ready) — waiting for barber to be free..." });
        await wait();
      }
      if (signal.stop) return;
      barberReady--;
      log({ time: tick(), tag: who, message: `✅ sem_wait(barber_ready) — getting haircut!` });
    } else {
      log({ time: tick(), tag: who, message: `🚫 No free chairs (${waiting.length}/${numChairs}) — leaving!` });
      releaseSeatMutex(who);
      served++;
    }
  };

  const barberP = barber();
  for (let i = 1; i <= numCustomers && !signal.stop; i++) {
    await customer(i);
  }
  await barberP;
  if (!signal.stop) log({ time: tick(), tag: "System", message: "Sleeping Barber complete" });
}
