/**
 * NOTE: every sound in the shop, made by code with the Web Audio API. There are no audio files at all.
 * Why it exists: an extra beyond the spec. Generated sound needs no download and no licence, and it loops with no seam.
 * Connects to: `SoundToggle` creates one of these after a click, because browsers keep audio silent until then. It has
 * no React in it, so it can also render offline, which is how its loudness gets measured.
 *
 * How Web Audio works: sounds are built as a chain of nodes, source -> filter -> volume -> speakers. A "bed" is one
 * theme's endless background, made of filtered noise. Rain, waves and city rumble are all noise with the right
 * frequencies kept: rain keeps the highs, a far-off city keeps only the lows.
 *
 * OOP shown here: `private` fields hide the node graph, and the rest of the app only calls `setTheme`, `setOn`, `play`.
 */
import type { Theme } from "../../utils/guards";

/** Every short sound that can be played on demand. A union, so a misspelled name doesn't compile. */
export type SoundName = "bell" | "train" | "car" | "chime" | "gull" | "boat" | "drop" | "rattle" | "print" | "key" | "overload";

/** One filter in a chain. */
interface FilterSpec {
  type: BiquadFilterType;
  frequency: number;
  q?: number;
}

/** Overall loudness when on. Everything else is set relative to this, so this one number turns it all up or down. */
const MASTER_LEVEL = 0.8;

/** How long the switch between sound on and off, or between two themes, takes. Sudden changes sound like a fault. */
const FADE_SECONDS = 1.6;

