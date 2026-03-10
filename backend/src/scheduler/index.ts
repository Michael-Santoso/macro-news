import { env } from "../config/env";
import {
  runMacroIngestionJob,
  runNewsIngestionJob,
  runOfficialAnnouncementIngestionJob,
  runRegulatoryIngestionJob,
  runUpdateThemeScoresJob,
} from "../jobs";

type Scheduler = {
  start: () => void;
  stop: () => void;
};

const THEME_SCORE_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function createScheduler(): Scheduler {
  let newsIntervalId: NodeJS.Timeout | null = null;
  let macroIntervalId: NodeJS.Timeout | null = null;
  let officialAnnouncementIntervalId: NodeJS.Timeout | null = null;
  let regulatoryIntervalId: NodeJS.Timeout | null = null;
  let themeScoreIntervalId: NodeJS.Timeout | null = null;
  let isNewsJobRunning = false;
  let isMacroJobRunning = false;
  let isOfficialAnnouncementJobRunning = false;
  let isRegulatoryJobRunning = false;
  let isThemeScoreJobRunning = false;

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

  const runScheduledOfficialAnnouncementIngestion = async (): Promise<void> => {
    if (isOfficialAnnouncementJobRunning) {
      return;
    }

    isOfficialAnnouncementJobRunning = true;

    try {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled official announcement ingestion run`,
      );
      await runOfficialAnnouncementIngestionJob();
    } catch (error) {
      console.error("Scheduled official announcement ingestion failed", error);
    } finally {
      isOfficialAnnouncementJobRunning = false;
    }
  };

  const runScheduledRegulatoryIngestion = async (): Promise<void> => {
    if (isRegulatoryJobRunning) {
      return;
    }

    isRegulatoryJobRunning = true;

    try {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled regulatory ingestion run`,
      );
      await runRegulatoryIngestionJob();
    } catch (error) {
      console.error("Scheduled regulatory ingestion failed", error);
    } finally {
      isRegulatoryJobRunning = false;
    }
  };

  const runScheduledThemeScoreUpdate = async (): Promise<void> => {
    if (isThemeScoreJobRunning) {
      return;
    }

    isThemeScoreJobRunning = true;

    try {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled theme score update run`,
      );
      await runUpdateThemeScoresJob();
    } catch (error) {
      console.error("Scheduled theme score update failed", error);
    } finally {
      isThemeScoreJobRunning = false;
    }
  };

  return {
    start() {
      if (
        newsIntervalId ||
        macroIntervalId ||
        officialAnnouncementIntervalId ||
        regulatoryIntervalId ||
        themeScoreIntervalId
      ) {
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

      void runScheduledOfficialAnnouncementIngestion();
      officialAnnouncementIntervalId = setInterval(() => {
        void runScheduledOfficialAnnouncementIngestion();
      }, env.officialAnnouncementIngestionIntervalMs);

      void runScheduledRegulatoryIngestion();
      regulatoryIntervalId = setInterval(() => {
        void runScheduledRegulatoryIngestion();
      }, env.regulatoryIngestionIntervalMs);

      void runScheduledThemeScoreUpdate();
      themeScoreIntervalId = setInterval(() => {
        void runScheduledThemeScoreUpdate();
      }, THEME_SCORE_UPDATE_INTERVAL_MS);
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

      if (officialAnnouncementIntervalId) {
        clearInterval(officialAnnouncementIntervalId);
        officialAnnouncementIntervalId = null;
      }

      if (regulatoryIntervalId) {
        clearInterval(regulatoryIntervalId);
        regulatoryIntervalId = null;
      }

      if (themeScoreIntervalId) {
        clearInterval(themeScoreIntervalId);
        themeScoreIntervalId = null;
      }
    },
  };
}
