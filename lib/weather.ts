export type HourlyWeather = {
  temps: number[]; // temperature for each hour, starting at midnight today
  rain: number[]; // chance of rain in percent
  codes: number[]; // weather codes
};

export type StopWeather = {
  icon: string;
  temp: number;
  rainChance: number;
  rainLikely: boolean;
};

type OpenMeteoResult = {
  hourly?: {
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
  };
};

// Weather code -> picture
function iconFor(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code === 85 || code === 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

// One request for all your stops
export async function fetchWeather(
  points: { lat: number; lon: number }[]
): Promise<HourlyWeather[] | null> {
  if (points.length === 0) return null;
  try {
    const lat = points.map((p) => p.lat.toFixed(3)).join(",");
    const lon = points.map((p) => p.lon.toFixed(3)).join(",");
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json: OpenMeteoResult | OpenMeteoResult[] = await res.json();
    const list = Array.isArray(json) ? json : [json];
    if (list.length !== points.length) return null;

    return list.map((r) => ({
      temps: r.hourly?.temperature_2m ?? [],
      rain: r.hourly?.precipitation_probability ?? [],
      codes: r.hourly?.weather_code ?? [],
    }));
  } catch {
    return null;
  }
}

// Weather at a time of day (seconds since midnight; after 24 h it means tomorrow)
export function pickHour(weather: HourlyWeather, seconds: number): StopWeather | null {
  const index = Math.min(weather.temps.length - 1, Math.max(0, Math.round(seconds / 3600)));
  const temp = weather.temps[index];
  if (typeof temp !== "number") return null;

  const rainChance = weather.rain[index] ?? 0;
  const code = weather.codes[index] ?? 0;
  const wet = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;

  return { icon: iconFor(code), temp, rainChance, rainLikely: rainChance >= 60 || wet };
}
