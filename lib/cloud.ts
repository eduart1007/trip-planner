import type { SavedPlan } from "./plan";
import type { Progress } from "./rank";
import { supabase } from "./supabase";

export type CloudTrip = { id: string; name: string; updated_at: string };

export type CloudProfile = {
  display_name: string;
  points: number;
  stops: number;
  trips: number;
  walked_meters: number;
  streak: number;
  best_streak: number;
  last_day: string | null;
};

export type LeaderboardRow = {
  rank: number;
  display_name: string;
  points: number;
  is_me: boolean;
};

function client() {
  if (!supabase) throw new Error("Accounts are not set up");
  return supabase;
}

// ---- Saved trips ----
export async function listTrips(): Promise<CloudTrip[]> {
  const { data, error } = await client()
    .from("trips")
    .select("id, name, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadTrip(id: string): Promise<SavedPlan> {
  const { data, error } = await client().from("trips").select("data").eq("id", id).single();
  if (error) throw error;
  return data.data as SavedPlan;
}

export async function saveTrip(name: string, plan: SavedPlan) {
  const { error } = await client().from("trips").insert({ name: name.slice(0, 80), data: plan });
  if (error) throw error;
}

export async function deleteTrip(id: string) {
  const { error } = await client().from("trips").delete().eq("id", id);
  if (error) throw error;
}

// ---- Points, streaks and public name ----
export async function loadProfile(userId: string): Promise<CloudProfile | null> {
  const { data, error } = await client()
    .from("profiles")
    .select("display_name, points, stops, trips, walked_meters, streak, best_streak, last_day")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId: string, progress: Progress) {
  const { error } = await client().from("profiles").upsert(
    {
      user_id: userId,
      points: progress.points,
      stops: progress.stops,
      trips: progress.trips,
      walked_meters: progress.walkedMeters,
      streak: progress.streak,
      best_streak: progress.bestStreak,
      last_day: progress.lastDay || null,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveDisplayName(userId: string, name: string) {
  const { error } = await client()
    .from("profiles")
    .upsert(
      { user_id: userId, display_name: name.trim().slice(0, 30) || "Traveler" },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

// The progress on this device and in your account: keep the higher values
export function mergeProgress(local: Progress, cloud: CloudProfile | null): Progress {
  if (!cloud) return local;
  const cloudDay = cloud.last_day ?? "";
  const cloudIsNewer = cloudDay > local.lastDay;
  const sameDay = cloudDay === local.lastDay;

  return {
    points: Math.max(local.points, cloud.points),
    stops: Math.max(local.stops, cloud.stops),
    trips: Math.max(local.trips, cloud.trips),
    walkedMeters: Math.max(local.walkedMeters, cloud.walked_meters),
    bestStreak: Math.max(local.bestStreak, cloud.best_streak),
    streak: sameDay
      ? Math.max(local.streak, cloud.streak)
      : cloudIsNewer
        ? cloud.streak
        : local.streak,
    lastDay: cloudIsNewer ? cloudDay : local.lastDay,
  };
}

// ---- Leaderboard ----
export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await client().rpc("leaderboard", { limit_count: 20 });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyRank(): Promise<number | null> {
  const { data, error } = await client().rpc("my_rank");
  if (error) throw error;
  return data ?? null;
}
