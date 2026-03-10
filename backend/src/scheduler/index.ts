import { env } from "../config/env";
import {
  runCentralBankIngestionJob,
  runMacroIngestionJob,
  runNewsIngestionJob,
} from "../jobs";

type Scheduler = {
  start: () => void;
  stop: () => void;
};

export function createScheduler(): Scheduler {
  let newsIntervalId: NodeJS.Timeout | null = null;
  let macroIntervalId: NodeJS.Timeout | null = null;
  let centralBankIntervalId: NodeJS.Timeout | null = null;
  let isNewsJobRunning = false;
  let isMacroJobRunning = false;
  let isCentralBankJobRunning = false;

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

  const runScheduledCentralBankIngestion = async (): Promise<void> => {
    if (isCentralBankJobRunning) {
      return;
    }

    isCentralBankJobRunning = true;

    try {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled central bank ingestion run`,
      );
      await runCentralBankIngestionJob();
    } catch (error) {
      console.error("Scheduled central bank ingestion failed", error);
    } finally {
      isCentralBankJobRunning = false;
    }
  };

  return {
    start() {
      if (newsIntervalId || macroIntervalId || centralBankIntervalId) {
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

      void runScheduledCentralBankIngestion();
      centralBankIntervalId = setInterval(() => {
        void runScheduledCentralBankIngestion();
      }, env.fedIngestionIntervalMs);
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

      if (centralBankIntervalId) {
        clearInterval(centralBankIntervalId);
        centralBankIntervalId = null;
      }
    },
  };
}
