import { attr, frame, PITCH, resolveMods, type AgentState, type Vec, type WorldState } from '@tb/sim';
import { Application, Container, Graphics, Text } from 'pixi.js';

export const OVERLAYS = ['vision', 'options', 'pressure', 'runs', 'shape', 'lines', 'trail'] as const;
export type OverlayKey = (typeof OVERLAYS)[number];

const M = 4;
const W = PITCH.len + 2 * M;
const H = PITCH.wid + 2 * M;
const TEAM = [0x38bdf8, 0xf87171];
const FOCUS = 0xfacc15;

export interface FrameInput {
  world: WorldState;
  prev: Vec[];
  prevBall: Vec;
  alpha: number;
  ghost?: { world: WorldState; prev: Vec[]; trail?: Vec[] };
  focus: string;
  overlays: Record<OverlayKey, boolean>;
  trail: Vec[];
  roleAb: (a: AgentState) => string;
  /** draw press radii and runs for the selected player only */
  focusOnly?: boolean;
}

const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function utilityColor(t: number): number {
  const r = Math.round(248 + (74 - 248) * t), g = Math.round(113 + (222 - 113) * t), b = Math.round(113 + (128 - 113) * t);
  return (r << 16) | (g << 8) | b;
}

/** Top-down PixiJS view of a world. Positions are interpolated between the last two 20 Hz ticks. */
export class PitchRenderer {
  private app = new Application();
  private pitch = new Graphics();
  private overlay = new Graphics();
  private ghosts = new Graphics();
  private players = new Graphics();
  private ballG = new Graphics();
  private labelLayer = new Container();
  private labels = new Map<string, Text>();
  private scale = 1;
  private ready = false;
  private host: HTMLElement | null = null;

