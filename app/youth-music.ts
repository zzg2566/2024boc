const EPSILON = 0.0001;

export const MUSIC_TIMING = {
  bpm: 112,
  stepSeconds: 60 / 112 / 2,
  lookAheadMs: 50,
  scheduleAheadSeconds: 0.65,
  startDelaySeconds: 0.06,
  maxStepsPerTick: 8,
  totalSteps: 32,
  arpeggioDuration: 0.52,
  melodyDuration: 0.72,
} as const;

export type MusicSchedulePosition = {
  nextNoteTime: number;
  step: number;
};

export type MusicSchedulePlan = MusicSchedulePosition & {
  events: Array<{ step: number; time: number }>;
};

export function planMusicWindow(position: MusicSchedulePosition, now: number): MusicSchedulePlan {
  let { nextNoteTime, step } = position;
  const minimumStart = now + MUSIC_TIMING.startDelaySeconds;

  // When a browser timer is delayed, advance the score instead of trying to
  // play missed notes at once. The audible clock always remains Web Audio time.
  if (nextNoteTime < minimumStart) {
    const missedSteps = Math.max(
      1,
      Math.ceil((minimumStart - nextNoteTime) / MUSIC_TIMING.stepSeconds),
    );
    step = (step + missedSteps) % MUSIC_TIMING.totalSteps;
    nextNoteTime += missedSteps * MUSIC_TIMING.stepSeconds;
  }

  const events: MusicSchedulePlan["events"] = [];
  const horizon = now + MUSIC_TIMING.scheduleAheadSeconds;
  while (nextNoteTime < horizon && events.length < MUSIC_TIMING.maxStepsPerTick) {
    events.push({ step, time: nextNoteTime });
    step = (step + 1) % MUSIC_TIMING.totalSteps;
    nextNoteTime += MUSIC_TIMING.stepSeconds;
  }

  return { events, nextNoteTime, step };
}

const CHORDS = [
  [60, 64, 67, 71], // Cmaj7
  [55, 59, 62, 67], // G
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
] as const;

const ARPEGGIO = [0, 2, 1, 3, 0, 2, 1, 2] as const;

// A bright C-major melody that stays below E5 so it remains pleasant on phone speakers.
const MELODY: ReadonlyArray<number | null> = [
  72, null, 76, null, 74, 72, 69, null,
  71, null, 74, null, 76, 74, 71, null,
  72, null, 76, null, 74, 72, 69, null,
  69, null, 72, null, 74, 72, 67, null,
];

const midiToHz = (midi: number) => 440 * (2 ** ((midi - 69) / 12));

export type YouthMusicEngine = ReturnType<typeof createYouthMusicEngine>;

