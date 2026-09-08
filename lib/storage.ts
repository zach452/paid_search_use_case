import { AppData } from "./types";

const KEY = "campaign-control-system:v1";

export function loadStoredData(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function saveStoredData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode, quota) — state simply won't persist across reloads.
  }
}

export function exportDataAsFile(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `campaign-control-system-${data.state.today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedFile(text: string): AppData {
  const parsed = JSON.parse(text);
  if (!parsed.state || !parsed.constants || !parsed.dailyData) {
    throw new Error("This file doesn't look like a Campaign Control System export.");
  }
  return parsed as AppData;
}
