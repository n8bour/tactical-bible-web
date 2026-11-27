import { describe, expect, it } from 'vitest';
import {
  PLAYER_ARCHETYPES,
  PLAYER_INSTRUCTIONS,
  ROLES,
  rolesForSlot,
  TACTICAL_PRESETS,
  TEAM_INSTRUCTIONS,
  type PIKey,
} from '../src/data';
import {
  analyzeTactic,
  buildPlayerInstructionDiagram,
  buildRoleDiagram,
  buildTacticPitchDiagram,
  buildTeamInstructionDiagram,
  clampPlayable,
  compareRoles,
  computeZoneCoverage,
  defaultTacticConfig,
  exportTacticJson,
  getFormation,
  parseTacticFile,
  parseTacticFromHash,
  SAFE_X_MAX,
  SAFE_X_MIN,
  SAFE_Y_MAX,
  SAFE_Y_MIN,
  scoreRoleFit,
  serializeTacticToHash,
  suggestRolePairs,
  type BallLane,
  type BallThird,
  type PitchDiagram,
} from '../src/engine';

function assertDiagramInBounds(diagram: PitchDiagram, label: string): void {
  expect(diagram.players.length, `${label} has players`).toBeGreaterThan(0);

  for (const p of diagram.players) {
    expect(p.x, `${label} player ${p.id} x=${p.x}`).toBeGreaterThanOrEqual(SAFE_X_MIN);
    expect(p.x, `${label} player ${p.id} x=${p.x}`).toBeLessThanOrEqual(SAFE_X_MAX);
    expect(p.y, `${label} player ${p.id} y=${p.y}`).toBeGreaterThanOrEqual(SAFE_Y_MIN);
    expect(p.y, `${label} player ${p.id} y=${p.y}`).toBeLessThanOrEqual(SAFE_Y_MAX);
    if (p.ghostX !== undefined) {
      expect(p.ghostX, `${label} player ${p.id} ghostX`).toBeGreaterThanOrEqual(SAFE_X_MIN);
      expect(p.ghostX, `${label} player ${p.id} ghostX`).toBeLessThanOrEqual(SAFE_X_MAX);
    }
    if (p.ghostY !== undefined) {
      expect(p.ghostY, `${label} player ${p.id} ghostY`).toBeGreaterThanOrEqual(SAFE_Y_MIN);
      expect(p.ghostY, `${label} player ${p.id} ghostY`).toBeLessThanOrEqual(SAFE_Y_MAX);
    }
  }

  for (let i = 0; i < diagram.arrows.length; i++) {
    const a = diagram.arrows[i];
    expect(a.from.x, `${label} arrow[${i}].from.x`).toBeGreaterThanOrEqual(SAFE_X_MIN);
    expect(a.from.x, `${label} arrow[${i}].from.x`).toBeLessThanOrEqual(SAFE_X_MAX);
    expect(a.from.y, `${label} arrow[${i}].from.y`).toBeGreaterThanOrEqual(SAFE_Y_MIN);
    expect(a.from.y, `${label} arrow[${i}].from.y`).toBeLessThanOrEqual(SAFE_Y_MAX);
    expect(a.to.x, `${label} arrow[${i}].to.x`).toBeGreaterThanOrEqual(SAFE_X_MIN);
    expect(a.to.x, `${label} arrow[${i}].to.x`).toBeLessThanOrEqual(SAFE_X_MAX);
    expect(a.to.y, `${label} arrow[${i}].to.y`).toBeGreaterThanOrEqual(SAFE_Y_MIN);
    expect(a.to.y, `${label} arrow[${i}].to.y`).toBeLessThanOrEqual(SAFE_Y_MAX);
  }

  for (const h of diagram.highlights ?? []) {
    expect(h.x, `${label} highlight x`).toBeGreaterThanOrEqual(SAFE_X_MIN);
    expect(h.x, `${label} highlight x`).toBeLessThanOrEqual(SAFE_X_MAX);
    expect(h.y, `${label} highlight y`).toBeGreaterThanOrEqual(SAFE_Y_MIN);
    expect(h.y, `${label} highlight y`).toBeLessThanOrEqual(SAFE_Y_MAX);
  }

  if (diagram.ball) {
    expect(diagram.ball.x, `${label} ball.x`).toBeGreaterThanOrEqual(SAFE_X_MIN);
    expect(diagram.ball.x, `${label} ball.x`).toBeLessThanOrEqual(SAFE_X_MAX);
    expect(diagram.ball.y, `${label} ball.y`).toBeGreaterThanOrEqual(SAFE_Y_MIN);
    expect(diagram.ball.y, `${label} ball.y`).toBeLessThanOrEqual(SAFE_Y_MAX);
  }

  for (const l of diagram.lines ?? []) {
    expect(l.x, `${label} line x`).toBeGreaterThanOrEqual(SAFE_X_MIN);
    expect(l.x, `${label} line x`).toBeLessThanOrEqual(SAFE_X_MAX);
  }
}