export function createYouthMusicEngine(context: AudioContext) {
  const mix = context.createGain();
  const filter = context.createBiquadFilter();
  const delay = context.createDelay(0.4);
  const delayWet = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const master = context.createGain();

  mix.gain.value = 0.95;
  filter.type = "lowpass";
  filter.frequency.value = 3800;
  filter.Q.value = 0.5;
  delay.delayTime.value = 0.14;
  delayWet.gain.value = 0.11;
  compressor.threshold.value = -10;
  compressor.knee.value = 4;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.18;
  master.gain.value = EPSILON;

  mix.connect(filter);
  filter.connect(compressor);
  filter.connect(delay);
  delay.connect(delayWet);
  delayWet.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);

  const activeSources = new Set<OscillatorNode>();
  let schedulerTimer: number | null = null;
  let pauseTimer: number | null = null;
  let nextNoteTime = 0;
  let step = 0;
  let running = false;
  let destroyed = false;
  let generation = 0;
  let startPromise: Promise<boolean> | null = null;

  const clearScheduler = () => {
    if (schedulerTimer !== null) {
      window.clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
  };

  const clearPauseTimer = () => {
    if (pauseTimer !== null) {
      window.clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  };

  const scheduleTone = (
    midi: number,
    start: number,
    peak: number,
    duration: number,
    type: OscillatorType,
    attack: number,
    detune = 0,
  ) => {
    if (destroyed || context.state === "closed") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const shoulder = Math.min(duration * 0.38, 0.2);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(midiToHz(midi), start);
    oscillator.detune.setValueAtTime(detune, start);
    gain.gain.setValueAtTime(EPSILON, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(peak * 0.58, start + shoulder);
    gain.gain.exponentialRampToValueAtTime(EPSILON, start + duration);

    oscillator.connect(gain);
    gain.connect(mix);
    activeSources.add(oscillator);
    oscillator.onended = () => {
      activeSources.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  };

  const scheduleStep = (scoreStep: number, time: number) => {
    const phrase = Math.floor(scoreStep / 8);
    const phraseStep = scoreStep % 8;
    const chord = CHORDS[phrase];
    const arpeggioMidi = chord[ARPEGGIO[phraseStep]];

    scheduleTone(
      arpeggioMidi,
      time,
      phraseStep % 4 === 0 ? 0.044 : 0.036,
      MUSIC_TIMING.arpeggioDuration,
      "triangle",
      0.012,
      phraseStep % 2 ? 1.5 : -1.5,
    );

    const melodyMidi = MELODY[scoreStep];
    if (melodyMidi !== null) {
      scheduleTone(
        melodyMidi,
        time + 0.018,
        phraseStep === 0 ? 0.064 : 0.055,
        MUSIC_TIMING.melodyDuration,
        "sine",
        0.018,
      );
    }

    if (phraseStep === 0 || phraseStep === 4) {
      scheduleTone(chord[0], time, 0.026, 0.64, "sine", 0.014);
    }
  };

  const runScheduler = () => {
    schedulerTimer = null;
    if (!running || destroyed || context.state === "closed") return;

    const plan = planMusicWindow({ nextNoteTime, step }, context.currentTime);
    nextNoteTime = plan.nextNoteTime;
    step = plan.step;
    plan.events.forEach((event) => scheduleStep(event.step, event.time));

    schedulerTimer = window.setTimeout(runScheduler, MUSIC_TIMING.lookAheadMs);
  };

  const start = () => {
    if (destroyed || context.state === "closed") return Promise.resolve(false);
    if (running && context.state === "running") return Promise.resolve(true);
    if (startPromise) return startPromise;

    clearPauseTimer();
    const token = ++generation;
    const begin = async () => {
      try {
        await context.resume();
      } catch {
        return false;
      }
      if (destroyed || token !== generation || context.state !== "running") return false;

      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, EPSILON), now);
      master.gain.exponentialRampToValueAtTime(0.17, now + 0.2);
      running = true;
      nextNoteTime = now + MUSIC_TIMING.startDelaySeconds;
      clearScheduler();
      runScheduler();
      return true;
    };

    const pending = begin();
    startPromise = pending;
    void pending.finally(() => {
      if (startPromise === pending) startPromise = null;
    });
    return pending;
  };

  const pause = () => {
    generation += 1;
    running = false;
    clearScheduler();
    clearPauseTimer();
    if (destroyed || context.state === "closed") return;

    const now = context.currentTime;
    const fadeEnd = now + 0.12;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, EPSILON), now);
    master.gain.exponentialRampToValueAtTime(EPSILON, fadeEnd);
    activeSources.forEach((source) => {
      try {
        source.stop(fadeEnd + 0.02);
      } catch {
        // A source may already have ended between the scheduler tick and pause.
      }
    });

    pauseTimer = window.setTimeout(() => {
      pauseTimer = null;
      if (!running && !destroyed && context.state === "running") void context.suspend();
    }, 160);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    running = false;
    generation += 1;
    clearScheduler();
    clearPauseTimer();
    activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore already-ended sources during teardown.
      }
    });
    activeSources.clear();
    void context.close();
  };

  return {
    start,
    pause,
    destroy,
    get isRunning() {
      return running;
    },
  };
}
