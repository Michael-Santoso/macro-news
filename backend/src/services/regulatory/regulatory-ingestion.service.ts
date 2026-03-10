import { storeRegulatoryAnnouncements } from "./regulatory-announcement.repository";
import { fetchRegulatoryAnnouncements } from "./regulatory-sources.client";

export async function ingestRegulatoryAnnouncements(): Promise<{
  announcements: number;
  stored: number;
}> {
  const announcements = await fetchRegulatoryAnnouncements();
  const storedCount = await storeRegulatoryAnnouncements(announcements);

  return {
    announcements: announcements.length,
    stored: storedCount,
  };
}
