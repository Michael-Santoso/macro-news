type Scheduler = {
  start: () => void;
  stop: () => void;
};

export function createScheduler(): Scheduler {
  return {
    start() {
      // Placeholder only. Scheduled jobs will be added in Phase 2.
    },
    stop() {
      // Placeholder only. Scheduled jobs will be added in Phase 2.
    },
  };
}
