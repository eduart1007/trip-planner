const STORAGE_KEY = "trip-planner-guide-seen-v1";

export function guideSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "yes";
  } catch {
    return true; // if storage is blocked, do not show the guide every time
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "yes");
  } catch {
    // ignore
  }
}