async function compressDeflate(text: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(text);
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  const writeDone = writer.write(input).then(() => writer.close());
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  await writeDone;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

describe('FM27 Engine: pitch diagrams & strict safe playable bounds', () => {
  it('clampPlayable enforces [4..101] x [5..63]', () => {
    expect(clampPlayable({ x: -10, y: -5 })).toEqual({ x: SAFE_X_MIN, y: SAFE_Y_MIN });
    expect(clampPlayable({ x: 140, y: 80 })).toEqual({ x: SAFE_X_MAX, y: SAFE_Y_MAX });
    expect(clampPlayable({ x: 52.54, y: 34.02 })).toEqual({ x: 52.5, y: 34 });
  });

  it('produces 0 out-of-bounds coordinates across all 77 roles', () => {
    expect(ROLES).toHaveLength(77);
    for (const role of ROLES) {
      const d = buildRoleDiagram(role.id);
      assertDiagramInBounds(d, `role:${role.id}`);
      expect(d.arrows.length, `role ${role.id} arrows`).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces 0 out-of-bounds coordinates across all 27 TIs (every option)', () => {
    expect(TEAM_INSTRUCTIONS).toHaveLength(27);
    for (const ti of TEAM_INSTRUCTIONS) {
      for (let opt = 0; opt < ti.options.length; opt++) {
        const d = buildTeamInstructionDiagram(ti.key, opt);
        assertDiagramInBounds(d, `ti:${ti.key}[${opt}]`);
      }
    }
  });

  it('produces 0 out-of-bounds coordinates across all 24 PIs', () => {
    expect(PLAYER_INSTRUCTIONS).toHaveLength(24);
    for (const pi of PLAYER_INSTRUCTIONS) {
      const d = buildPlayerInstructionDiagram(pi.key);
      assertDiagramInBounds(d, `pi:${pi.key}`);
      expect(d.arrows.length, `pi ${pi.key} arrows`).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces 0 out-of-bounds across all 6 presets, both phases, and all 9 3×3 ball zones', () => {
    const thirds: BallThird[] = ['def', 'mid', 'att'];
    const lanes: BallLane[] = ['left', 'centre', 'right'];

    for (const preset of TACTICAL_PRESETS) {
      const cfg = defaultTacticConfig(preset.id);
      for (const phase of ['ip', 'oop'] as const) {
        assertDiagramInBounds(buildTacticPitchDiagram(cfg, phase), `${preset.id}:${phase}`);
        for (const third of thirds) {
          for (const lane of lanes) {
            const d = buildTacticPitchDiagram(cfg, phase, { third, lane });
            assertDiagramInBounds(d, `${preset.id}:${phase}:${third}/${lane}`);
            expect(d.ball).toBeDefined();
            if (third !== 'mid' || lane !== 'centre') {
              expect(d.arrows.length, `${preset.id}:${phase}:${third}/${lane} shift arrows`).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it('stays strictly in bounds under extreme stacked Very Attacking + Much Wider + Stay Wider + Get Further Forward', () => {
    const cfg = defaultTacticConfig('direct-352');
    cfg.mentality = 6; // Very Attacking
    cfg.tis.width = 4; // Much Wider
    cfg.tis.support_runs = 2; // Overlap
    cfg.tis.dline = 4;
    cfg.tis.loe = 2;
    cfg.tis.dl_behaviour = 2;
    for (const s of getFormation(cfg.ipFormation).slots) {
      if (s.group !== 'GK') {
        cfg.pis[s.code] = ['stay_wider', 'get_further_forward'] as PIKey[];
      }
    }
    assertDiagramInBounds(buildTacticPitchDiagram(cfg, 'ip'), 'extreme-ip');
    assertDiagramInBounds(
      buildTacticPitchDiagram(cfg, 'ip', { third: 'att', lane: 'right' }),
      'extreme-ip-att-right',
    );
    assertDiagramInBounds(
      buildTacticPitchDiagram(cfg, 'oop', { third: 'att', lane: 'left' }),
      'extreme-oop-att-left',
    );
  });

  it('spreads Attacking Width smoothly & monotonically across all 5 options strictly inside y ∈ [5, 63]', () => {
    const spreads: number[] = [];
    const leftWingYs: number[] = [];
    const rightWingYs: number[] = [];

    for (let opt = 0; opt < 5; opt++) {
      const d = buildTeamInstructionDiagram('width', opt);
      assertDiagramInBounds(d, `width:${opt}`);
      const aml = d.players.find((p) => p.slot === 'AML')!;
      const amr = d.players.find((p) => p.slot === 'AMR')!;
      leftWingYs.push(aml.y);
      rightWingYs.push(amr.y);
      spreads.push(amr.y - aml.y);
    }

    for (let i = 1; i < spreads.length; i++) {
      expect(spreads[i]).toBeGreaterThan(spreads[i - 1]);
      expect(leftWingYs[i]).toBeLessThan(leftWingYs[i - 1]);
      expect(rightWingYs[i]).toBeGreaterThan(rightWingYs[i - 1]);
    }
    expect(Math.min(...leftWingYs)).toBeGreaterThanOrEqual(SAFE_Y_MIN);
    expect(Math.max(...rightWingYs)).toBeLessThanOrEqual(SAFE_Y_MAX);
  });

  it('renders FM27 Box Attacking depth trio clearly with forward shoulder-to-box arrow and 0 backwards arrows', () => {
    const std = buildPlayerInstructionDiagram('attack_the_defensive_line', 'Standard');
    const late = buildPlayerInstructionDiagram('arrive_late', 'arrive_late');
    const line = buildPlayerInstructionDiagram('attack_the_defensive_line');

    assertDiagramInBounds(std, 'box-standard');
    assertDiagramInBounds(late, 'box-arrive-late');
    assertDiagramInBounds(line, 'box-attack-line');

    const stdHero = std.players.find((p) => p.highlight)!;
    const lateHero = late.players.find((p) => p.highlight)!;
    const lineHero = line.players.find((p) => p.highlight)!;

    expect(stdHero.x).toBeCloseTo(79, 0);
    expect(lateHero.x).toBeCloseTo(78, 0);
    expect(lineHero.x).toBeCloseTo(86.5, 0);

    // Delayed burst arrow advances cleanly forward into space (~92 m)
    const lateRun = late.arrows.find((a) => a.kind === 'run')!;
    expect(lateRun.to.x).toBeGreaterThan(lateRun.from.x + 10);
    expect(lateRun.to.x).toBeCloseTo(92, 0);

    // Attack the Defensive Line: shoulder (~86.5) -> box (~95), ZERO backwards arrows
    const lineRun = line.arrows.find((a) => a.kind === 'run')!;
    expect(lineRun.from.x).toBeCloseTo(86.5, 0);
    expect(lineRun.to.x).toBeCloseTo(95, 0);
    for (const arrow of line.arrows) {
      expect(arrow.to.x).toBeGreaterThanOrEqual(arrow.from.x);
    }
  });
});

describe('FM27 Engine: 35-zone coverage & tactical diagnostics', () => {
  it('computes 7x5 (35-zone) coverage with valid clickable role swaps', () => {
    const cfg = defaultTacticConfig('positional-325');
    // Force a left-wing gap by inverting both left-flank players
    cfg.ipRoles.DL = 'ifb';
    cfg.ipRoles.AML = 'if_ip';
    cfg.pis.AML = ['sit_narrower'];

    for (const phase of ['ip', 'oop', 'combined'] as const) {
      const report = computeZoneCoverage(cfg, phase);
      expect(report.cols).toBe(7);
      expect(report.rows).toBe(5);
      expect(report.cells).toHaveLength(35);
      expect(report.colLabels).toHaveLength(7);
      expect(report.rowLabels).toHaveLength(5);
      expect(report.bandGrades.defense).toBeGreaterThanOrEqual(0);
      expect(report.bandGrades.defense).toBeLessThanOrEqual(100);
      expect(report.bandGrades.midfield).toBeGreaterThanOrEqual(0);
      expect(report.bandGrades.attack).toBeGreaterThanOrEqual(0);

      for (const swap of report.swaps) {
        const form = getFormation(swap.phase === 'ip' ? cfg.ipFormation : cfg.oopFormation);
        const slotCodes = form.slots.map((s) => s.code);
        const validIds = rolesForSlot(swap.slot, slotCodes, swap.phase).map((r) => r.id);
        expect(validIds, `swap ${swap.id}`).toContain(swap.suggestedRoleId);
        expect(swap.suggestedRoleId).not.toBe(swap.currentRoleId);
      }
    }
  });

  it('analyzeTactic detects coherence clashes, complexity, transition distance, and rest-defence', () => {
    const broken = defaultTacticConfig('high-press-433');
    broken.mentality = 6; // Very Attacking
    broken.tis.buildup = 0; // Play Through Press
    broken.tis.loe = 2; // High Press
    broken.tis.dl_behaviour = 2; // Step Up More
    broken.ipRoles.GK = 'nngk';
    broken.ipRoles.DCR = 'nncb';
    broken.ipRoles.DM = 'dlp';
    broken.ipRoles.MCL = 'mp';
    broken.ipRoles.MCR = 'ap';

    const res = analyzeTactic(broken);
    expect(res.complexityScore).toBeGreaterThanOrEqual(0);
    expect(res.complexityScore).toBeLessThanOrEqual(100);
    expect(['Simple', 'Moderate', 'Complex', 'Very Complex']).toContain(res.complexityTier);

    const ids = res.diagnostics.map((d) => d.id);
    expect(ids).toContain('coherence-nncb-play-through');
    expect(ids).toContain('coherence-press-overload');
    expect(ids).toContain('creativity-duplicate-playmakers');
    expect(ids).toContain('fm27-complexity');

    const complexityDiag = res.diagnostics.find((d) => d.id === 'fm27-complexity')!;
    expect(complexityDiag.detail).toContain('Tactical Understanding');
    expect(complexityDiag.detail).toContain('3-week');
  });
});

describe('FM27 Engine: Role Fit Finder, Pair Suggester & Comparator', () => {
  it('scores role fits in both role and fm27-me modes deterministically', () => {
    const winger = PLAYER_ARCHETYPES.find((a) => a.id === 'explosive-inside-forward')!;
    const roleMode = scoreRoleFit(winger.attrs, { group: 'AM_LR', phase: 'ip', mode: 'role' });
    const meMode = scoreRoleFit(winger.attrs, { group: 'AM_LR', phase: 'ip', mode: 'fm27-me' });

    expect(roleMode.length).toBeGreaterThan(0);
    expect(roleMode[0].meBonus).toBe(0);
    expect(meMode[0].meBonus).toBeGreaterThan(0);
    expect(meMode[0].score).toBeGreaterThan(roleMode[0].score);
    expect(roleMode[0].strengths).toHaveLength(3);
    expect(roleMode[0].weaknesses).toHaveLength(3);
  });

  it('suggests compatible IP + OOP role pairs', () => {
    const dm = PLAYER_ARCHETYPES.find((a) => a.id === 'destroyer-anchor-dm')!;
    const pairs = suggestRolePairs(dm.attrs, 'DM', 'fm27-me', 4);
    expect(pairs).toHaveLength(4);
    for (const p of pairs) {
      expect(p.ip.role.phase).toBe('ip');
      expect(p.oop.role.phase).toBe('oop');
      expect(p.ip.role.groups).toContain('DM');
      expect(p.oop.role.groups).toContain('DM');
      expect(p.fitNote.length).toBeGreaterThan(10);
    }
    expect(pairs[0].combinedScore).toBeGreaterThanOrEqual(pairs[1].combinedScore);
  });

  it('compares two roles cleanly and returns null on invalid IDs', () => {
    const cmp = compareRoles('iwb', 'wb_ip');
    expect(cmp).not.toBeNull();
    expect(cmp!.samePhase).toBe(true);
    expect(cmp!.groups.shared).toContain('D_LR');
    expect(cmp!.profileDiffs).toHaveLength(11);
    const widthDiff = cmp!.profileDiffs.find((d) => d.metric === 'width')!;
    expect(widthDiff.diff).toBeLessThan(0); // IWB narrower than WB
    expect(cmp!.legacyEquiv.a).toBe('FM24 Inverted Wing-Back');
    expect(compareRoles('iwb', 'does-not-exist')).toBeNull();
  });
});

describe('FM27 Engine: URL hash, JSON & synthetic zlib .fmf I/O', () => {
  it('round-trips a full tactic cleanly through URL hash', () => {
    const cfg = defaultTacticConfig('asymmetric-4231');
    const hash = serializeTacticToHash(cfg);
    expect(hash.length).toBeGreaterThan(20);
    const parsed = parseTacticFromHash(`#tactic?${hash}`);
    expect(parsed).not.toBeNull();
    expect(parsed!.ipFormation).toBe(cfg.ipFormation);
    expect(parsed!.oopFormation).toBe(cfg.oopFormation);
    expect(parsed!.mentality).toBe(cfg.mentality);
    expect(parsed!.name).toBe(cfg.name);
    expect(parsed!.tis?.support_runs).toBe(2);
    expect(parsed!.ipRoles?.DL).toBe('wb_ip');
    expect(parsed!.oopRoles?.GK).toBe('swk');
    expect(parsed!.pis?.ST).toEqual(['attack_the_defensive_line', 'target_near_post']);
  });

  it('round-trips a full tactic losslessly through tactical-bible-v1 JSON', async () => {
    const cfg = defaultTacticConfig('high-press-433');
    const json = exportTacticJson(cfg);
    const bytes = new TextEncoder().encode(json);
    const imported = await parseTacticFile(bytes, 'high-press.json');

    expect(imported.ok).toBe(true);
    expect(imported.format).toBe('json');
    expect(imported.confidence).toBe('exact');
    expect(imported.tactic.ipFormation).toBe(cfg.ipFormation);
    expect(imported.tactic.oopFormation).toBe(cfg.oopFormation);
    expect(imported.tactic.mentality).toBe(cfg.mentality);
    expect(imported.tactic.ipRoles).toEqual(cfg.ipRoles);
    expect(imported.tactic.oopRoles).toEqual(cfg.oopRoles);
    expect(imported.tactic.pis).toEqual(cfg.pis);
  });

  it('parses a synthetic zlib-compressed .fmf binary file with FM24 legacy role mapping', async () => {
    const innerPayload = [
      '4-3-3 DM Wide',
      'Positive',
      'Play Through Press',
      'Counter-Press',
      'High Press',
      'Work Ball Into Box',
      'Inverted Wing-Back',
      'Mezzala',
      'Pressing Forward',
      'Arrive Late',
    ].join('\x00');

    const compressed = await compressDeflate(innerPayload);
    const header = new Uint8Array([0x02, 0x01, 0x66, 0x6d, 0x66, 0x2e, 0x00, 0x00]); // \x02\x01fmf.
    const fmfBytes = new Uint8Array(header.length + compressed.length);
    fmfBytes.set(header, 0);
    fmfBytes.set(compressed, header.length);

    const res = await parseTacticFile(fmfBytes, 'Gegenpress_433.fmf');
    expect(res.ok).toBe(true);
    expect(res.format).toBe('fmf');
    expect(res.confidence).toBe('partial');
    expect(res.tacticName).toBe('Gegenpress_433');
    expect(res.tactic.ipFormation).toBe('4-3-3 DM Wide');
    expect(res.tactic.mentality).toBe(4); // Positive
    expect(res.tactic.tis?.buildup).toBe(0); // Play Through Press
    expect(res.tactic.tis?.def_trans).toBe(2); // Counter-Press
    expect(res.tactic.tis?.loe).toBe(2); // High Press
    expect(res.tactic.tis?.patience).toBe(2); // Work Ball Into Box
    expect(Object.values(res.tactic.ipRoles ?? {})).toContain('iwb');
    expect(Object.values(res.tactic.ipRoles ?? {})).toContain('chm');
    expect(Object.values(res.tactic.oopRoles ?? {})).toContain('tcf');
    expect(res.warnings.some((w) => w.includes('Inverted Wing-Back'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('Mezzala'))).toBe(true);
  });

  it('rejects empty or unrecognized binary garbage cleanly', async () => {
    const empty = await parseTacticFile(new Uint8Array());
    expect(empty.ok).toBe(false);

    const garbage = await parseTacticFile(new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x11, 0x22]), 'random.bin');
    expect(garbage.ok).toBe(false);
    expect(garbage.format).toBe('unknown');
  });
});
