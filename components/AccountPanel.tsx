"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  deleteTrip,
  listTrips,
  loadProfile,
  loadTrip,
  saveDisplayName,
  saveTrip,
  type CloudTrip,
} from "@/lib/cloud";
import AccountIcon from "@/components/AccountIcon";
import { t } from "@/lib/i18n";
import type { SavedPlan } from "@/lib/plan";
import { supabase } from "@/lib/supabase";

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
const primaryButton =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";
const lightButton =
  "rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800";

export default function AccountPanel({
  user,
  plan,
  onLoad,
  onSignedOut,
  onClose,
}: {
  user: User | null;
  plan: SavedPlan;
  onLoad: (plan: SavedPlan) => void;
  onSignedOut: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tripName, setTripName] = useState(() => t("myTrip"));
  const [trips, setTrips] = useState<CloudTrip[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const userId = user?.id ?? null;

  // Load your saved trips and your public name once you are signed in
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listTrips()
      .then((list) => {
        if (!cancelled) setTrips(list);
      })
      .catch(() => {});
    loadProfile(userId)
      .then((profile) => {
        if (!cancelled && profile) setName(profile.display_name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setNote("");
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setNote(error.message);
      else if (!data.session) setNote(t("checkEmail"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setNote(error.message);
    }
    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    onSignedOut();
    onClose();
  }

  async function savePublicName() {
    if (!userId) return;
    try {
      await saveDisplayName(userId, name);
      setNote(t("savedOk"));
    } catch {
      setNote(t("wentWrong"));
    }
  }

  async function saveCurrentTrip() {
    if (plan.trip.length === 0) {
      setNote(t("needStops"));
      return;
    }
    try {
      await saveTrip(tripName.trim() || t("myTrip"), plan);
      setTrips(await listTrips());
      setNote(t("savedOk"));
    } catch {
      setNote(t("wentWrong"));
    }
  }

  async function openTrip(id: string) {
    try {
      const saved = await loadTrip(id);
      if (!saved || !Array.isArray(saved.trip)) throw new Error("Bad trip");
      onLoad(saved);
    } catch {
      setNote(t("wentWrong"));
    }
  }

  async function removeTrip(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await deleteTrip(id);
      setTrips((list) => list.filter((x) => x.id !== id));
    } catch {
      setNote(t("wentWrong"));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={t("account")}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100 md:max-w-md md:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AccountIcon className="h-5 w-5 text-sky-400" />
            {t("account")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-xl text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {!supabase ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{t("accountNotSet")}</p>
        ) : !user ? (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="flex gap-2">
              {(["in", "up"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setNote("");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    mode === m
                      ? "border-blue-600 bg-blue-600 font-medium text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {m === "in" ? t("signIn") : t("signUp")}
                </button>
              ))}
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={t("email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
            <button type="submit" disabled={busy} className={`w-full ${primaryButton}`}>
              {busy ? "..." : mode === "in" ? t("signIn") : t("signUp")}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-5">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("signedInAs", { email: user.email ?? "" })}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">✓ {t("pointsSynced")}</p>

            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("publicName")}
              </p>
              <div className="flex gap-2">
                <input
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                />
                <button onClick={savePublicName} className={primaryButton}>
                  {t("saveName")}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("publicNameHint")}</p>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("saveThisTrip")}
              </p>
              <div className="flex gap-2">
                <input
                  value={tripName}
                  maxLength={80}
                  placeholder={t("tripName")}
                  onChange={(e) => setTripName(e.target.value)}
                  className={fieldClass}
                />
                <button onClick={saveCurrentTrip} className={primaryButton}>
                  {t("saveName")}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("savedTrips")}
              </p>
              {trips.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("noSavedTrips")}</p>
              ) : (
                <ul className="space-y-2">
                  {trips.map((trip) => (
                    <li key={trip.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-900 dark:text-gray-100">{trip.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(trip.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => openTrip(trip.id)} className={lightButton}>
                        {t("open")}
                      </button>
                      <button
                        onClick={() => removeTrip(trip.id)}
                        aria-label={t("delete")}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        🗑
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button onClick={signOut} className={`w-full ${lightButton}`}>
              {t("signOut")}
            </button>
          </div>
        )}

        {note && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{note}</p>}
      </div>
    </div>
  );
}
