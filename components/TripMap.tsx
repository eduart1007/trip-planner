"use client";

import { t, type TKey } from "@/lib/i18n";

import { useEffect, useRef, useState, type FormEvent } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ClickHandler,
  MapBridge,
  PlaceMarker,
  homeIcon,
  stopIcon,
  type StopState,
} from "@/components/MapParts";
import NavigationCard from "@/components/NavigationCard";
import SettingsPanel from "@/components/SettingsPanel";
import WelcomeGuide from "@/components/WelcomeGuide";
import TripPanel from "@/components/TripPanel";
import { playAlarm, prepareAlarm, setVoiceEnabled, speak } from "@/lib/alarm";
import { distanceMeters } from "@/lib/geo";
import { guideSeen, markGuideSeen } from "@/lib/guide";
import { CATEGORIES, findPlaces, prettify, type Category } from "@/lib/overpass";
import { loadPlan, savePlan } from "@/lib/plan";
import {
  TRIP_BONUS,
  getLevel,
  loadProgress,
  pointsForLeg,
  saveProgress,
  type Progress,
} from "@/lib/rank";
import { formatDistance, getRoute, type RouteResult, type TravelMode } from "@/lib/routing";
import { computeSchedule, formatClock, secondsNow, toSeconds, type Schedule } from "@/lib/schedule";
import type { Place } from "@/lib/types";
import {
  applySettings,
  loadSettings,
  saveSettings,
  setCurrentSettings,
  spokenDistance,
  type Settings,
} from "@/lib/settings";
import { fetchWeather, pickHour, type HourlyWeather } from "@/lib/weather";

type NominatimResult = {
  place_id: number;
  name: string;
  type: string;
  display_name: string;
  lat: string;
  lon: string;
};

type RouteState = { key: string; data: RouteResult | null; failed: boolean };
type LegState = { key: string; group: string; data: RouteResult | null };
type UserPosition = { lat: number; lon: number; accuracy: number };
type Reward = { text: string; levelUp?: string };

// Values the GPS callback and the alarm need to read at any time
type TripRun = {
  stops: Place[];
  home: Place | null;
  schedule: Schedule | null;
  position: { lat: number; lon: number } | null;
  index: number;
  mode: TravelMode;
  legStart: { lat: number; lon: number } | null; // where the current leg began
  skipped: number;
  tripPoints: number;
  alarmed: Set<string>;
};

// How close (in metres) you must be to a stop for it to count as reached
const ARRIVE_METERS = 40;
// If you are further than this from the place you should leave, you already left
const LEAVE_RADIUS_METERS = 200;

