import { KNOWLEDGE, type Scene } from '@tb/content';
import { createWorld, DT, step, type Vec, type WorldState } from '@tb/sim';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OVERLAYS, PitchRenderer, type OverlayKey } from './PitchRenderer';

const TRAIL_TICKS = 6 / DT;

/** A short scripted clip is over once its last action is done and the tail has played out. */
export const clipDone = (w: WorldState) => w.scriptIdx >= w.scene.script.length && w.t - w.beatAt > 2.5;

export interface LabOptions {
  /** Fixed comparison world (ghosts). When given, compare mode is always on and uses this scene. */
  baseline?: Scene | null;
  /** Restart from the beginning when the scene ends instead of pausing. */
  loop?: boolean;
  /** With `loop`, restart early once this holds (e.g. the lesson's team lost the ball). */
  restartWhen?: (w: WorldState) => boolean;
  overlays?: Partial<Record<OverlayKey, boolean>>;
  focusOnly?: boolean;
}

export interface LabApi {
  world: React.RefObject<WorldState | null>;
  baseline: React.RefObject<WorldState | null>;
  host: React.RefObject<HTMLDivElement | null>;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  focus: string;
  setFocus: (id: string) => void;
  overlays: Record<OverlayKey, boolean>;
  setOverlay: (k: OverlayKey, on: boolean) => void;
  compare: boolean;
  setCompare: (on: boolean) => void;
  restart: () => void;
  stepOnce: () => void;
  touch: () => void;
  version: number;
}

/** Owns the live world (and a ghost comparison world) and the fixed-step render loop. */
export function useLab(scene: Scene, rebuildKey: string, opts: LabOptions = {}): LabApi {
  const world = useRef<WorldState | null>(null);
  const baseline = useRef<WorldState | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const renderer = useRef<PitchRenderer | null>(null);
  const prev = useRef<{ live: Vec[]; base: Vec[]; ball: Vec }>({ live: [], base: [], ball: { x: 0, y: 0 } });
  const trail = useRef<Vec[]>([]);
  const ghostTrail = useRef<Vec[]>([]);
  const acc = useRef(0);
  const visible = useRef(true);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [playing, setPlaying] = useState(!reduced);
  const [speed, setSpeed] = useState(1);
  const [focus, setFocus] = useState(scene.focus);
  const [compareToggle, setCompareState] = useState(false);
  const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>(
    () => Object.fromEntries(OVERLAYS.map((k) => [k, opts.overlays?.[k] ?? (k === 'vision' || k === 'runs')])) as Record<OverlayKey, boolean>,
  );
  const [version, setVersion] = useState(0);
  const fixedBaseline = opts.baseline !== undefined;
  const compare = fixedBaseline ? opts.baseline !== null : compareToggle;
  const state = useRef({ playing, speed, focus, compare, overlays, loop: !!opts.loop, baselineScene: opts.baseline ?? null, restartWhen: opts.restartWhen });
  state.current = { playing, speed, focus, compare, overlays, loop: !!opts.loop, baselineScene: opts.baseline ?? null, restartWhen: opts.restartWhen };

  const snapPrev = () => {
    const w = world.current!;
    prev.current = { live: w.agents.map((a) => ({ ...a.pos })), base: baseline.current?.agents.map((a) => ({ ...a.pos })) ?? [], ball: { ...w.ball.pos } };
  };

  const build = useCallback((withCompare: boolean, from?: WorldState | null) => {
    world.current = createWorld(from ? { ...from.scene } : scene, KNOWLEDGE);
    const ghostScene = state.current.baselineScene ?? scene;
    baseline.current = withCompare ? createWorld(ghostScene, KNOWLEDGE) : null;
    trail.current = [];
    ghostTrail.current = [];
    acc.current = 0;
    snapPrev();
    setVersion((v) => v + 1);
    if (!reduced) setPlaying(true);
  }, [scene]);
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    build(state.current.compare);
    setFocus(scene.focus);
  }, [rebuildKey]);

  const advance = () => {
    const w = world.current!;
    snapPrev();
    step(w);
    if (baseline.current) step(baseline.current);
    const id = state.current.focus;
    const push = (list: Vec[], ws: WorldState | null) => {
      const f = ws?.agents.find((a) => a.spec.id === id);
      if (!f) return;
      list.push({ ...f.pos });
      if (list.length > TRAIL_TICKS) list.shift();
    };
    push(trail.current, w);
    push(ghostTrail.current, baseline.current);
  };

  const draw = () => {
    const w = world.current;
    const r = renderer.current;
    if (!w || !r) return;
    const s = state.current;
    r.draw({
      world: w,
      prev: prev.current.live,
      prevBall: prev.current.ball,
      alpha: Math.min(1, acc.current / DT),
      ghost: baseline.current ? { world: baseline.current, prev: prev.current.base, trail: ghostTrail.current } : undefined,
      focus: s.focus,
      overlays: s.overlays,
      trail: trail.current,
      focusOnly: opts.focusOnly,
      roleAb: (a) => {
        const ph = w.phase[a.spec.team];
        const id = ph === 'oop' || ph === 'loss' ? a.spec.roleOOP : a.spec.roleIP;
        return KNOWLEDGE.roles[id]?.ab ?? a.spec.slot;
      },
    });
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const r = new PitchRenderer();
    let alive = true;
    r.init(el).then(() => {
      if (!alive) return r.destroy();
      renderer.current = r;
      draw();
    });
    const ro = new ResizeObserver(() => { r.resize(); draw(); });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; });
    io.observe(el);
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = state.current;
      const w = world.current;
      if (w && s.playing && visible.current) {
        acc.current += dt * s.speed;
        while (acc.current >= DT) {
          advance();
          acc.current -= DT;
        }
        if (w.t >= w.scene.duration || (s.loop && s.restartWhen?.(w))) {
          if (s.loop) buildRef.current(s.compare, w);
          else {
            acc.current = 0;
            setPlaying(false);
          }
        }
        if (now - lastUi > 150) {
          lastUi = now;
          setVersion((v) => v + 1);
        }
      }
      if (visible.current) draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);

  return {
    world,
    baseline,
    host,
    playing,
    setPlaying: (v) => {
      if (v && world.current && world.current.t >= world.current.scene.duration) build(state.current.compare, world.current);
      setPlaying(v);
    },
    speed,
    setSpeed,
    focus,
    setFocus: (id) => {
      trail.current = [];
      ghostTrail.current = [];
      setFocus(id);
    },
    overlays,
    setOverlay: (k, on) => setOverlays((o) => ({ ...o, [k]: on })),
    compare,
    setCompare: (on) => {
      setCompareState(on);
      build(on, world.current);
    },
    restart: () => build(state.current.compare, world.current),
    stepOnce: () => {
      setPlaying(false);
      advance();
      acc.current = 0;
      draw();
      setVersion((v) => v + 1);
    },
    touch: () => setVersion((v) => v + 1),
    version,
  };
}
