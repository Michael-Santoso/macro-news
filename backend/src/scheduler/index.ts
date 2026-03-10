import { env } from "../config/env";
import { runMacroIngestionJob, runNewsIngestionJob } from "../jobs";

type Scheduler = {
  start: () => void;
  stop: () => void;
};

export function createScheduler(): Scheduler {
  let newsIntervalId: NodeJS.Timeout | null = null;
  let macroIntervalId: NodeJS.Timeout | null = null;
  let isNewsJobRunning = false;
  let isMacroJobRunning = false;

  const runScheduledNewsIngestion = async (): Promise<void> => {
    if (isNewsJobRunning) {
      return;
    }

    isNewsJobRunning = true;

    try {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled news ingestion run`,
      );
      await runNewsIngestionJob();
    } catch (error) {
      console.error("Scheduled news ingestion failed", error);
    } finally {
      isNewsJobRunning = false;
    }
  };

  const runScheduledMacroIngestion = async (): Promise<void> => {
    if (isMacroJobRunning || !env.fredApiKey) {
      return;
    }

    isMacroJobRunning = true;

    try {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled macro ingestion run`,
      );
      await runMacroIngestionJob();
    } catch (error) {
      console.error("Scheduled macro ingestion failed", error);
    } finally {
      isMacroJobRunning = false;
    }
  };

  return {
    start() {
      if (newsIntervalId || macroIntervalId) {
        return;
      }

      void runScheduledNewsIngestion();
      newsIntervalId = setInterval(() => {
        void runScheduledNewsIngestion();
      }, env.newsIngestionIntervalMs);

      if (env.fredApiKey) {
        void runScheduledMacroIngestion();
        macroIntervalId = setInterval(() => {
          void runScheduledMacroIngestion();
        }, env.fredIngestionIntervalMs);
      }
    },
    stop() {
      if (newsIntervalId) {
        clearInterval(newsIntervalId);
        newsIntervalId = null;
      }

      if (macroIntervalId) {
        clearInterval(macroIntervalId);
        macroIntervalId = null;
      }
    },
  };
}
