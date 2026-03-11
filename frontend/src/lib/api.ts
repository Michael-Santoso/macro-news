import type {
  EventsResponse,
  MacroReleaseSort,
  MacroReleasesResponse,
  MacroThemeKey,
  ThemeDetailResponse,
  ThemeListResponse,
  ThemeSort,
  ThemeTimelineSort,
} from "@/src/types/dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchJson<T>(
  path: string,
  options?: {
    query?: Record<string, QueryValue>;
    signal?: AbortSignal;
    cache?: RequestCache;
  },
): Promise<T> {
  const response = await fetch(buildUrl(path, options?.query), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: options?.signal,
    cache: options?.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep the status-derived message if the body is absent or malformed.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getThemes(params?: {
  region?: string;
  page?: number;
  limit?: number;
  sort?: ThemeSort;
  signal?: AbortSignal;
}) {
  return fetchJson<ThemeListResponse>("/api/v1/themes", {
    query: {
      region: params?.region,
      page: params?.page,
      limit: params?.limit,
      sort: params?.sort,
    },
    signal: params?.signal,
  });
}

export function getThemeDetails(params: {
  theme: MacroThemeKey;
  region?: string;
  page?: number;
  limit?: number;
  sort?: ThemeTimelineSort;
  signal?: AbortSignal;
}) {
  return fetchJson<ThemeDetailResponse>(`/api/v1/themes/${params.theme}`, {
    query: {
      region: params.region,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
    },
    signal: params.signal,
  });
}

export function getEvents(params?: {
  theme?: MacroThemeKey;
  region?: string;
  page?: number;
  limit?: number;
  sort?: ThemeTimelineSort;
  signal?: AbortSignal;
}) {
  return fetchJson<EventsResponse>("/api/v1/events", {
    query: {
      theme: params?.theme,
      region: params?.region,
      page: params?.page,
      limit: params?.limit,
      sort: params?.sort,
    },
    signal: params?.signal,
  });
}

export function getMacroReleases(params?: {
  page?: number;
  limit?: number;
  sort?: MacroReleaseSort;
  signal?: AbortSignal;
}) {
  return fetchJson<MacroReleasesResponse>("/api/v1/macro/releases", {
    query: {
      page: params?.page,
      limit: params?.limit,
      sort: params?.sort,
    },
    signal: params?.signal,
  });
}
