import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_BY_KEY,
  ATTRIBUTES,
  CONCEPTS,
  FORMATION_BY_ID,
  FORMATIONS,
  IN_MATCH_GUIDE,
  MENTALITIES,
  OPPONENT_GUIDES,
  OPPOSITION_INSTRUCTIONS,
  PI_BY_KEY,
  PLAYER_INSTRUCTIONS,
  PLAYER_TRAITS,
  PUBLIC_SOURCES,
  ROLE_BY_ID,
  ROLES,
  rolesForSlot,
  SET_PIECES,
  SOURCE_BY_ID,
  TACTICAL_PRESETS,
  TEAM_INSTRUCTIONS,
  TI_BY_KEY,
  TROUBLESHOOTING,
} from './index';

describe('FM27 Tactical Bible data integrity', () => {
  it('has 17 verified public sources with https URLs', () => {
    expect(PUBLIC_SOURCES).toHaveLength(17);
    const ids = new Set(PUBLIC_SOURCES.map((s) => s.id));
    expect(ids.size).toBe(17);
    for (const src of PUBLIC_SOURCES) {
      expect(src.url.startsWith('https://')).toBe(true);
    }
  });

  it('has all 77 FM26/FM27 roles (39 IP + 38 OOP) with valid attrs, sources, and clean copy', () => {
    expect(ROLES).toHaveLength(77);
    expect(ROLES.filter((r) => r.phase === 'ip')).toHaveLength(39);
    expect(ROLES.filter((r) => r.phase === 'oop')).toHaveLength(38);
    expect(ROLE_BY_ID.dlp.groups).toContain('MC');
    expect(ROLE_BY_ID.b2b.groups).toContain('MC');

    const ids = new Set<string>();
    for (const role of ROLES) {
      expect(ids.has(role.id)).toBe(false);
      ids.add(role.id);
      for (const a of [...role.key, ...role.pref]) {
        expect(ATTRIBUTE_BY_KEY[a], `Invalid attr ${a} on role ${role.id}`).toBeDefined();
      }
      for (const sid of role.sourceIds) {
        expect(SOURCE_BY_ID[sid], `Invalid source ${sid} on role ${role.id}`).toBeDefined();
      }
      expect(role.summary.toLowerCase()).not.toContain('duty');
      expect(role.tip.toLowerCase()).not.toContain('duty');
      expect((role.legacyEquiv ?? '').toLowerCase()).not.toContain('duty');
      expect(role.profile.note.length).toBeGreaterThan(5);
    }
  });

  it('has normalized 105x68 formations strictly within safe playable coordinates', () => {
    expect(FORMATIONS.length).toBeGreaterThanOrEqual(10);
    for (const form of FORMATIONS) {
      expect(form.slots).toHaveLength(11);
      const codes = form.slots.map((s) => s.code);
      expect(new Set(codes).size).toBe(11);
      for (const s of form.slots) {
        expect(s.x, `${form.id} ${s.code} x`).toBeGreaterThanOrEqual(6);
        expect(s.x, `${form.id} ${s.code} x`).toBeLessThanOrEqual(94);
        expect(s.y, `${form.id} ${s.code} y`).toBeGreaterThanOrEqual(10);
        expect(s.y, `${form.id} ${s.code} y`).toBeLessThanOrEqual(58);
        expect(ROLE_BY_ID[s.defaultIpRole]?.phase).toBe('ip');
        expect(ROLE_BY_ID[s.defaultOopRole]?.phase).toBe('oop');
      }
    }
  });

  it('has 27 TIs, 24 PIs (symmetric exclusions), 7 Mentalities, and 6 valid Presets', () => {
    expect(TEAM_INSTRUCTIONS).toHaveLength(27);
    for (const ti of TEAM_INSTRUCTIONS) {
      expect(ti.optionNotes).toHaveLength(ti.options.length);
      expect(ti.defaultIndex).toBeGreaterThanOrEqual(0);
      expect(ti.defaultIndex).toBeLessThan(ti.options.length);
      for (const a of [...(ti.need.low ?? []), ...(ti.need.high ?? [])]) {
        expect(ATTRIBUTE_BY_KEY[a]).toBeDefined();
      }
    }

    expect(PLAYER_INSTRUCTIONS).toHaveLength(24);
    for (const pi of PLAYER_INSTRUCTIONS) {
      for (const other of pi.incompatibleWith) {
        expect(PI_BY_KEY[other], `Missing PI ${other}`).toBeDefined();
        expect(PI_BY_KEY[other].incompatibleWith).toContain(pi.key);
      }
      if (pi.family !== 'Passing') {
        expect(pi.allowedGroups).not.toContain('GK');
      }
      for (const a of pi.need) {
        expect(ATTRIBUTE_BY_KEY[a]).toBeDefined();
      }
    }

    expect(MENTALITIES).toHaveLength(7);

    expect(TACTICAL_PRESETS).toHaveLength(6);
    for (const preset of TACTICAL_PRESETS) {
      const ipForm = FORMATION_BY_ID[preset.ipFormation];
      const oopForm = FORMATION_BY_ID[preset.oopFormation];
      expect(ipForm, `Missing IP formation ${preset.ipFormation}`).toBeDefined();
      expect(oopForm, `Missing OOP formation ${preset.oopFormation}`).toBeDefined();

      const ipCodes = ipForm.slots.map((s) => s.code);
      const oopCodes = oopForm.slots.map((s) => s.code);

      for (const code of ipCodes) {
        const rid = preset.ipRoles[code];
        const valid = rolesForSlot(code, ipCodes, 'ip').map((r) => r.id);
        expect(valid, `Preset ${preset.id} IP ${code}=${rid}`).toContain(rid);
      }
      for (const code of oopCodes) {
        const rid = preset.oopRoles[code];
        const valid = rolesForSlot(code, oopCodes, 'oop').map((r) => r.id);
        expect(valid, `Preset ${preset.id} OOP ${code}=${rid}`).toContain(rid);
      }
      for (const [tiKey, val] of Object.entries(preset.tis)) {
        const ti = TI_BY_KEY[tiKey as keyof typeof TI_BY_KEY];
        expect(ti).toBeDefined();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(ti.options.length);
      }
      for (const [slotCode, piList] of Object.entries(preset.pis)) {
        expect(ipCodes).toContain(slotCode);
        for (const piKey of piList) {
          expect(PI_BY_KEY[piKey]).toBeDefined();
        }
      }
    }
  });

  it('has all 47 FM attributes and all 7 guide reference sets', () => {
    expect(ATTRIBUTES).toHaveLength(47);
    expect(ATTRIBUTES.filter((a) => a.category === 'Technical')).toHaveLength(14);
    expect(ATTRIBUTES.filter((a) => a.category === 'Mental')).toHaveLength(14);
    expect(ATTRIBUTES.filter((a) => a.category === 'Physical')).toHaveLength(8);
    expect(ATTRIBUTES.filter((a) => a.category === 'Goalkeeping')).toHaveLength(11);

    expect(CONCEPTS).toHaveLength(10);
    expect(OPPONENT_GUIDES).toHaveLength(6);
    expect(OPPOSITION_INSTRUCTIONS.actions).toHaveLength(4);
    expect(OPPOSITION_INSTRUCTIONS.archetypes).toHaveLength(7);
    expect(PLAYER_TRAITS).toHaveLength(18);
    expect(SET_PIECES.categories).toHaveLength(4);
    expect(SET_PIECES.categories.reduce((acc, c) => acc + c.routines.length, 0)).toBe(12);
    expect(TROUBLESHOOTING).toHaveLength(9);
    expect(IN_MATCH_GUIDE.tweaks).toHaveLength(5);
    expect(IN_MATCH_GUIDE.shouts).toHaveLength(6);
  });
});
