import {
  FORMATION_BY_ID,
  FORMATIONS,
  MENTALITIES,
  PI_BY_KEY,
  PLAYER_INSTRUCTIONS,
  ROLE_BY_ID,
  ROLES,
  rolesForSlot,
  TEAM_INSTRUCTIONS,
  TI_BY_KEY,
  TI_DEFAULTS,
  type PIKey,
  type TIKey,
} from '../data';
import { getFormation } from './pitch';
import type { FmfImportResult, TacticConfig } from './types';

// ── 1. Compact Shareable URL Hash Serialization ───────────────────────────────

export function serializeTacticToHash(config: TacticConfig): string {
  const params = new URLSearchParams();
  params.set('v', '1');
  if (config.name && config.name.trim()) {
    params.set('n', config.name.trim());
  }
  params.set('ip', config.ipFormation);
  params.set('oop', config.oopFormation);
  params.set('m', String(Math.max(0, Math.min(6, Math.round(config.mentality)))));

  const ipForm = getFormation(config.ipFormation);
  const oopForm = getFormation(config.oopFormation);

  const nonDefaultTis = Object.entries(config.tis)
    .filter(([k, v]) => {
      const def = TI_BY_KEY[k as TIKey];
      return def !== undefined && typeof v === 'number' && v !== def.defaultIndex;
    })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`);
  if (nonDefaultTis.length > 0) {
    params.set('ti', nonDefaultTis.join(','));
  }

  const ipDefaults = new Map(ipForm.slots.map((s) => [s.code, s.defaultIpRole]));
  const nonDefaultIpRoles = Object.entries(config.ipRoles)
    .filter(([slot, rid]) => ipDefaults.has(slot) && rid !== ipDefaults.get(slot))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, rid]) => `${slot}:${rid}`);
  if (nonDefaultIpRoles.length > 0) {
    params.set('ir', nonDefaultIpRoles.join(','));
  }

  const oopDefaults = new Map(oopForm.slots.map((s) => [s.code, s.defaultOopRole]));
  const nonDefaultOopRoles = Object.entries(config.oopRoles)
    .filter(([slot, rid]) => oopDefaults.has(slot) && rid !== oopDefaults.get(slot))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, rid]) => `${slot}:${rid}`);
  if (nonDefaultOopRoles.length > 0) {
    params.set('or', nonDefaultOopRoles.join(','));
  }

  const piEntries = Object.entries(config.pis)
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, list]) => `${slot}:${list.join('.')}`);
  if (piEntries.length > 0) {
    params.set('pi', piEntries.join(','));
  }

  return params.toString();
}

export function parseTacticFromHash(query: string): Partial<TacticConfig> | null {
  if (!query || typeof query !== 'string') return null;
  let clean = query.trim();
  const qIdx = clean.indexOf('?');
  if (qIdx >= 0) {
    clean = clean.slice(qIdx + 1);
  } else if (clean.startsWith('#')) {
    clean = clean.slice(1);
  }
  if (!clean) return null;

  const params = new URLSearchParams(clean);
  const result: Partial<TacticConfig> = {};
  let hasAny = false;

  const name = params.get('n');
  if (name && name.trim()) {
    result.name = name.trim();
    hasAny = true;
  }

  const ip = params.get('ip');
  if (ip && FORMATION_BY_ID[ip]) {
    result.ipFormation = ip;
    hasAny = true;
  }

  const oop = params.get('oop');
  if (oop && FORMATION_BY_ID[oop]) {
    result.oopFormation = oop;
    hasAny = true;
  }

  const mRaw = params.get('m');
  if (mRaw !== null && mRaw !== '') {
    const mNum = Number(mRaw);
    if (Number.isInteger(mNum) && mNum >= 0 && mNum <= 6) {
      result.mentality = mNum;
      hasAny = true;
    }
  }

  const tiRaw = params.get('ti');
  if (tiRaw) {
    const tis: Record<string, number> = { ...TI_DEFAULTS };
    for (const pair of tiRaw.split(',')) {
      const [k, vRaw] = pair.split(':');
      const def = TI_BY_KEY[k as TIKey];
      const v = Number(vRaw);
      if (def && Number.isInteger(v) && v >= 0 && v < def.options.length) {
        tis[k] = v;
        hasAny = true;
      }
    }
    result.tis = tis;
  }

  const irRaw = params.get('ir');
  if (irRaw) {
    const ipRoles: Record<string, string> = {};
    if (result.ipFormation) {
      for (const s of getFormation(result.ipFormation).slots) {
        ipRoles[s.code] = s.defaultIpRole;
      }
    }
    for (const pair of irRaw.split(',')) {
      const [slot, rid] = pair.split(':');
      if (slot && rid && ROLE_BY_ID[rid]?.phase === 'ip') {
        ipRoles[slot] = rid;
        hasAny = true;
      }
    }
    result.ipRoles = ipRoles;
  }

  const orRaw = params.get('or');
  if (orRaw) {
    const oopRoles: Record<string, string> = {};
    if (result.oopFormation) {
      for (const s of getFormation(result.oopFormation).slots) {
        oopRoles[s.code] = s.defaultOopRole;
      }
    }
    for (const pair of orRaw.split(',')) {
      const [slot, rid] = pair.split(':');
      if (slot && rid && ROLE_BY_ID[rid]?.phase === 'oop') {
        oopRoles[slot] = rid;
        hasAny = true;
      }
    }
    result.oopRoles = oopRoles;
  }

  const piRaw = params.get('pi');
  if (piRaw) {
    const pis: Record<string, PIKey[]> = {};
    for (const entry of piRaw.split(',')) {
      const [slot, keysStr] = entry.split(':');
      if (!slot || !keysStr) continue;
      const validKeys = keysStr
        .split('.')
        .filter((k): k is PIKey => Boolean(PI_BY_KEY[k as PIKey]));
      if (validKeys.length > 0) {
        pis[slot] = validKeys;
        hasAny = true;
      }
    }
    result.pis = pis;
  }

  return hasAny ? result : null;
}

// ── 2. Lossless JSON Export (`tactical-bible-v1`) ─────────────────────────────

interface TacticalBibleJsonV1 {
  schema: 'tactical-bible-v1';
  name?: string;
  ipFormation: string;
  oopFormation: string;
  mentality: number;
  tis: Record<string, number>;
  ipRoles: Record<string, string>;
  oopRoles: Record<string, string>;
  pis: Record<string, PIKey[]>;
}

export function exportTacticJson(config: TacticConfig): string {
  const payload: TacticalBibleJsonV1 = {
    schema: 'tactical-bible-v1',
    ...(config.name ? { name: config.name } : {}),
    ipFormation: config.ipFormation,
    oopFormation: config.oopFormation,
    mentality: config.mentality,
    tis: { ...config.tis },
    ipRoles: { ...config.ipRoles },
    oopRoles: { ...config.oopRoles },
    pis: Object.fromEntries(
      Object.entries(config.pis).map(([slot, list]) => [slot, [...list]]),
    ),
  };
  return JSON.stringify(payload, null, 2);
}

// ── 3. File Import: `tactical-bible-v1` JSON & FM `.fmf` Binary ──────────────

const FM24_LEGACY_ROLE_MAP: ReadonlyArray<{ pattern: string; roleId: string; label: string }> = [
  { pattern: 'inverted wing-back', roleId: 'iwb', label: 'FM24 Inverted Wing-Back → Inside Wing-Back (IWB)' },
  { pattern: 'inverted full-back', roleId: 'ifb', label: 'FM24 Inverted Full-Back → Inside Full-Back (IFB)' },
  { pattern: 'complete wing-back', roleId: 'awb', label: 'FM24 Complete Wing-Back → Advanced Wing-Back (AWB)' },
  { pattern: 'inverted winger', roleId: 'iw_ip', label: 'FM24 Inverted Winger → Inside Winger (IW)' },
  { pattern: 'wide playmaker', roleId: 'pw', label: 'FM24 Wide Playmaker → Playmaking Winger (PW)' },
  { pattern: 'mezzala', roleId: 'chm', label: 'FM24 Mezzala → Channel Midfielder (CHM)' },
  { pattern: 'carrilero', roleId: 'wcm', label: 'FM24 Carrilero → Wide Central Midfielder (WCM)' },
  { pattern: 'pressing forward', roleId: 'tcf', label: 'FM24 Pressing Forward → Tracking Centre Forward (TCF)' },
  { pattern: 'ball-winning midfielder', roleId: 'pdm', label: 'FM24 Ball-Winning Midfielder → Pressing DM (PDM)' },
  { pattern: 'trequartista', roleId: 'fr', label: 'FM24 Trequartista → Free Role (FR)' },
  { pattern: 'enganche', roleId: 'fr', label: 'FM24 Enganche → Free Role (FR)' },
  { pattern: 'libero', roleId: 'acb', label: 'FM24 Libero → Advanced Centre-Back (ACB)' },
  { pattern: 'regista', roleId: 'dlp', label: 'FM24 Regista → Deep-Lying Playmaker (DLP)' },
  { pattern: 'segundo volante', roleId: 'b2b', label: 'FM24 Segundo Volante → Box-To-Box Midfielder (BBM)' },
  { pattern: 'anchor', roleId: 'dm_ip', label: 'FM24 Anchor → Defensive Midfielder (DM)' },
  { pattern: 'advanced forward', roleId: 'chf', label: 'FM24 Advanced Forward → Channel Forward (CHF)' },
  { pattern: 'complete forward', roleId: 'cf_ip', label: 'FM24 Complete Forward → Centre Forward (CF)' },
  { pattern: 'wide centre-back', roleId: 'ocb', label: 'FM24 Wide Centre-Back → Overlapping Centre-Back (OCB)' },
];

function stripExt(name?: string): string {
  if (!name) return 'Imported Tactic';
  return name.replace(/\.(fmf|json)$/i, '').trim() || 'Imported Tactic';
}

function parseJsonTactic(text: string, fileName?: string): FmfImportResult {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') {
      return {
        ok: false,
        format: 'json',
        confidence: 'fallback',
        tacticName: stripExt(fileName),
        tactic: {},
        matched: [],
        warnings: [],
        error: 'JSON root must be an object.',
      };
    }

    const matched: string[] = [];
    const warnings: string[] = [];
    const tactic: Partial<TacticConfig> = {};

    if (raw.schema === 'tactical-bible-v1') {
      matched.push('Schema: tactical-bible-v1');
    } else {
      warnings.push('Missing "schema": "tactical-bible-v1"; imported matching fields defensively.');
    }

    const tacticName =
      typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : stripExt(fileName);
    tactic.name = tacticName;

    if (typeof raw.ipFormation === 'string' && FORMATION_BY_ID[raw.ipFormation]) {
      tactic.ipFormation = raw.ipFormation;
      matched.push(`IP Formation: ${raw.ipFormation}`);
    } else if (raw.ipFormation !== undefined) {
      warnings.push(`Unknown IP formation "${String(raw.ipFormation)}" ignored.`);
    }

    if (typeof raw.oopFormation === 'string' && FORMATION_BY_ID[raw.oopFormation]) {
      tactic.oopFormation = raw.oopFormation;
      matched.push(`OOP Formation: ${raw.oopFormation}`);
    } else if (raw.oopFormation !== undefined) {
      warnings.push(`Unknown OOP formation "${String(raw.oopFormation)}" ignored.`);
    }

    if (typeof raw.mentality === 'number' && raw.mentality >= 0 && raw.mentality <= 6) {
      tactic.mentality = Math.round(raw.mentality);
      matched.push(`Mentality: ${MENTALITIES[tactic.mentality].name}`);
    }

    if (raw.tis && typeof raw.tis === 'object') {
      const tis: Record<string, number> = { ...TI_DEFAULTS };
      let tiCount = 0;
      for (const [k, v] of Object.entries(raw.tis as Record<string, unknown>)) {
        const def = TI_BY_KEY[k as TIKey];
        if (def && typeof v === 'number' && v >= 0 && v < def.options.length) {
          tis[k] = Math.round(v);
          tiCount++;
        }
      }
      tactic.tis = tis;
      if (tiCount > 0) matched.push(`${tiCount} Team Instructions`);
    }

    if (raw.ipRoles && typeof raw.ipRoles === 'object') {
      const ipRoles: Record<string, string> = {};
      for (const [slot, rid] of Object.entries(raw.ipRoles as Record<string, unknown>)) {
        if (typeof rid === 'string' && ROLE_BY_ID[rid]?.phase === 'ip') {
          ipRoles[slot] = rid;
        }
      }
      tactic.ipRoles = ipRoles;
      if (Object.keys(ipRoles).length > 0) {
        matched.push(`${Object.keys(ipRoles).length} IP Roles`);
      }
    }

    if (raw.oopRoles && typeof raw.oopRoles === 'object') {
      const oopRoles: Record<string, string> = {};
      for (const [slot, rid] of Object.entries(raw.oopRoles as Record<string, unknown>)) {
        if (typeof rid === 'string' && ROLE_BY_ID[rid]?.phase === 'oop') {
          oopRoles[slot] = rid;
        }
      }
      tactic.oopRoles = oopRoles;
      if (Object.keys(oopRoles).length > 0) {
        matched.push(`${Object.keys(oopRoles).length} OOP Roles`);
      }
    }

    if (raw.pis && typeof raw.pis === 'object') {
      const pis: Record<string, PIKey[]> = {};
      let piTotal = 0;
      for (const [slot, list] of Object.entries(raw.pis as Record<string, unknown>)) {
        if (Array.isArray(list)) {
          const valid = list.filter(
            (k): k is PIKey => typeof k === 'string' && Boolean(PI_BY_KEY[k as PIKey]),
          );
          if (valid.length > 0) {
            pis[slot] = valid;
            piTotal += valid.length;
          }
        }
      }
      tactic.pis = pis;
      if (piTotal > 0) matched.push(`${piTotal} Player Instructions`);
    }

    const isExact = raw.schema === 'tactical-bible-v1' && warnings.length === 0;
    return {
      ok: matched.length > 0,
      format: 'json',
      confidence: isExact ? 'exact' : matched.length > 0 ? 'partial' : 'fallback',
      tacticName,
      tactic,
      matched,
      warnings,
      ...(matched.length === 0 ? { error: 'No recognizable tactical fields found in JSON.' } : {}),
    };
  } catch (err) {
    return {
      ok: false,
      format: 'json',
      confidence: 'fallback',
      tacticName: stripExt(fileName),
      tactic: {},
      matched: [],
      warnings: [],
      error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function tryDecompress(
  slice: Uint8Array,
  format: 'deflate' | 'deflate-raw',
): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream(format);
    const writer = ds.writable.getWriter();
    const copy = new Uint8Array(slice.byteLength);
    copy.set(slice);
    // Write & close without throwing unhandled rejections if trailing garbage exists
    const writePromise = writer.write(copy).then(() => writer.close()).catch(() => undefined);
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    const MAX_DECOMPRESSED = 4 * 1024 * 1024; // 4 MB safety cap
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
          if (total > MAX_DECOMPRESSED) {
            await reader.cancel();
            break;
          }
        }
      }
    } catch {
      // Partial chunk recovery if stream had trailing FM metadata bytes
    }
    await writePromise;
    if (total === 0) return null;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.byteLength;
    }
    return out;
  } catch {
    return null;
  }
}

function findZlibOffsets(bytes: Uint8Array): number[] {
  const offsets: number[] = [];
  const limit = Math.min(bytes.length - 2, 16384);
  for (let i = 0; i < limit; i++) {
    if (bytes[i] === 0x78) {
      const flg = bytes[i + 1];
      if (flg === 0x01 || flg === 0x5e || flg === 0x9c || flg === 0xda) {
        offsets.push(i);
        if (offsets.length >= 6) break;
      }
    }
  }
  return offsets;
}

function extractReadableText(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const utf16 =
    bytes.byteLength >= 4
      ? new TextDecoder('utf-16le', { fatal: false }).decode(
          bytes.byteLength % 2 === 0 ? bytes : bytes.subarray(0, bytes.byteLength - 1),
        )
      : '';
  // Normalize null bytes & control chars into spaces for clean token matching
  const cleanUtf8 = utf8.replace(/[\x00-\x1f\x7f]+/g, ' ');
  const cleanUtf16 = utf16.replace(/[\x00-\x1f\x7f]+/g, ' ');
  return `${cleanUtf8} ${cleanUtf16}`;
}

function assignRoleToAvailableSlot(
  formationId: string,
  roleId: string,
  targetMap: Record<string, string>,
): string | null {
  const role = ROLE_BY_ID[roleId];
  if (!role) return null;
  const form = getFormation(formationId);
  const slotCodes = form.slots.map((s) => s.code);
  for (const s of form.slots) {
    if (targetMap[s.code]) continue;
    const allowed = rolesForSlot(s.code, slotCodes, role.phase);
    if (allowed.some((r) => r.id === roleId)) {
      targetMap[s.code] = roleId;
      return s.code;
    }
  }
  return null;
}

export async function parseTacticFile(
  bytes: Uint8Array,
  fileName?: string,
): Promise<FmfImportResult> {
  const fallbackName = stripExt(fileName);
  if (!bytes || bytes.byteLength === 0) {
    return {
      ok: false,
      format: 'unknown',
      confidence: 'fallback',
      tacticName: fallbackName,
      tactic: {},
      matched: [],
      warnings: [],
      error: 'File is empty.',
    };
  }

  // Path A: JSON (`tactical-bible-v1`)
  const headText = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.byteLength, 64)))
    .trimStart();
  if (headText.startsWith('{') || fileName?.toLowerCase().endsWith('.json')) {
    const fullText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return parseJsonTactic(fullText, fileName);
  }

  // Path B: FM `.fmf` binary
  const asciiHeader = new TextDecoder('ascii', { fatal: false }).decode(
    bytes.subarray(0, Math.min(bytes.byteLength, 32)),
  );
  const hasFmfSignature =
    asciiHeader.toLowerCase().includes('fmf') || Boolean(fileName?.toLowerCase().endsWith('.fmf'));

  const zlibOffsets = findZlibOffsets(bytes);
  let decompressed: Uint8Array | null = null;
  for (const off of zlibOffsets) {
    const attempt = await tryDecompress(bytes.subarray(off), 'deflate');
    if (attempt && attempt.byteLength > 0) {
      decompressed = attempt;
      break;
    }
  }
  if (!decompressed && bytes.byteLength > 4) {
    decompressed = await tryDecompress(bytes, 'deflate-raw');
  }

  const corpusRaw = decompressed
    ? `${extractReadableText(decompressed)} ${extractReadableText(bytes)}`
    : extractReadableText(bytes);
  const corpusLower = corpusRaw.toLowerCase();

  const matched: string[] = [];
  const warnings: string[] = [];
  const tactic: Partial<TacticConfig> = {
    name: fallbackName,
  };

  if (decompressed) {
    matched.push(`Decompressed .fmf payload (${decompressed.byteLength} bytes)`);
  } else if (hasFmfSignature) {
    warnings.push('No zlib stream decompressed; scanned raw UTF-8/UTF-16LE bytes instead.');
  }

  // 1. Match formations (longest exact names first, then shortNames like 4-2-3-1 / 4-3-3)
  const foundFormations: string[] = [];
  const sortedForms = [...FORMATIONS].sort((a, b) => b.id.length - a.id.length);
  for (const form of sortedForms) {
    if (corpusLower.includes(form.id.toLowerCase())) {
      if (!foundFormations.includes(form.id)) foundFormations.push(form.id);
    }
  }
  if (foundFormations.length === 0) {
    for (const form of sortedForms) {
      if (corpusLower.includes(form.shortName.toLowerCase())) {
        if (!foundFormations.includes(form.id)) foundFormations.push(form.id);
      }
    }
  }

  if (foundFormations.length >= 1) {
    tactic.ipFormation = foundFormations[0];
    tactic.oopFormation = foundFormations[1] ?? foundFormations[0];
    matched.push(`IP Formation: ${tactic.ipFormation}`);
    if (foundFormations.length >= 2) {
      matched.push(`OOP Formation: ${tactic.oopFormation}`);
    }
  }

  const resolvedIpForm = tactic.ipFormation ?? '4-3-3 DM Wide';
  const resolvedOopForm = tactic.oopFormation ?? resolvedIpForm;

  // 2. Match mentality (longest names first so "Very Attacking" beats "Attacking")
  const sortedMentalities = [...MENTALITIES].sort((a, b) => b.name.length - a.name.length);
  for (const m of sortedMentalities) {
    if (m.name !== 'Balanced' && corpusLower.includes(m.name.toLowerCase())) {
      tactic.mentality = m.index;
      matched.push(`Mentality: ${m.name}`);
      break;
    }
  }

  // 3. Match distinctive Team Instruction options (skip generic single words like "Balanced"/"More"/"Less")
  const GENERIC_TI_OPTS = new Set([
    'balanced',
    'mixed',
    'more',
    'less',
    'left',
    'right',
    'centre',
    'higher',
    'lower',
    'shorter',
    'wider',
    'narrower',
    'allow',
    'press',
    'inside',
    'outside',
    'encourage',
    'discourage',
    'short',
    'long',
    'standard',
  ]);
  const tis: Record<string, number> = { ...TI_DEFAULTS };
  let tiMatchedCount = 0;
  for (const ti of TEAM_INSTRUCTIONS) {
    for (let i = 0; i < ti.options.length; i++) {
      const opt = ti.options[i];
      const low = opt.toLowerCase();
      if (GENERIC_TI_OPTS.has(low)) continue;
      if (corpusLower.includes(low)) {
        tis[ti.key] = i;
        tiMatchedCount++;
        matched.push(`TI: ${ti.name} → ${opt}`);
        break;
      }
    }
  }
  if (tiMatchedCount > 0) {
    tactic.tis = tis;
  }

  // 4. Match FM26/FM27 roles (longest names first) + FM24 legacy roles
  const ipRoles: Record<string, string> = {};
  const oopRoles: Record<string, string> = {};
  const matchedRoleIds = new Set<string>();

  const sortedRoles = [...ROLES].sort((a, b) => b.name.length - a.name.length);
  for (const role of sortedRoles) {
    // Skip ultra-generic base names unless explicitly paired, prioritize distinct role names
    if (role.name.length < 7) continue;
    if (corpusLower.includes(role.name.toLowerCase())) {
      if (matchedRoleIds.has(role.id)) continue;
      const targetForm = role.phase === 'ip' ? resolvedIpForm : resolvedOopForm;
      const targetMap = role.phase === 'ip' ? ipRoles : oopRoles;
      const slot = assignRoleToAvailableSlot(targetForm, role.id, targetMap);
      if (slot) {
        matchedRoleIds.add(role.id);
        matched.push(`Role (${role.phase.toUpperCase()}): ${slot} → ${role.name}`);
      }
    }
  }

  for (const legacy of FM24_LEGACY_ROLE_MAP) {
    if (corpusLower.includes(legacy.pattern) && !matchedRoleIds.has(legacy.roleId)) {
      const role = ROLE_BY_ID[legacy.roleId];
      if (!role) continue;
      const targetForm = role.phase === 'ip' ? resolvedIpForm : resolvedOopForm;
      const targetMap = role.phase === 'ip' ? ipRoles : oopRoles;
      const slot = assignRoleToAvailableSlot(targetForm, role.id, targetMap);
      if (slot) {
        matchedRoleIds.add(role.id);
        matched.push(`Legacy Role mapped: ${slot} → ${role.name}`);
        warnings.push(legacy.label);
      }
    }
  }

  if (Object.keys(ipRoles).length > 0) {
    const fullIp: Record<string, string> = {};
    for (const s of getFormation(resolvedIpForm).slots) {
      fullIp[s.code] = ipRoles[s.code] ?? s.defaultIpRole;
    }
    tactic.ipRoles = fullIp;
  }
  if (Object.keys(oopRoles).length > 0) {
    const fullOop: Record<string, string> = {};
    for (const s of getFormation(resolvedOopForm).slots) {
      fullOop[s.code] = oopRoles[s.code] ?? s.defaultOopRole;
    }
    tactic.oopRoles = fullOop;
  }

  // 5. Match distinctive Player Instructions
  const detectedPis: PIKey[] = [];
  for (const pi of PLAYER_INSTRUCTIONS) {
    if (corpusLower.includes(pi.name.toLowerCase())) {
      detectedPis.push(pi.key);
      matched.push(`PI detected: ${pi.name}`);
    }
  }
  if (detectedPis.length > 0) {
    // Attach detected PIs cleanly to the first compatible slot in IP formation
    const pis: Record<string, PIKey[]> = {};
    const form = getFormation(resolvedIpForm);
    for (const piKey of detectedPis) {
      const def = PI_BY_KEY[piKey];
      const slot = form.slots.find((s) => def.allowedGroups.includes(s.group));
      if (slot) {
        const list = pis[slot.code] ?? [];
        const conflicts = list.some((existing) => def.incompatibleWith.includes(existing));
        if (!conflicts) {
          pis[slot.code] = [...list, piKey];
        }
      }
    }
    if (Object.keys(pis).length > 0) {
      tactic.pis = pis;
    }
  }

  const substantiveMatches = matched.filter((m) => !m.startsWith('Decompressed'));
  if (!hasFmfSignature && !decompressed && substantiveMatches.length === 0) {
    return {
      ok: false,
      format: 'unknown',
      confidence: 'fallback',
      tacticName: fallbackName,
      tactic: {},
      matched: [],
      warnings: ['Unrecognized binary file: no JSON, .fmf header, or zlib stream detected.'],
      error: 'Could not recognize file format. Upload a Tactical Bible .json or Football Manager .fmf file.',
    };
  }

  warnings.push(
    'FM .fmf files use an undocumented binary schema; review imported formations, roles, and instructions before saving.',
  );

  return {
    ok: true,
    format: 'fmf',
    confidence: substantiveMatches.length >= 2 ? 'partial' : 'fallback',
    tacticName: fallbackName,
    tactic,
    matched,
    warnings,
  };
}