  async init(host: HTMLElement) {
    this.host = host;
    await this.app.init({
      width: host.clientWidth || 800,
      height: ((host.clientWidth || 800) * H) / W,
      antialias: true,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      preference: ['webgl', 'canvas'],
    });
    this.app.ticker.stop();
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.pitch, this.overlay, this.ghosts, this.players, this.ballG, this.labelLayer);
    this.ready = true;
    this.resize();
  }

  resize() {
    if (!this.ready || !this.host) return;
    const w = this.host.clientWidth || 800;
    this.app.renderer.resize(w, (w * H) / W);
    this.scale = w / W;
    this.drawPitch();
  }

  destroy() {
    if (this.ready) this.app.destroy(true, { children: true });
    this.ready = false;
  }

  private px(p: Vec): Vec {
    return { x: (p.x + M) * this.scale, y: (p.y + M) * this.scale };
  }

  private drawPitch() {
    const g = this.pitch;
    const s = this.scale;
    g.clear();
    for (let i = 0; i < 10; i++) g.rect(((i * W) / 10) * s, 0, (W / 10) * s, H * s).fill({ color: i % 2 ? 0x166534 : 0x15803d });
    const line = { width: Math.max(1, s * 0.12), color: 0xffffff, alpha: 0.7 };
    const r = (x: number, y: number, w: number, h: number) => {
      const a = this.px({ x, y });
      g.rect(a.x, a.y, w * s, h * s).stroke(line);
    };
    r(0, 0, PITCH.len, PITCH.wid);
    const c = this.px({ x: PITCH.len / 2, y: PITCH.wid / 2 });
    g.moveTo(c.x, M * s).lineTo(c.x, (M + PITCH.wid) * s).stroke(line);
    g.circle(c.x, c.y, 9.15 * s).stroke(line);
    for (const side of [0, 1]) {
      const x0 = side ? PITCH.len - 16.5 : 0;
      r(x0, PITCH.wid / 2 - 20.16, 16.5, 40.32);
      r(side ? PITCH.len - 5.5 : 0, PITCH.wid / 2 - 9.16, 5.5, 18.32);
      r(side ? PITCH.len : -2, PITCH.wid / 2 - PITCH.goalHalf, 2, PITCH.goalHalf * 2);
      const spot = this.px({ x: side ? PITCH.len - 11 : 11, y: PITCH.wid / 2 });
      g.circle(spot.x, spot.y, Math.max(1, s * 0.25)).fill({ color: 0xffffff, alpha: 0.7 });
    }
  }

  private dashed(g: Graphics, a: Vec, b: Vec, style: { width: number; color: number; alpha?: number }, dash = 1.2) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.floor(d / (dash * this.scale)));
    for (let i = 0; i < n; i += 2) {
      const p = mix(a, b, i / n), q = mix(a, b, Math.min(1, (i + 1) / n));
      g.moveTo(p.x, p.y).lineTo(q.x, q.y);
    }
    g.stroke(style);
  }

  private arrowHead(g: Graphics, a: Vec, b: Vec, color: number) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const l = 1.2 * this.scale;
    g.moveTo(b.x, b.y).lineTo(b.x - Math.cos(ang - 0.5) * l, b.y - Math.sin(ang - 0.5) * l)
      .lineTo(b.x - Math.cos(ang + 0.5) * l, b.y - Math.sin(ang + 0.5) * l).closePath().fill({ color });
  }

  draw(f: FrameInput) {
    if (!this.ready) return;
    const s = this.scale;
    const w = f.world;
    const pos = w.agents.map((a, i) => mix(f.prev[i] ?? a.pos, a.pos, f.alpha));
    const focusIdx = w.agents.findIndex((a) => a.spec.id === f.focus);
    const focus = w.agents[focusIdx];
    const o = this.overlay;
    o.clear();

    if (f.overlays.lines) {
      for (const team of [0, 1] as const) {
        const outfield = w.agents.filter((a) => a.spec.team === team && a.spec.slot !== 'GK');
        const depth = Math.min(...outfield.map((a) => frame(team, a.pos).x));
        const ys = outfield.map((a) => a.pos.y);
        const lineX = frame(team, { x: depth, y: 0 }).x;
        this.dashed(o, this.px({ x: lineX, y: 0 }), this.px({ x: lineX, y: PITCH.wid }), { width: 2, color: TEAM[team], alpha: 0.8 });
        const a = this.px({ x: lineX, y: Math.min(...ys) }), b = this.px({ x: lineX, y: Math.max(...ys) });
        o.moveTo(a.x - 4, a.y).lineTo(a.x + 4, a.y).moveTo(b.x - 4, b.y).lineTo(b.x + 4, b.y).stroke({ width: 2, color: TEAM[team] });
        if (w.possession !== team) {
          const loeX = frame(team, { x: w.teams[team].mods.loe, y: 0 }).x;
          this.dashed(o, this.px({ x: loeX, y: 0 }), this.px({ x: loeX, y: PITCH.wid }), { width: 1.5, color: 0xffffff, alpha: 0.6 }, 0.6);
        }
      }
    }

    if (f.overlays.pressure) {
      for (const a of w.agents) {
        if (w.possession === a.spec.team || a.spec.slot === 'GK' || (f.focusOnly && a.spec.id !== f.focus)) continue;
        const m = resolveMods(w.teams[a.spec.team].mods, a.spec, w.phase[a.spec.team], w.know);
        const r = m.profile.oop.pressRadius * attr('pressWill', a.spec.attrs) * m.pressMult;
        const p = this.px(pos[w.agents.indexOf(a)]);
        o.circle(p.x, p.y, r * s).fill({ color: TEAM[a.spec.team], alpha: a.pressing ? 0.22 : 0.08 }).stroke({ width: 1, color: TEAM[a.spec.team], alpha: 0.5 });
      }
    }

    if (f.overlays.shape && focus) {
      for (const a of w.agents) {
        if (a.spec.team !== focus.spec.team) continue;
        const p = this.px(a.planTarget);
        o.circle(p.x, p.y, 0.8 * s).stroke({ width: 1.5, color: 0xffffff, alpha: 0.55 });
      }
    }

    if (f.overlays.runs) {
      for (const a of w.agents) {
        if (a.intent.kind !== 'run' || (f.focusOnly && a.spec.id !== f.focus)) continue;
        const from = this.px(pos[w.agents.indexOf(a)]), to = this.px(a.intent.target);
        this.dashed(o, from, to, { width: 2, color: FOCUS, alpha: 0.85 });
        this.arrowHead(o, from, to, FOCUS);
      }
    }

    if (f.overlays.trail && f.trail.length > 1) {
      const pts = f.trail.map((p) => this.px(p));
      o.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) o.lineTo(p.x, p.y);
      o.stroke({ width: 2, color: FOCUS, alpha: 0.5 });
    }

    if (focus && f.overlays.vision) {
      const p = this.px(pos[focusIdx]);
      const owner = w.ball.owner === focus.spec.id;
      const still = Math.hypot(focus.vel.x, focus.vel.y) < 0.5;
      const cone = owner && still ? 360 : attr('visionCone', focus.spec.attrs);
      const range = attr('visionRange', focus.spec.attrs) * s;
      const half = (cone / 2) * (Math.PI / 180);
      if (cone >= 360) o.circle(p.x, p.y, range);
      else o.moveTo(p.x, p.y).arc(p.x, p.y, range, focus.heading - half, focus.heading + half).lineTo(p.x, p.y);
      o.fill({ color: FOCUS, alpha: 0.08 }).stroke({ width: 1, color: FOCUS, alpha: 0.45 });
    }

    if (focus && f.overlays.options) {
      const tr = focus.trace[focus.trace.length - 1];
      if (tr) {
        const us = tr.options.map((x) => x.utility);
        const lo = Math.min(...us), hi = Math.max(...us);
        const from = this.px(pos[focusIdx]);
        tr.options.forEach((opt, i) => {
          if (opt.kind === 'hold' || opt.kind === 'shape') return;
          const to = this.px(opt.target);
          const t = hi > lo ? (opt.utility - lo) / (hi - lo) : 1;
          const chosen = i === tr.chosen;
          o.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: chosen ? 3.5 : 1.2, color: utilityColor(t), alpha: chosen ? 1 : 0.6 });
        });
      }
    }

    const gh = this.ghosts;
    gh.clear();
    if (f.ghost) {
      const gw = f.ghost.world;
      const gt = f.ghost.trail ?? [];
      if (gt.length > 1) {
        const pts = gt.map((p) => this.px(p));
        gh.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) gh.lineTo(p.x, p.y);
        gh.stroke({ width: 2, color: 0xffffff, alpha: 0.45 });
      }
      gw.agents.forEach((a, i) => {
        const p = this.px(mix(f.ghost!.prev[i] ?? a.pos, a.pos, f.alpha));
        if (a.spec.id === f.focus) gh.circle(p.x, p.y, 1.15 * s).fill({ color: 0xffffff, alpha: 0.35 }).stroke({ width: 2, color: FOCUS, alpha: 0.8 });
        else gh.circle(p.x, p.y, 1.1 * s).fill({ color: TEAM[a.spec.team], alpha: 0.14 });
      });
      const gb = this.px(gw.ball.pos);
      gh.circle(gb.x, gb.y, 0.45 * s).fill({ color: 0xffffff, alpha: 0.35 });
    }

    const pl = this.players;
    pl.clear();
    w.agents.forEach((a, i) => {
      const p = this.px(pos[i]);
      const isFocus = i === focusIdx;
      pl.circle(p.x, p.y, 1.15 * s).fill({ color: TEAM[a.spec.team] }).stroke({ width: isFocus ? 3 : 1.2, color: isFocus ? FOCUS : 0x0b1410 });
      const hx = p.x + Math.cos(a.heading) * 1.15 * s, hy = p.y + Math.sin(a.heading) * 1.15 * s;
      pl.moveTo(p.x, p.y).lineTo(hx, hy).stroke({ width: 1.5, color: 0x0b1410, alpha: 0.7 });
      let label = this.labels.get(a.spec.id);
      if (!label) {
        label = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 11, fill: 0xffffff, fontWeight: '600', stroke: { color: 0x0b1410, width: 3 } } });
        label.anchor.set(0.5, 0);
        this.labels.set(a.spec.id, label);
        this.labelLayer.addChild(label);
      }
      const ab = f.roleAb(a);
      if (label.text !== ab) label.text = ab;
      label.style.fill = isFocus ? FOCUS : 0xffffff;
      label.position.set(p.x, p.y + 1.3 * s);
    });

    const b = this.ballG;
    b.clear();
    const bp = mix(f.prevBall, w.ball.pos, f.alpha);
    const ground = this.px(bp);
    const z = w.ball.z;
    b.ellipse(ground.x, ground.y, (0.5 + z * 0.08) * s, (0.3 + z * 0.05) * s).fill({ color: 0x000000, alpha: Math.max(0.15, 0.4 - z * 0.03) });
    b.circle(ground.x, ground.y - z * 0.45 * s, (0.45 + z * 0.06) * s).fill({ color: 0xffffff }).stroke({ width: 1, color: 0x111111 });
    this.app.render();
  }
}
