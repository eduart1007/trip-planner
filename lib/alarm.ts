import { speechLang, t } from "./i18n";

let audio: AudioContext | null = null;
let voiceEnabled = true;

export function setVoiceEnabled(on: boolean) {
  voiceEnabled = on;
  if (!on) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

// Says a short message out loud (if voice is on)
export function speak(text: string) {
  if (!voiceEnabled) return;
  try {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang();
    window.speechSynthesis.speak(utterance);
  } catch {
    // voice is optional
  }
}

// Call this from a button click, so the browser allows sound, voice and notifications later
export function prepareAlarm() {
  try {
    if (!audio) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === "suspended") void audio.resume();
  } catch {
    // sound is optional
  }
  try {
    // A silent message unlocks voice on phones
    if ("speechSynthesis" in window) {
      const quiet = new SpeechSynthesisUtterance(" ");
      quiet.volume = 0;
      window.speechSynthesis.speak(quiet);
    }
  } catch {
    // voice is optional
  }
  try {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    // notifications are optional
  }
}

function beep(ctx: AudioContext, offset: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.25;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const start = ctx.currentTime + offset;
  osc.start(start);
  osc.stop(start + 0.25);
}

export function playAlarm(message: string) {
  try {
    if (audio) {
      beep(audio, 0);
      beep(audio, 0.4);
      beep(audio, 0.8);
    }
  } catch {
    // ignore
  }
  speak(message);
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(t("notifTitle"), { body: message });
    }
  } catch {
    // ignore
  }
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    // ignore
  }
}
