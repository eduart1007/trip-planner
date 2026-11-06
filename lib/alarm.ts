let audio: AudioContext | null = null;

// Call this from a button click, so the browser allows sound and notifications later
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
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    }
  } catch {
    // ignore
  }
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Time to leave", { body: message });
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
