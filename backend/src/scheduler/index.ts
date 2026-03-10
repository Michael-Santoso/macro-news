import { env } from "../config/env";
import { runNewsIngestionJob } from "../jobs";

type Scheduler = {
  start: () => void;
  stop: () => void;
};

export function createScheduler(): Scheduler {
  let intervalId: NodeJS.Timeout | null = null;
  let isJobRunning = false;

  const runScheduledIngestion = async (): Promise<void> => {
    if (isJobRunning) {
      return;
    }

    isJobRunning = true;

    try {
      await runNewsIngestionJob();
    } catch (error) {
      console.error("Scheduled news ingestion failed", error);
    } finally {
      isJobRunning = false;
    }
  };

  return {
    start() {
      if (intervalId) {
        return;
      }

      void runScheduledIngestion();
      intervalId = setInterval(() => {
        void runScheduledIngestion();
      }, env.newsIngestionIntervalMs);
    },
    stop() {
      if (!intervalId) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    },
  };
}
