import type { FormationSlot } from '@tb/sim';
import roles from '../../data/roles.json';

export type Group = 'GK' | 'DC' | 'D_LR' | 'WB_LR' | 'DM' | 'MC' | 'M_LR' | 'AMC' | 'AM_LR' | 'ST';
export type RoleData = (typeof roles)[number];

export const ROLES: RoleData[] = roles;
export const ROLE_BY_ID: Record<string, RoleData> = Object.fromEntries(roles.map((r) => [r.id, r]));

export function groupOf(code: string): Group {
  if (code === 'GK') return 'GK';
  if (code === 'DL' || code === 'DR') return 'D_LR';
  if (code.startsWith('DC')) return 'DC';
  if (code.startsWith('WB')) return 'WB_LR';
  if (code.startsWith('DM')) return 'DM';
  if (code === 'ML' || code === 'MR') return 'M_LR';
  if (code.startsWith('MC')) return 'MC';
  if (code === 'AML' || code === 'AMR') return 'AM_LR';
  if (code.startsWith('AMC')) return 'AMC';
  if (code.startsWith('ST')) return 'ST';
  return 'MC';
}

export function isWideCB(code: string, slots: FormationSlot[]): boolean {
  return slots.filter((s) => s.code.startsWith('DC')).length >= 3 && (code === 'DCL' || code === 'DCR');
}

/** 'C' for the central slot of a line, 'S' for the shifted ones (DML, MCR…); null where it doesn't apply. */
function slotPos(code: string): 'C' | 'S' | null {
  if (['DM', 'MC', 'AMC', 'ST', 'DC'].includes(code)) return 'C';
  return /^(DM|MC|AMC|ST|DC)[LR]$/.test(code) ? 'S' : null;
}

export function roleFits(r: RoleData, code: string, slots: FormationSlot[], phase: 'IP' | 'OOP'): boolean {
  if (r.phase !== phase || !r.groups.includes(groupOf(code))) return false;
  if ('wideCB' in r && r.wideCB && !isWideCB(code, slots)) return false;
  if ('slot' in r && r.slot) {
    const sp = slotPos(code);
    if (sp && sp !== r.slot) return false;
  }
  return true;
}

export function rolesFor(code: string, slots: FormationSlot[], phase: 'IP' | 'OOP'): RoleData[] {
  return roles.filter((r) => roleFits(r, code, slots, phase));
}

export const DEFAULT_ROLE: Record<'IP' | 'OOP', Record<Group, string>> = {
  IP: { GK: 'gk_ip', DC: 'cb_ip', D_LR: 'fb_ip', WB_LR: 'wb_ip', DM: 'dm_ip', MC: 'cm_ip', M_LR: 'wm_ip', AMC: 'am_ip', AM_LR: 'w_ip', ST: 'cf_ip' },
  OOP: { GK: 'gk_oop', DC: 'cb_oop', D_LR: 'fb_oop', WB_LR: 'wb_oop', DM: 'dm_oop', MC: 'cm_oop', M_LR: 'wm_oop', AMC: 'am_oop', AM_LR: 'w_oop', ST: 'cf_oop' },
};