/** A random number between two values. */
function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class SoundEngine {
  private readonly master: GainNode;
  /** Sends a little of a sound to the reverb, which is what makes it seem far away. */
  private readonly reverb: ConvolverNode;
  private readonly pink: AudioBuffer;
  private readonly brown: AudioBuffer;
  /** The two backgrounds, built the first time each is needed. */
  private readonly beds = new Map<Theme, GainNode>();
  /** The running timers for occasional sounds, kept so they can all be stopped. */
  private timers: ReturnType<typeof setTimeout>[] = [];
  private theme: Theme | null = null;

  constructor(private readonly context: BaseAudioContext) {
    // A compressor at the very end catches peaks, so several sounds at once can't distort.
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    limiter.connect(context.destination);

    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(limiter);

    this.reverb = context.createConvolver();
    this.reverb.buffer = this.makeRoom(2.6);
    this.reverb.connect(this.master);

    this.pink = this.makeNoise("pink");
    this.brown = this.makeNoise("brown");
  }

  /**
   * Fills a buffer with random noise. Pink has less treble than pure static, and brown has much less, so it rumbles.
   * The last moment is blended into the first, so the loop has no click where it joins.
   */
  private makeNoise(kind: "pink" | "brown"): AudioBuffer {
    const { sampleRate } = this.context;
    const buffer = this.context.createBuffer(2, sampleRate * 6, sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let [b0, b1, b2, last] = [0, 0, 0, 0];
      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        if (kind === "pink") {
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
        } else {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        }
      }
      const overlap = Math.floor(sampleRate * 0.25);
      const end = data.length - overlap;
      for (let i = 0; i < overlap; i += 1) {
        const mix = i / overlap;
        data[end + i] = data[end + i] * (1 - mix) + data[i] * mix;
      }
    }
    return buffer;
  }

  /** A short burst of fading noise. Played through a convolver, it makes any sound ring like it is in a big space. */
  private makeRoom(seconds: number): AudioBuffer {
    const { sampleRate } = this.context;
    const buffer = this.context.createBuffer(2, Math.floor(sampleRate * seconds), sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      }
    }
    return buffer;
  }

  /** Connects a list of filters after a node, and returns the last one. */
  private chain(from: AudioNode, filters: FilterSpec[]): AudioNode {
    let last = from;
    for (const spec of filters) {
      const filter = this.context.createBiquadFilter();
      filter.type = spec.type;
      filter.frequency.value = spec.frequency;
      filter.Q.value = spec.q ?? 0.7;
      last.connect(filter);
      last = filter;
    }
    return last;
  }

  /** One endless layer of filtered noise. It starts at a random point, so two layers of the same noise don't match. */
  private layer(noise: AudioBuffer, filters: FilterSpec[], level: number, output: AudioNode): GainNode {
    const source = this.context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.start(0, between(0, noise.duration));
    const gain = this.context.createGain();
    gain.gain.value = level;
    this.chain(source, filters).connect(gain);
    gain.connect(output);
    return gain;
  }

  /** Slowly moves a setting up and down, so a background never sounds like a machine repeating itself. */
  private wobble(target: AudioParam, rate: number, depth: number): void {
    const oscillator = this.context.createOscillator();
    oscillator.frequency.value = rate;
    const amount = this.context.createGain();
    amount.gain.value = depth;
    oscillator.connect(amount);
    amount.connect(target);
    oscillator.start();
  }

  /** A steady pure tone. Used for the machine's hum. */
  private tone(frequency: number, level: number, output: AudioNode): void {
    const oscillator = this.context.createOscillator();
    oscillator.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.value = level;
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start();
  }

  /** Night: rain on the road, a low city rumble, and the machine's own electric hum, at twice Tokyo's 50Hz mains. */
  private buildNight(bed: GainNode): void {
    const hiss = this.layer(this.pink, [{ type: "highpass", frequency: 1100 }, { type: "lowpass", frequency: 8500 }], 0.34, bed);
    this.wobble(hiss.gain, 0.07, 0.05);
    const patter = this.layer(this.pink, [{ type: "bandpass", frequency: 480, q: 0.5 }], 0.22, bed);
    this.wobble(patter.gain, 0.11, 0.05);
    const rumble = this.layer(this.brown, [{ type: "lowpass", frequency: 170 }], 0.5, bed);
    this.wobble(rumble.gain, 0.03, 0.14);
    this.tone(100, 0.011, bed);
    this.tone(200, 0.005, bed);
  }

  /** Day: the sea's constant wash, wind, and water trickling along the canal. The waves themselves are timed events. */
  private buildDay(bed: GainNode): void {
    const wash = this.layer(this.brown, [{ type: "lowpass", frequency: 520 }], 0.34, bed);
    this.wobble(wash.gain, 0.05, 0.09);
    const wind = this.layer(this.pink, [{ type: "bandpass", frequency: 640, q: 0.45 }], 0.1, bed);
    this.wobble(wind.gain, 0.09, 0.05);
    const trickle = this.layer(this.pink, [{ type: "bandpass", frequency: 2300, q: 2 }], 0.05, bed);
    this.wobble(trickle.gain, 2.7, 0.022);
    this.wobble(trickle.gain, 0.61, 0.016);
  }

  /** One wave: it swells and gets brighter as it breaks, then fades away down the shore. */
  private wave(bed: GainNode): void {
    const now = this.context.currentTime;
    const rise = between(2.6, 4);
    const fall = between(4, 6.5);
    const peak = between(0.34, 0.6);
    const source = this.context.createBufferSource();
    source.buffer = this.pink;
    source.loop = true;
    source.start(now, between(0, this.pink.duration), rise + fall + 0.5);
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.linearRampToValueAtTime(between(1500, 2600), now + rise);
    filter.frequency.linearRampToValueAtTime(320, now + rise + fall);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + rise);
    gain.gain.linearRampToValueAtTime(0.0001, now + rise + fall);
    const pan = this.context.createStereoPanner();
    pan.pan.value = between(-0.4, 0.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(bed);
  }

  /** Repeats a callback at random gaps, for as long as this theme is playing. */
  private every(minSeconds: number, maxSeconds: number, callback: () => void): void {
    const next = () => {
      this.timers.push(
        setTimeout(() => {
          callback();
          next();
        }, between(minSeconds, maxSeconds) * 1000),
      );
    };
    next();
  }

  /** Stops the occasional sounds. Anything already playing simply finishes. */
  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /**
   * How long until the train in the picture next crosses, read from its running CSS animation, so the sound of the
   * train matches what is on screen. Null when no train is showing, such as on a phone or with reduced motion.
   */
  private secondsUntilTrain(): number | null {
    const animation = document.querySelector(".scene-train")?.getAnimations()[0];
    const elapsed = animation?.currentTime;
    if (typeof elapsed !== "number") {
      return null;
    }
    const delay = 6000;
    const cycle = 46000;
    return elapsed < delay ? (delay - elapsed) / 1000 : (cycle - ((elapsed - delay) % cycle)) / 1000;
  }

  /** Plays the train sound as the picture's train arrives, then waits for the next one. Without a picture, it is random. */
  private followTrain(passes = 0): void {
    const wait = this.secondsUntilTrain() ?? between(50, 90);
    this.timers.push(
      setTimeout(() => {
        this.play("train");
        // A crossing bell on some passes only. On every train, it would soon get tiresome.
        if (passes % 3 === 0) {
          this.play("bell");
        }
        this.followTrain(passes + 1);
      }, wait * 1000),
    );
  }

  /** Starts a theme's occasional sounds, each at its own uneven pace, so it never falls into a pattern. */
  private startEvents(theme: Theme, bed: GainNode): void {
    this.clearTimers();
    if (theme === "dark") {
      this.followTrain();
      this.every(16, 38, () => this.play("car"));
    } else {
      this.wave(bed);
      this.every(6.5, 11, () => this.wave(bed));
      this.every(14, 34, () => this.play("chime"));
      this.every(22, 52, () => this.play("gull"));
      this.every(70, 120, () => this.play("boat"));
    }
  }

  /** Crossfades to a theme's background. Each background is built once, then kept, and only its volume changes. */
  setTheme(theme: Theme): void {
    if (theme === this.theme) {
      return;
    }
    this.theme = theme;
    let bed = this.beds.get(theme);
    if (bed === undefined) {
      bed = this.context.createGain();
      bed.gain.value = 0;
      bed.connect(this.master);
      if (theme === "dark") {
        this.buildNight(bed);
      } else {
        this.buildDay(bed);
      }
      this.beds.set(theme, bed);
    }
    const now = this.context.currentTime;
    for (const [name, gain] of this.beds) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(name === theme ? 1 : 0, now, FADE_SECONDS / 3);
    }
    this.startEvents(theme, bed);
  }

  /** Fades everything in or out. Turning off also stops the timers, so nothing keeps being scheduled in silence. */
  setOn(isOn: boolean): void {
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(isOn ? MASTER_LEVEL : 0, now, FADE_SECONDS / 3);
    if (isOn && this.theme !== null) {
      const bed = this.beds.get(this.theme);
      if (bed !== undefined) {
        this.startEvents(this.theme, bed);
      }
    } else {
      this.clearTimers();
    }
  }

  /** The sound of hitting metal or glass: a few pure tones at uneven ratios, each fading at its own speed. */
  private strike(frequency: number, ratios: number[], level: number, decay: number, when: number, output: AudioNode): void {
    ratios.forEach((ratio, index) => {
      const oscillator = this.context.createOscillator();
      oscillator.frequency.value = frequency * ratio;
      const gain = this.context.createGain();
      const partLevel = level / (index + 1);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(partLevel, when + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + decay / (1 + index * 0.5));
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start(when);
      oscillator.stop(when + decay + 0.1);
    });
  }

  /** A burst of filtered noise with a fast fade: the body of every clunk, tick and rattle. */
  private burst(filters: FilterSpec[], level: number, length: number, when: number, output: AudioNode): void {
    const source = this.context.createBufferSource();
    source.buffer = this.pink;
    source.start(when, between(0, this.pink.duration - 1), length + 0.05);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    this.chain(source, filters).connect(gain);
    gain.connect(output);
  }

  /** A low thud whose pitch falls fast, which the ear hears as something heavy landing. */
  private thud(level: number, from: number, to: number, length: number, when: number, output: AudioNode): void {
    const oscillator = this.context.createOscillator();
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + length);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(when);
    oscillator.stop(when + length + 0.05);
  }

  /** A sound that sits in the distance, panned to one side, mostly heard through the reverb. */
  private distant(level: number, reverbLevel: number, panTo: number): GainNode {
    const input = this.context.createGain();
    input.gain.value = level;
    const pan = this.context.createStereoPanner();
    pan.pan.value = panTo;
    input.connect(pan);
    pan.connect(this.master);
    const send = this.context.createGain();
    send.gain.value = reverbLevel;
    input.connect(send);
    send.connect(this.reverb);
    return input;
  }

  /** A railway crossing a few streets away: two bell notes taking turns, as Japanese crossings do. */
  private bell(when: number): void {
    const output = this.distant(1, 1.4, -0.45);
    const count = Math.floor(between(12, 18));
    for (let i = 0; i < count; i += 1) {
      const swell = Math.sin((i / (count - 1)) * Math.PI) * 0.8 + 0.2;
      this.strike(i % 2 === 0 ? 742 : 882, [1, 2.76, 5.4], 0.05 * swell, 0.5, when + i * 0.42, output);
    }
  }

  /** The train: a low rumble moving from left to right, with the clack of wheels over rail joints. */
  private train(when: number): void {
    const length = 11;
    const pan = this.context.createStereoPanner();
    pan.pan.setValueAtTime(-0.8, when);
    pan.pan.linearRampToValueAtTime(0.8, when + length);
    const output = this.context.createGain();
    output.gain.setValueAtTime(0.0001, when);
    output.gain.linearRampToValueAtTime(0.44, when + 3.5);
    output.gain.linearRampToValueAtTime(0.44, when + 7.5);
    output.gain.linearRampToValueAtTime(0.0001, when + length);
    output.connect(pan);
    pan.connect(this.master);
    const source = this.context.createBufferSource();
    source.buffer = this.brown;
    source.loop = true;
    source.start(when, between(0, this.brown.duration), length + 0.2);
    this.chain(source, [{ type: "lowpass", frequency: 260 }]).connect(output);
    for (let t = 0; t < length; t += 0.56) {
      this.thud(0.17, 95, 55, 0.09, when + t, output);
      this.thud(0.13, 90, 52, 0.08, when + t + 0.13, output);
    }
  }

  /** A car on a wet road: tyre hiss that swells and passes from one side to the other. */
  private car(when: number): void {
    const length = between(4.5, 7);
    const direction = Math.random() < 0.5 ? 1 : -1;
    const pan = this.context.createStereoPanner();
    pan.pan.setValueAtTime(-0.9 * direction, when);
    pan.pan.linearRampToValueAtTime(0.9 * direction, when + length);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.5, when + length * 0.5);
    gain.gain.linearRampToValueAtTime(0.0001, when + length);
    gain.connect(pan);
    pan.connect(this.master);
    const source = this.context.createBufferSource();
    source.buffer = this.pink;
    source.loop = true;
    source.start(when, between(0, this.pink.duration), length + 0.2);
    this.chain(source, [{ type: "bandpass", frequency: 1500, q: 0.6 }]).connect(gain);
  }

  /** A furin, the small glass bell hung under Japanese eaves in summer. One note, and the wind decides when it rings. */
  private chime(when: number): void {
    const output = this.distant(1, 0.7, between(-0.35, 0.35));
    const rings = Math.ceil(between(0, 3));
    let t = when;
    for (let i = 0; i < rings; i += 1) {
      this.strike(3120, [1, 1.51, 2.42], between(0.032, 0.052), between(1.4, 2.2), t, output);
      t += between(0.28, 0.75);
    }
  }

  /** A far-off gull: a few falling cries, heard mostly through the reverb. */
  private gull(when: number): void {
    const output = this.distant(0.5, 1.6, between(-0.6, 0.6));
    const cries = Math.ceil(between(1, 4));
    for (let i = 0; i < cries; i += 1) {
      const start = when + i * between(0.34, 0.5);
      const oscillator = this.context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1500, start);
      oscillator.frequency.linearRampToValueAtTime(1780, start + 0.06);
      oscillator.frequency.exponentialRampToValueAtTime(1020, start + 0.3);
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.13, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      oscillator.connect(gain);
      this.chain(gain, [{ type: "bandpass", frequency: 1500, q: 1.4 }]).connect(output);
      oscillator.start(start);
      oscillator.stop(start + 0.36);
    }
  }

  /** A small fishing boat's engine across the bay: slow, even thumps that come and go. */
  private boat(when: number): void {
    const length = between(11, 17);
    const output = this.distant(1, 0.6, between(-0.7, 0.7));
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.linearRampToValueAtTime(1, when + length * 0.4);
    envelope.gain.linearRampToValueAtTime(0.0001, when + length);
    envelope.connect(output);
    for (let t = 0; t < length; t += 0.17) {
      this.thud(0.1, 120, 70, 0.11, when + t, envelope);
    }
  }

  /** Item drop: a heavy thud in the tray, then the tray's flap settling. */
  private drop(when: number): void {
    this.thud(1, 230, 70, 0.17, when, this.master);
    this.burst([{ type: "lowpass", frequency: 1000 }], 1.8, 0.06, when, this.master);
    this.strike(390, [1, 2.2], 0.07, 0.09, when + 0.17, this.master);
    this.burst([{ type: "bandpass", frequency: 1600, q: 1.2 }], 0.45, 0.03, when + 0.17, this.master);
  }

  /** Shake: loose things rattling in a metal box, for as long as the picture shakes. */
  private rattle(when: number): void {
    for (let i = 0; i < 13; i += 1) {
      const t = when + between(0, 0.46);
      this.burst([{ type: "bandpass", frequency: between(1100, 2900), q: 3 }], between(0.5, 1.3), between(0.02, 0.05), t, this.master);
    }
    for (let t = 0; t < 0.46; t += 0.115) {
      this.thud(0.3, 110, 60, 0.07, when + t, this.master);
    }
  }

  /** The receipt: a dot-matrix printer's rapid ticks, in 14 lines to match the picture's 14 steps. */
  private print(when: number): void {
    const motor = this.context.createOscillator();
    motor.type = "sawtooth";
    motor.frequency.value = 138;
    const motorLevel = this.context.createGain();
    motorLevel.gain.setValueAtTime(0.0001, when);
    motorLevel.gain.linearRampToValueAtTime(0.018, when + 0.05);
    motorLevel.gain.setValueAtTime(0.018, when + 1.42);
    motorLevel.gain.linearRampToValueAtTime(0.0001, when + 1.5);
    motor.connect(motorLevel);
    this.chain(motorLevel, [{ type: "lowpass", frequency: 700 }]).connect(this.master);
    motor.start(when);
    motor.stop(when + 1.55);
    for (let line = 0; line < 14; line += 1) {
      const lineStart = when + line * 0.107;
      for (let tick = 0; tick < 5; tick += 1) {
        this.burst([{ type: "bandpass", frequency: 3400, q: 3 }], 1, 0.012, lineStart + tick * 0.018, this.master);
      }
    }
  }

  /** A keypad button: one short electronic beep. */
  private key(when: number): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = 1180;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.12, when);
    gain.gain.setValueAtTime(0.12, when + 0.04);
    gain.gain.linearRampToValueAtTime(0.0001, when + 0.055);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(when);
    oscillator.stop(when + 0.07);
  }

  /** The easter egg: ten seconds of rising electrical strain and crackle, in step with the picture. */
  private overload(when: number): void {
    const length = 10;
    const buzz = this.context.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.setValueAtTime(100, when);
    buzz.frequency.linearRampToValueAtTime(135, when + length);
    const level = this.context.createGain();
    level.gain.setValueAtTime(0.0001, when);
    level.gain.linearRampToValueAtTime(0.08, when + 7);
    level.gain.setValueAtTime(0.08, when + 9.4);
    level.gain.linearRampToValueAtTime(0.0001, when + length);
    buzz.connect(level);
    this.chain(level, [{ type: "highpass", frequency: 300 }]).connect(this.master);
    buzz.start(when);
    buzz.stop(when + length + 0.1);
    for (let i = 0; i < 70; i += 1) {
      const t = when + between(0.5, 9.6);
      this.burst([{ type: "highpass", frequency: 3200 }], between(0.3, 1), between(0.004, 0.018), t, this.master);
    }
  }

  /** Plays one short sound. It is the only way the rest of the app asks for one. */
  play(name: SoundName, when = this.context.currentTime): void {
    switch (name) {
      case "bell":
        return this.bell(when);
      case "train":
        return this.train(when);
      case "car":
        return this.car(when);
      case "chime":
        return this.chime(when);
      case "gull":
        return this.gull(when);
      case "boat":
        return this.boat(when);
      case "drop":
        return this.drop(when);
      case "rattle":
        return this.rattle(when);
      case "print":
        return this.print(when);
      case "key":
        return this.key(when);
      case "overload":
        return this.overload(when);
    }
  }
}