// Finds a readable name for a point on the map
async function lookupAddress(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lon}`
    );
    const data: { name?: string; display_name?: string } = await res.json();
    if (!data.display_name) return null;
    return {
      name: data.name || data.display_name.split(",").slice(0, 2).join(","),
      address: data.display_name,
    };
  } catch {
    return null;
  }
}

export default function TripMap() {
  const [initial] = useState(() => {
    setCurrentSettings(loadSettings()); // so the first texts use the saved language
    return loadPlan();
  });

  const [map, setMap] = useState<L.Map | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]); // from the search bar
  const [found, setFound] = useState<Place[]>([]); // from the category buttons
  const [dropped, setDropped] = useState<Place | null>(null); // pin dropped by clicking the map
  const [selected, setSelected] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(() => t("tip"));
  const [tab, setTab] = useState<"plan" | "map">("map"); // phone: which view is showing

  // The plan (saved in this browser)
  const [home, setHome] = useState<Place | null>(initial.home);
  const [trip, setTrip] = useState<Place[]>(initial.trip);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [mode, setMode] = useState<TravelMode>(initial.mode);
  const [showRoute, setShowRoute] = useState(true);
  const [routeState, setRouteState] = useState<RouteState | null>(null);

  // Live trip (GPS)
  const [navigating, setNavigating] = useState(false);
  const [tripDone, setTripDone] = useState(false);
  const [navIndex, setNavIndex] = useState(0);
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [legState, setLegState] = useState<LegState | null>(null);
  const [arrivals, setArrivals] = useState<Record<string, number>>({});
  const [alarm, setAlarm] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [myLocation, setMyLocation] = useState<UserPosition | null>(null);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = loadSettings();
    setCurrentSettings(saved);
    return saved;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(() => !guideSeen());
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [weather, setWeather] = useState<{ key: string; data: HourlyWeather[] } | null>(null);

  // Points and ranks
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [tripPoints, setTripPoints] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);

  const droppedRef = useRef<L.Marker>(null);
  const droppedId = dropped?.id;

  const watchId = useRef<number | null>(null);
  const fittedFor = useRef(-1);
  const rewardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spoken = useRef<Set<string>>(new Set());
  const skipFit = useRef(initial.trip.length + (initial.home ? 1 : 0) >= 2);
  const progressRef = useRef<Progress>(progress);
  const latest = useRef<TripRun>({
    stops: [],
    home: null,
    schedule: null,
    position: null,
    index: 0,
    mode: "foot",
    legStart: null,
    skipped: 0,
    tripPoints: 0,
    alarmed: new Set(),
  });

  // Open the popup of a freshly dropped pin
  useEffect(() => {
    if (droppedId) droppedRef.current?.openPopup();
  }, [droppedId]);

  // Move the map when a search result is selected
  useEffect(() => {
    if (map && selected) map.flyTo([selected.lat, selected.lon], 15);
  }, [map, selected]);

  // Leaflet must re-measure the map when it becomes visible again (phone tabs)
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(timer);
  }, [map, tab]);

  // Hide messages after a few seconds so they do not cover the map
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  // Apply the settings (dark mode, text size) to the page
  useEffect(() => {
    applySettings(settings);
    map?.invalidateSize();
  }, [settings, map]);

  // Open the map on your current location
  useEffect(() => {
    if (map) locateMe(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Save the plan and the points in this browser
  useEffect(() => {
    savePlan({ home, trip, startTime, mode });
  }, [home, trip, startTime, mode]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const stops = trip;
  const tripIds = new Set(trip.map((p) => p.id));

  // ---- Route: start point (if any) and all stops, in order ----
  const points = home ? [home, ...stops] : stops;
  const routeKey = points.map((p) => `${p.id}:${p.lat},${p.lon}`).join("|");
  const wantedKey = points.length >= 2 ? `${mode}|${routeKey}` : "";
  const currentRoute = routeState && routeState.key === wantedKey ? routeState : null;
  const route = currentRoute?.data ?? null;
  const routeError = currentRoute?.failed ?? false;
  const routeLoading = wantedKey !== "" && !currentRoute;

  useEffect(() => {
    if (!wantedKey) return;
    let cancelled = false;
    // Short delay so quick changes do not send many requests
    const timer = setTimeout(async () => {
      let state: RouteState;
      try {
        state = { key: wantedKey, data: await getRoute(points, mode), failed: false };
      } catch {
        state = { key: wantedKey, data: null, failed: true };
      }
      if (!cancelled) setRouteState(state);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey]);

  // Zoom the map so the whole route is visible
  // (not for the plan saved from last time, so the map can open on your location)
  useEffect(() => {
    if (map && route && route.path.length > 1) {
      if (skipFit.current) {
        skipFit.current = false;
        return;
      }
      map.fitBounds(route.path, { padding: [60, 60] });
    }
  }, [map, route]);

  // ---- Timing of the whole trip ----
  const schedule: Schedule | null =
    stops.length > 0 && (points.length < 2 || route)
      ? computeSchedule({
          stops,
          hasHome: home !== null,
          legSeconds: route ? route.legs.map((l) => l.duration) : [],
          startAt: toSeconds(startTime) ?? 0,
          arrivals,
          delaySeconds,
        })
      : null;
  const canStart = schedule !== null;

  // ---- Weather at each stop, at the time you arrive ----
  const weatherKey = stops.map((s) => `${s.lat.toFixed(2)},${s.lon.toFixed(2)}`).join("|");
  const currentWeather = weather && weather.key === weatherKey ? weather.data : null;

  useEffect(() => {
    if (!weatherKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const data = await fetchWeather(stops);
      if (!cancelled && data) setWeather({ key: weatherKey, data });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherKey]);

  const stopWeather = stops.map((_, i) => {
    const hours = currentWeather?.[i];
    const arrive = schedule?.items[i]?.arriveAt;
    return hours && arrive !== undefined ? pickHour(hours, arrive) : null;
  });

  // Keep the latest values available for the GPS callback and the alarm
  useEffect(() => {
    latest.current.stops = stops;
    latest.current.home = home;
    latest.current.schedule = schedule;
    latest.current.position = position;
    latest.current.mode = mode;
    progressRef.current = progress;
  });

  // ---- Live trip: route from your position to the current stop ----
  const target = navigating ? stops[navIndex] : undefined;
  const legGroup = target ? `${mode}|${navIndex}|${target.id}` : "";
  const legKey =
    navigating && position && target
      ? `${legGroup}|${position.lat.toFixed(3)},${position.lon.toFixed(3)}`
      : "";
  const liveLeg = navigating && legState && legState.group === legGroup ? legState.data : null;

  useEffect(() => {
    if (!legKey || !position || !target) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let data: RouteResult | null = null;
      try {
        data = await getRoute([position, target], mode, true);
      } catch {
        data = null;
      }
      if (!cancelled) setLegState({ key: legKey, group: legGroup, data });
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legKey]);

  // Zoom to you and the current stop once per stop
  useEffect(() => {
    if (map && navigating && position && target && fittedFor.current !== navIndex) {
      fittedFor.current = navIndex;
      map.fitBounds(
        [
          [position.lat, position.lon],
          [target.lat, target.lon],
        ],
        { padding: [100, 100], maxZoom: 17 }
      );
    }
  }, [map, navigating, position, target, navIndex]);

  // Alarm: check every second while a trip is running
  useEffect(() => {
    if (!navigating) return;
    const timer = setInterval(checkAlarm, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigating]);

  // Next turn: the first step after "depart" in the latest route
  const nextStep = liveLeg?.steps[1];
  let instruction: string | null = null;
  if (nextStep && position) {
    instruction =
      nextStep.arrive
        ? t("stopAhead")
        : t("inDist", { d: formatDistance(distanceMeters(position, nextStep)), text: nextStep.text });
  }

  // Speak the next turn: once when it comes up, and once when it is close
  useEffect(() => {
    if (!navigating || !voiceOn || !nextStep || !position) return;
    const meters = distanceMeters(position, nextStep);
    const base = `${navIndex}|${nextStep.lat.toFixed(5)},${nextStep.lon.toFixed(5)}`;
    const arriving = nextStep.arrive;

    if (meters <= 30 && !spoken.current.has(`${base}|now`)) {
      spoken.current.add(`${base}|now`);
      spoken.current.add(`${base}|far`);
      speak(arriving ? t("stopAhead") : nextStep.text);
    } else if (!spoken.current.has(`${base}|far`)) {
      spoken.current.add(`${base}|far`);
      const how = spokenDistance(meters);
      const text = nextStep.text.charAt(0).toLowerCase() + nextStep.text.slice(1);
      speak(arriving ? t("stopIn", { d: how }) : t("inDistSpoken", { d: how, text }));
    }
  }, [navigating, voiceOn, nextStep, position, navIndex]);

  // What the trip card shows about leaving and arriving
  const prevPoint = navIndex === 0 ? home : stops[navIndex - 1];
  const item = navigating ? schedule?.items[navIndex] : undefined;
  const stillAtPrev =
    !position || !prevPoint || distanceMeters(position, prevPoint) <= LEAVE_RADIUS_METERS;
  const leaveAt = item && item.leaveAt !== null && stillAtPrev ? item.leaveAt : null;

  // ---- Plan actions ----
  function addToTrip(place: Place) {
    setTrip((t) => (t.some((p) => p.id === place.id) ? t : [...t, place]));
  }

  function removeFromTrip(id: string) {
    setTrip((t) => t.filter((p) => p.id !== id));
  }

  function updateStop(id: string, patch: Partial<Place>) {
    setTrip((t) => t.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function moveStop(id: string, direction: -1 | 1) {
    setTrip((t) => {
      const i = t.findIndex((p) => p.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= t.length) return t;
      const copy = [...t];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function setStart(place: Place) {
    setHome({ ...place, id: `home-${place.id}`, category: "Start" });
    setMessage(t("startSet", { name: place.name }));
  }

  function setStartToMyLocation() {
    if (!navigator.geolocation) {
      setMessage(t("noGps"));
      return;
    }
    setMessage(t("findingLocation"));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const id = `home-${Date.now()}`;
        setHome({ id, name: t("myLocation"), category: "Start", lat, lon });
        setMessage(t("startSetLocation"));
        map?.flyTo([lat, lon], 15);
        const info = await lookupAddress(lat, lon);
        if (info) {
          setHome((h) => (h && h.id === id ? { ...h, name: info.name, address: info.address } : h));
        }
      },
      () => setMessage(t("locationFailed")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function closeGuide() {
    markGuideSeen();
    setShowGuide(false);
  }

  function changeSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setCurrentSettings(next); // so distances and times use it right away
    saveSettings(next);
    setSettings(next);
  }

  // Move the map to where you are
  function locateMe(announce: boolean) {
    if (!navigator.geolocation) {
      if (announce) setMessage(t("noGps"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setMyLocation(here);
        map?.setView([here.lat, here.lon], 15);
      },
      () => {
        if (announce) {
          setMessage(t("locationFailed"));
        }
      },
      // The first look-up on opening is quick and cheap; the button asks for a precise one
      { enableHighAccuracy: announce, timeout: 15000, maximumAge: announce ? 0 : 300000 }
    );
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
  }

  // Running late: move the rest of the plan later (or undo it with a negative number)
  function addDelay(minutes: number) {
    setDelaySeconds((d) => Math.max(0, d + minutes * 60));
    // let the leave alarm sound again at the new time
    const run = latest.current;
    const stop = run.stops[run.index];
    if (stop) run.alarmed.delete(stop.id);
    setAlarm(null);
  }

  // ---- Alarm ----
  function checkAlarm() {
    const run = latest.current;
    const next = run.schedule?.items[run.index];
    const stop = run.stops[run.index];
    if (!next || !stop || next.leaveAt === null) return;
    if (run.alarmed.has(stop.id)) return;
    if (secondsNow() < next.leaveAt) return;

    run.alarmed.add(stop.id);

    // No alarm if you already left the previous place
    const from = run.index === 0 ? run.home : run.stops[run.index - 1];
    if (run.position && from && distanceMeters(run.position, from) > LEAVE_RADIUS_METERS) return;

    const text = t("timeToLeave", { name: stop.name });
    playAlarm(text);
    setAlarm(text);
  }

  // ---- GPS trip ----
  function stopWatching() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  function showReward(text: string, levelUp?: string) {
    setReward({ text, levelUp });
    if (rewardTimer.current) clearTimeout(rewardTimer.current);
    rewardTimer.current = setTimeout(() => setReward(null), 6000);
  }

  function finishTrip() {
    stopWatching();
    setNavigating(false);
    setTripDone(true);
  }

  function stopTrip() {
    stopWatching();
    setNavigating(false);
    setTripDone(false);
    setGpsError("");
    setPosition(null);
    setArrivals({});
    setDelaySeconds(0);
    setAlarm(null);
  }

  // Move on to the next stop. "reached" is set when you really arrived, not when you skip.
  function goToNextStop(reached?: { stop: Place; here: { lat: number; lon: number } }) {
    const run = latest.current;
    const isLast = run.index + 1 >= run.stops.length;

    let earned = 0;
    let walked = 0;
    if (reached) {
      // Points depend on how far you travelled for this leg and how you travelled
      const legMeters = run.legStart ? distanceMeters(run.legStart, reached.stop) : 0;
      earned = pointsForLeg(legMeters, run.mode);
      if (earned > 0 && run.mode === "foot") walked = legMeters;
      run.legStart = reached.here;

      // Remember the real arrival time, so the rest of the plan follows it
      setArrivals((a) => ({ ...a, [reached.stop.id]: secondsNow() }));
      setDelaySeconds(0);
      speak(t("arrivedAt", { name: reached.stop.name }));
      setAlarm(null);
    } else {
      run.skipped += 1;
      run.legStart = null; // the next leg starts at your next GPS position
    }

    // Bonus for finishing a trip without skipping any stop
    const tripBonus = reached && isLast && run.skipped === 0 ? TRIP_BONUS : 0;
    const total = earned + tripBonus;

    if (reached) {
      const before = progressRef.current;
      const after: Progress = {
        points: before.points + total,
        stops: before.stops + 1,
        trips: before.trips + (tripBonus > 0 ? 1 : 0),
        walkedMeters: before.walkedMeters + walked,
      };
      progressRef.current = after;
      setProgress(after);

      run.tripPoints += total;
      setTripPoints(run.tripPoints);

      let text =
        earned > 0
          ? t("pointsAt", { n: earned, name: reached.stop.name })
          : t("tooClose", { name: reached.stop.name });
      if (tripBonus > 0) text += ` ${t("tripBonus", { n: tripBonus })}`;

      const levelBefore = getLevel(before.points);
      const levelAfter = getLevel(after.points);
      showReward(
        text,
        levelAfter.level > levelBefore.level
          ? t("levelUp", { n: levelAfter.level, rank: `${levelAfter.rank.emoji} ${levelAfter.rank.name}` })
          : undefined
      );
    }

    if (isLast) {
      finishTrip();
      return;
    }
    run.index += 1;
    setNavIndex(run.index);
  }

  function startTrip() {
    if (!canStart) return;

    // Needed so the browser allows sound and notifications later
    prepareAlarm();
    setTab("map");

    stopWatching();
    const run = latest.current;
    run.index = 0;
    run.legStart = null; // set by the first GPS position
    run.skipped = 0;
    run.tripPoints = 0;
    run.alarmed.clear();
    spoken.current.clear();
    fittedFor.current = -1;
    setNavIndex(0);
    setPosition(null);
    setLegState(null);
    setGpsError("");
    setTripPoints(0);
    setReward(null);
    setAlarm(null);
    setArrivals({});
    setDelaySeconds(0);
    setTripDone(false);
    setNavigating(true);

    if (!navigator.geolocation) {
      setGpsError(t("noGps"));
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setPosition(here);
        setGpsError("");

        const current = latest.current;
        if (!current.legStart) current.legStart = { lat: here.lat, lon: here.lon };

        const stop = current.stops[current.index];
        if (stop && distanceMeters(here, stop) <= ARRIVE_METERS) {
          goToNextStop({ stop, here });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            t("gpsDenied")
          );
          stopWatching();
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError(t("gpsUnavailable"));
        } else {
          setGpsError(t("gpsSlow"));
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }

  function stopState(i: number): StopState {
    if (tripDone) return "done";
    if (!navigating) return "todo";
    if (i < navIndex) return "done";
    if (i === navIndex) return "current";
    return "todo";
  }

  // ---- Search and discovery ----
  async function handlePick(lat: number, lon: number) {
    const id = `custom-${Date.now()}`;
    setDropped({ id, name: t("droppedPin"), category: t("customSpot"), lat, lon });

    // Look up the address in the background and fill it in
    const info = await lookupAddress(lat, lon);
    if (info) {
      setDropped((d) => (d && d.id === id ? { ...d, name: info.name, address: info.address } : d));
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setMessage("");
    setFound([]);
    setActiveCategory(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`
      );
      const data: NominatimResult[] = await res.json();

      const places: Place[] = data.map((r) => ({
        id: String(r.place_id),
        name: r.name || r.display_name.split(",")[0],
        category: prettify(r.type),
        address: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      }));

      setResults(places);
      setSelected(places[0] ?? null);
      if (places.length === 0) setMessage(t("noPlaces"));
    } catch {
      setMessage(t("wentWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCategory(category: Category) {
    if (!map) return;
    if (map.getZoom() < 13) {
      setMessage(t("zoomIn"));
      return;
    }

    const b = map.getBounds();
    setLoading(true);
    setMessage("");
    setResults([]);
    setActiveCategory(category);
    try {
      const places = await findPlaces(category, {
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
      setFound(places);
      setMessage(
        places.length > 0
          ? t("foundPlaces", { n: places.length })
          : t("nothingHere")
      );
    } catch {
      setMessage(t("serverBusy"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <TripPanel
        trip={stops}
        home={home}
        startTime={startTime}
        schedule={schedule}
        route={route}
        routeLoading={routeLoading}
        routeError={routeError}
        showRoute={showRoute}
        mode={mode}
        locked={navigating}
        currentIndex={navIndex}
        canStart={canStart}
        progress={progress}
        visibleOnMobile={tab === "plan"}
        weather={stopWeather}
        onOpenSettings={() => setShowSettings(true)}
        onRemove={removeFromTrip}
        onMove={moveStop}
        onUpdate={updateStop}
        onStartTimeChange={setStartTime}
        onUseMyLocation={setStartToMyLocation}
        onClearHome={() => setHome(null)}
        onToggleRoute={() => setShowRoute((s) => !s)}
        onModeChange={setMode}
        onStart={startTrip}
        onStop={stopTrip}
      />

      <div
        className={`relative min-h-0 min-w-0 flex-1 md:block ${tab === "map" ? "block" : "hidden"}`}
      >
        {/* Search panel on top of the map */}
        <div className="absolute left-3 right-3 top-3 z-[1000] md:left-4 md:right-auto md:top-4 md:w-80">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-md outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "..." : t("search")}
            </button>
            <button
              type="button"
              onClick={() => locateMe(true)}
              aria-label={t("goToMe")}
              className="rounded-lg bg-white px-3 py-2 text-base shadow-md hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              📍
            </button>
          </form>

          <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto py-1 md:flex-wrap md:overflow-visible">
            <span className="shrink-0 whitespace-nowrap rounded-full bg-white dark:bg-gray-900 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 shadow-md">
              {t("searchArea")}
            </span>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategory(c.id)}
                disabled={loading}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium shadow-md disabled:opacity-60 ${
                  activeCategory === c.id
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {t(`cat_${c.id}` as TKey)}
              </button>
            ))}
          </div>

          {message && (
            <p className="mt-2 rounded-lg bg-white dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300 shadow-md">
              {message}
            </p>
          )}

          {results.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-gray-900 shadow-md md:max-h-72">
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    onClick={() => setSelected(place)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      selected?.id === place.id ? "bg-blue-50 dark:bg-blue-950" : ""
                    }`}
                  >
                    <span className="block font-medium text-gray-900 dark:text-gray-100">{place.name}</span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {place.address}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Time-to-leave alarm */}
        {alarm && (
          <div className="absolute left-1/2 top-4 z-[1200] w-[22rem] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-amber-500 p-4 text-center text-white shadow-xl">
            <p className="text-lg font-bold">⏰ {alarm}</p>
            <button
              onClick={() => setAlarm(null)}
              className="mt-2 rounded-lg bg-white dark:bg-gray-900 px-4 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              {t("gotIt")}
            </button>
          </div>
        )}

        {/* Points and level-up message */}
        {reward && !alarm && (
          <div className="absolute left-1/2 top-4 z-[1100] w-[22rem] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-white dark:bg-gray-900 p-4 text-center shadow-xl">
            <p className="text-base font-bold text-green-600 dark:text-green-400">{reward.text}</p>
            {reward.levelUp && (
              <p className="mt-1 text-base font-semibold text-amber-600 dark:text-amber-400">{reward.levelUp}</p>
            )}
          </div>
        )}

        {/* Live trip card at the bottom */}
        {(navigating || tripDone) && (
          <NavigationCard
            done={tripDone}
            earned={tripPoints}
            stop={target}
            index={navIndex}
            total={stops.length}
            leg={liveLeg?.legs[0] ?? null}
            straightMeters={position && target ? distanceMeters(position, target) : null}
            instruction={instruction}
            leaveFrom={prevPoint?.name ?? null}
            leaveAt={leaveAt}
            arriveAt={item ? item.arriveAt : null}
            lateBySeconds={item ? item.lateBySeconds : 0}
            accuracy={position?.accuracy ?? null}
            error={gpsError}
            voiceOn={voiceOn}
            onToggleVoice={toggleVoice}
            delayMinutes={Math.round(delaySeconds / 60)}
            onDelay={addDelay}
            onSkip={() => goToNextStop()}
            onStop={stopTrip}
          />
        )}

        <MapContainer
          center={
            initial.home
              ? [initial.home.lat, initial.home.lon]
              : initial.trip[0]
                ? [initial.trip[0].lat, initial.trip[0].lon]
                : [48.8566, 2.3522]
          }
          zoom={13}
          style={{ position: "absolute", inset: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBridge onReady={setMap} />
          <ZoomControl position="topright" />
          <ClickHandler onPick={handlePick} disabled={navigating} />

          {/* The route line from the start through all stops (faded during a trip) */}
          {showRoute && route && (
            <>
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: "white",
                  weight: 9,
                  opacity: navigating ? 0.4 : 0.9,
                  interactive: false,
                }}
              />
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: "#2563eb",
                  weight: 5,
                  opacity: navigating ? 0.35 : 1,
                  interactive: false,
                }}
              />
            </>
          )}

          {/* Live route from you to the current stop */}
          {liveLeg && (
            <Polyline
              positions={liveLeg.path}
              pathOptions={{ color: "#f59e0b", weight: 6, interactive: false }}
            />
          )}

          {/* Your position */}
          {navigating && position && (
            <>
              <Circle
                center={[position.lat, position.lon]}
                radius={position.accuracy}
                pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.1, interactive: false }}
              />
              <CircleMarker
                center={[position.lat, position.lon]}
                radius={8}
                pathOptions={{
                  color: "white",
                  weight: 3,
                  fillColor: "#2563eb",
                  fillOpacity: 1,
                  interactive: false,
                }}
              />
            </>
          )}

          {/* Where you are (when no trip is running) */}
          {!navigating && myLocation && (
            <CircleMarker
              center={[myLocation.lat, myLocation.lon]}
              radius={8}
              pathOptions={{
                color: "white",
                weight: 3,
                fillColor: "#2563eb",
                fillOpacity: 1,
                interactive: false,
              }}
            />
          )}

          {/* Start point */}
          {home && (
            <Marker position={[home.lat, home.lon]} icon={homeIcon}>
              <Popup>
                <strong>{home.name}</strong>
                <br />
                <span>{t("startPoint")}</span>
                {!navigating && (
                  <>
                    <br />
                    <button
                      onClick={() => setHome(null)}
                      className="mt-2 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {t("removeStart")}
                    </button>
                  </>
                )}
              </Popup>
            </Marker>
          )}

          {results
            .filter((p) => !tripIds.has(p.id))
            .map((place) => (
              <PlaceMarker key={place.id} place={place} onAdd={addToTrip} onSetStart={setStart} />
            ))}

          {found
            .filter((p) => !tripIds.has(p.id))
            .map((place) => (
              <PlaceMarker key={place.id} place={place} onAdd={addToTrip} onSetStart={setStart} />
            ))}

          {dropped && (
            <PlaceMarker
              key={dropped.id}
              markerRef={droppedRef}
              place={dropped}
              onAdd={(p) => {
                addToTrip(p);
                setDropped(null);
              }}
              onSetStart={(p) => {
                setStart(p);
                setDropped(null);
              }}
            />
          )}

          {stops.map((place, i) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lon]}
              icon={stopIcon(i + 1, stopState(i))}
            >
              <Popup>
                <strong>{place.name}</strong>
                {place.arriveBy && (
                  <>
                    <br />
                    <span>{t("beThere")} {formatClock(toSeconds(place.arriveBy) ?? 0)}</span>
                  </>
                )}
                <br />
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
                </span>
                {!navigating && (
                  <>
                    <br />
                    <button
                      onClick={() => removeFromTrip(place.id)}
                      className="mt-2 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {t("removeFromTrip")}
                    </button>
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {showGuide && <WelcomeGuide onClose={closeGuide} />}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={changeSettings}
          onClose={() => setShowSettings(false)}
          onOpenGuide={() => {
            setShowSettings(false);
            setShowGuide(true);
          }}
        />
      )}

      {/* Phone: switch between the plan and the map */}
      <nav className="flex shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pb-[env(safe-area-inset-bottom)] md:hidden">
        <button
          onClick={() => setTab("plan")}
          className={`flex-1 py-3 text-sm font-medium ${
            tab === "plan" ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          📋 {t("tabPlan")}{stops.length > 0 ? ` (${stops.length})` : ""}
        </button>
        <button
          onClick={() => setTab("map")}
          className={`flex-1 py-3 text-sm font-medium ${
            tab === "map" ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          🗺️ {t("tabMap")}
        </button>
      </nav>
    </div>
  );
}
