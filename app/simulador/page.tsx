"use client";

import { useEffect, useMemo, useState } from "react";
import zonesData from "@/public/eldoria_zones.json";
import Link from "next/link";

interface Monster {
  id: number;
  code: string;
  name: string;
  name_en?: string | null;
  level: number;
  stamina_cost: number;
  hp_max: number;
  attack: number;
  defense: number;
  dodge: number;
  accuracy: number;
  spell_resist: number;
  debuff_resist: number;
  xp_reward: number;
  gold_min: number;
  gold_max: number;
  is_boss: number;
  dmg_type?: string;
}

interface Zone {
  id: number;
  code: string;
  name: string;
  type: string;
  min_level: number;
  max_level: number;
  danger: number;
  monsters: Monster[];
}

interface PlayerStats {
  level: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  attack: number;
  defense: number;
  intelligence: number;
  magicDef: number;
  crit: number;
  dodge: number;
  accuracy: number;
}

interface Skill {
  id: number;
  code: string;
  name: string;
  mpCost: number;
  cooldownTurns: number;
  damageFormula?: string;
  effects: Record<string, any>;
  type: "damage" | "heal" | "lifesteal" | "stun" | "summon" | "rebirth" | "passive";
  level: number;
}

const TURN_SECONDS = 3;
const API_BASE = "https://eldoriaworld.com/api";
const TOKEN_KEY = "eldoria_sim_token";

const DEFAULT_SKILLS: Skill[] = [
  { id: 7, code: "mage_bolt", name: "Rayo Arcano", mpCost: 10, cooldownTurns: 1, damageFormula: "int * 4.2", effects: {}, type: "damage", level: 1 },
  { id: 8, code: "mage_fireball", name: "Bola de Fuego", mpCost: 25, cooldownTurns: 2, damageFormula: "int * 6.5", effects: {}, type: "damage", level: 1 },
  { id: 9, code: "mage_frost", name: "Nova Helada", mpCost: 30, cooldownTurns: 4, damageFormula: "int * 5.0", effects: { stunTurns: 2 }, type: "stun", level: 1 },
  { id: 29, code: "special_undead", name: "Toque del Inframundo", mpCost: 25, cooldownTurns: 12, damageFormula: "int * 5.5", effects: { lifesteal: 3.0 }, type: "lifesteal", level: 1 },
  { id: 39, code: "dark_black_verdict", name: "Sentencia Negra", mpCost: 32, cooldownTurns: 7, damageFormula: "int * 5.5", effects: { armorPierce: 40 }, type: "damage", level: 1 },
  { id: 10, code: "mage_heal", name: "Sanación", mpCost: 20, cooldownTurns: 5, damageFormula: "int * 4.5", effects: {}, type: "heal", level: 1 },
  { id: 22, code: "common_first_aid", name: "Primeros Auxilios", mpCost: 0, cooldownTurns: 13, damageFormula: "hp_max * 0.2", effects: { bonusAction: true }, type: "heal", level: 3 },
];

const PLAYER_DEFAULT: PlayerStats = {
  level: 21,
  hp: 740,
  hpMax: 740,
  mp: 389,
  mpMax: 389,
  attack: 67,
  defense: 43,
  intelligence: 53,
  magicDef: 47,
  crit: 4.5,
  dodge: 4.5,
  accuracy: 3.2,
};

function safeParse<T>(val: unknown, fallback: T): T {
  if (val === undefined || val === null) return fallback;
  return val as T;
}

function getNested(obj: any, path: string, fallback: any = undefined) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : fallback), obj);
}

function parseEffects(effects: any): Record<string, any> {
  if (!effects) return {};
  if (typeof effects === "string") {
    try {
      return JSON.parse(effects);
    } catch {
      return {};
    }
  }
  return effects;
}

function detectSkillType(effects: Record<string, any>, code: string, description: string): Skill["type"] {
  if (code === "common_first_aid") return "heal";
  if (code === "special_undead") return "lifesteal";
  if (code === "special_undead_v2" || effects?.rebirth) return "rebirth";
  if (effects?.summon || code.includes("summon")) return "summon";
  if (effects?.type === "heal" || code.includes("heal") || description?.toLowerCase().includes("cura") || description?.toLowerCase().includes("restores hp")) return "heal";
  if (effects?.stun || effects?.freeze || description?.toLowerCase().includes("congela") || description?.toLowerCase().includes("freezes")) return "stun";
  if (effects?.lifesteal) return "lifesteal";
  return "damage";
}

function secondsToTurns(seconds: number): number {
  return Math.max(1, Math.round(seconds / TURN_SECONDS));
}

function importCharacterData(raw: string): { player: PlayerStats; skills: Skill[]; loadout: number[] } | { error: string } {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "JSON inválido" };
  }

  // Accept either combined dump or single character/me response
  const charObj = data.character?.character || data.character || data;
  const derived = charObj.derived || {};

  const player: PlayerStats = {
    level: safeParse(charObj.level, 1),
    hp: safeParse(charObj.hp, safeParse(derived.hpMax, 100)),
    hpMax: safeParse(derived.hpMax, safeParse(charObj.hp_max, 100)),
    mp: safeParse(charObj.mp, safeParse(derived.mpMax, 100)),
    mpMax: safeParse(derived.mpMax, safeParse(charObj.mp_max, 100)),
    attack: safeParse(derived.attack, safeParse(charObj.attack, 10)),
    defense: safeParse(derived.defense, safeParse(charObj.defense, 10)),
    intelligence: safeParse(derived.int, safeParse(charObj.intelligence, 10)),
    magicDef: safeParse(derived.magic_def, safeParse(charObj.magic_def, 10)),
    crit: safeParse(derived.crit, safeParse(charObj.crit, 5)),
    dodge: safeParse(derived.dodge, safeParse(charObj.dodge, 5)),
    accuracy: safeParse(derived.accuracy, safeParse(charObj.accuracy, 0)),
  };

  // Build skill list from /skills/mine if present, otherwise use defaults
  const rawSkills = data.skills?.skills || data.skills || [];
  let skills: Skill[];
  if (Array.isArray(rawSkills) && rawSkills.length > 0) {
    skills = rawSkills
      .map((s: any) => {
        const effects = parseEffects(s.effects);
        const type = detectSkillType(effects, s.code, s.description || "");
        return {
          id: s.skill_id,
          code: s.code,
          name: s.name,
          mpCost: s.mp_cost ?? 0,
          cooldownTurns: secondsToTurns(s.cooldown_seconds ?? 0),
          damageFormula: s.damage_formula || undefined,
          effects,
          type,
          level: s.level || 1,
        };
      })
      .filter((s: Skill) => s.type !== "passive");
  } else {
    skills = DEFAULT_SKILLS;
  }

  // Loadout PvE
  let loadout: number[] = [];
  const loadoutRaw = data.loadout?.loadout || data.loadout;
  if (loadoutRaw?.pve) {
    loadout = loadoutRaw.pve.filter((id: any) => id !== null && id !== undefined);
  } else if (charObj.skill_loadout) {
    try {
      const parsed = JSON.parse(charObj.skill_loadout);
      loadout = (parsed.pve || []).filter((id: any) => id !== null && id !== undefined);
    } catch {
      loadout = [];
    }
  }
  if (loadout.length === 0) {
    loadout = skills.filter((s) => s.type !== "passive" && s.type !== "rebirth").map((s) => s.id);
  }

  return { player, skills, loadout };
}

async function apiGet(token: string, path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchCharacterData(token: string): Promise<{ player: PlayerStats; skills: Skill[]; loadout: number[] }> {
  const [characterData, skillsData, loadoutData] = await Promise.all([
    apiGet(token, "/character/me"),
    apiGet(token, "/skills/mine").catch(() => null),
    apiGet(token, "/skills/loadout").catch(() => null),
  ]);

  const combined = {
    character: characterData,
    skills: skillsData,
    loadout: loadoutData,
  };

  const imported = importCharacterData(JSON.stringify(combined));
  if ("error" in imported) {
    throw new Error(imported.error);
  }
  return imported;
}

function parseFormula(formula: string, player: PlayerStats): number {
  const expr = formula
    .replace(/int/gi, String(player.intelligence))
    .replace(/atk/gi, String(player.attack))
    .replace(/hp_max/gi, String(player.hpMax));
  try {
    // eslint-disable-next-line no-eval
    return eval(expr);
  } catch {
    return 0;
  }
}

function calculateHeal(skill: Skill, player: PlayerStats): number {
  if (!skill.damageFormula) {
    if (skill.code === "common_first_aid") {
      const pct = skill.level >= 3 ? 0.3 : skill.level === 2 ? 0.25 : 0.2;
      return Math.floor(player.hpMax * pct);
    }
    return 0;
  }
  return Math.floor(parseFormula(skill.damageFormula, player));
}

function calculateMagicDamage(skill: Skill, player: PlayerStats, monster: Monster): number {
  if (!skill.damageFormula) return 0;
  const base = parseFormula(skill.damageFormula, player);
  const resistFlat = monster.spell_resist * 4;
  if (skill.effects.armorPierce) {
    const ignored = resistFlat * (skill.effects.armorPierce / 100);
    return Math.max(1, Math.floor(base - (resistFlat - ignored)));
  }
  return Math.max(1, Math.floor(base - resistFlat));
}

function calculatePhysicalDamage(player: PlayerStats, monster: Monster): number {
  return Math.max(1, Math.floor(player.attack - monster.defense));
}

function calculateMonsterDamage(monster: Monster, player: PlayerStats): number {
  return Math.max(1, Math.floor(monster.attack - player.defense));
}

interface TurnLog {
  turn: number;
  action: string;
  damage?: number;
  heal?: number;
  playerHp: number;
  monsterHp: number;
  mp: number;
}

interface SimulationResult {
  victory: boolean;
  turns: number;
  finalPlayerHp: number;
  finalMonsterHp: number;
  logs: TurnLog[];
  reason: string;
}

function simulateCombat(player: PlayerStats, monster: Monster, skills: Skill[], loadout: number[]): SimulationResult {
  const logs: TurnLog[] = [];
  let playerHp = player.hp;
  let monsterHp = monster.hp_max;
  let mp = player.mp;
  const cooldowns: Record<number, number> = {};
  let monsterStunTurns = 0;
  let rebirthActive = false;
  let rebirthUsed = false;
  const maxTurns = 100;

  const availableSkills = skills.filter((s) => loadout.includes(s.id));
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const getSkill = (code: string) => availableSkills.find((s) => s.code === code);

  for (let turn = 1; turn <= maxTurns; turn++) {
    for (const id of Object.keys(cooldowns)) {
      cooldowns[Number(id)] = Math.max(0, cooldowns[Number(id)] - 1);
    }

    let playerAction = "";
    let damageDealt = 0;
    let healAmount = 0;
    const hpPct = playerHp / player.hpMax;

    const firstAid = getSkill("common_first_aid");
    const mageHeal = getSkill("mage_heal");
    const specialUndead = getSkill("special_undead");
    const rebirth = getSkill("special_undead_v2");

    // Pre-cast rebirth if available and not active
    if (rebirth && !rebirthActive && !rebirthUsed && (!cooldowns[rebirth.id] || cooldowns[rebirth.id] <= 0) && mp >= rebirth.mpCost) {
      rebirthActive = true;
      mp -= rebirth.mpCost;
      cooldowns[rebirth.id] = rebirth.cooldownTurns;
      logs.push({ turn, action: "Tú: Renacer Necrótico (buff)", playerHp, monsterHp, mp });
    }

    if (hpPct < 0.45 && firstAid && (!cooldowns[firstAid.id] || cooldowns[firstAid.id] <= 0) && mp >= firstAid.mpCost) {
      healAmount = calculateHeal(firstAid, player);
      playerHp = Math.min(player.hpMax, playerHp + healAmount);
      mp -= firstAid.mpCost;
      cooldowns[firstAid.id] = firstAid.cooldownTurns;
      playerAction = firstAid.name;
    } else if (hpPct < 0.5 && mageHeal && (!cooldowns[mageHeal.id] || cooldowns[mageHeal.id] <= 0) && mp >= mageHeal.mpCost) {
      healAmount = calculateHeal(mageHeal, player);
      playerHp = Math.min(player.hpMax, playerHp + healAmount);
      mp -= mageHeal.mpCost;
      cooldowns[mageHeal.id] = mageHeal.cooldownTurns;
      playerAction = mageHeal.name;
    } else if (hpPct < 0.65 && specialUndead && (!cooldowns[specialUndead.id] || cooldowns[specialUndead.id] <= 0) && mp >= specialUndead.mpCost) {
      damageDealt = calculateMagicDamage(specialUndead, player, monster);
      healAmount = Math.floor(damageDealt * (specialUndead.effects.lifesteal || 1));
      monsterHp -= damageDealt;
      playerHp = Math.min(player.hpMax, playerHp + healAmount);
      mp -= specialUndead.mpCost;
      cooldowns[specialUndead.id] = specialUndead.cooldownTurns;
      playerAction = specialUndead.name;
    } else {
      const priority = ["dark_black_verdict", "mage_fireball", "mage_frost", "mage_bolt"];
      let chosen: Skill | null = null;
      for (const code of priority) {
        const skill = getSkill(code);
        if (skill && (!cooldowns[skill.id] || cooldowns[skill.id] <= 0) && mp >= skill.mpCost) {
          chosen = skill;
          break;
        }
      }

      if (chosen) {
        if (chosen.type === "heal") {
          healAmount = calculateHeal(chosen, player);
          playerHp = Math.min(player.hpMax, playerHp + healAmount);
        } else if (chosen.type === "stun") {
          damageDealt = calculateMagicDamage(chosen, player, monster);
          monsterHp -= damageDealt;
          monsterStunTurns = Math.max(monsterStunTurns, chosen.effects.stunTurns || 0);
        } else if (chosen.type === "lifesteal") {
          damageDealt = calculateMagicDamage(chosen, player, monster);
          healAmount = Math.floor(damageDealt * (chosen.effects.lifesteal || 1));
          monsterHp -= damageDealt;
          playerHp = Math.min(player.hpMax, playerHp + healAmount);
        } else {
          damageDealt = calculateMagicDamage(chosen, player, monster);
          monsterHp -= damageDealt;
        }
        mp -= chosen.mpCost;
        cooldowns[chosen.id] = chosen.cooldownTurns;
        playerAction = chosen.name;
      } else {
        damageDealt = calculatePhysicalDamage(player, monster);
        monsterHp -= damageDealt;
        playerAction = "Ataque básico";
      }
    }

    logs.push({
      turn,
      action: `Tú: ${playerAction}`,
      damage: damageDealt > 0 ? damageDealt : undefined,
      heal: healAmount > 0 ? healAmount : undefined,
      playerHp,
      monsterHp: Math.max(0, monsterHp),
      mp,
    });

    if (monsterHp <= 0) {
      return { victory: true, turns: turn, finalPlayerHp: playerHp, finalMonsterHp: 0, logs, reason: "¡Victoria!" };
    }

    // Monster turn
    if (monsterStunTurns > 0) {
      monsterStunTurns--;
      logs.push({ turn, action: "Monstruo: Aturdido", playerHp, monsterHp: Math.max(0, monsterHp), mp });
    } else {
      const dodgeChance = Math.max(0, monster.dodge - player.accuracy);
      const dodged = Math.random() * 100 < dodgeChance;
      if (dodged) {
        logs.push({ turn, action: "Monstruo: Esquivó", playerHp, monsterHp: Math.max(0, monsterHp), mp });
      } else {
        const monsterDmg = calculateMonsterDamage(monster, player);
        playerHp -= monsterDmg;
        logs.push({
          turn,
          action: "Monstruo: Atacó",
          damage: monsterDmg,
          playerHp: Math.max(0, playerHp),
          monsterHp: Math.max(0, monsterHp),
          mp,
        });

        if (playerHp <= 0) {
          if (rebirthActive && !rebirthUsed) {
            const rebirthSkill = skillById.get(loadout.find((id) => skillById.get(id)?.code === "special_undead_v2") || -1);
            const hpPct = rebirthSkill?.effects?.rebirth?.hp_pct || 20;
            playerHp = Math.floor(player.hpMax * (hpPct / 100));
            rebirthUsed = true;
            rebirthActive = false;
            logs.push({
              turn,
              action: "¡Renacer Necrótico activado!",
              heal: playerHp,
              playerHp,
              monsterHp: Math.max(0, monsterHp),
              mp,
            });
          } else {
            return { victory: false, turns: turn, finalPlayerHp: 0, finalMonsterHp: monsterHp, logs, reason: "Derrota" };
          }
        }
      }
    }
  }

  return { victory: false, turns: maxTurns, finalPlayerHp: playerHp, finalMonsterHp: monsterHp, logs, reason: "Límite de turnos alcanzado" };
}

export default function SimuladorPage() {
  const zones: Zone[] = zonesData.zones || [];
  const allMonsters = useMemo(() => {
    const list: (Monster & { zoneName: string; zoneId: number })[] = [];
    for (const z of zones) {
      for (const m of z.monsters) {
        list.push({ ...m, zoneName: z.name, zoneId: z.id });
      }
    }
    list.sort((a, b) => a.level - b.level || a.zoneId - b.zoneId);
    return list;
  }, [zones]);

  const [player, setPlayer] = useState<PlayerStats>(PLAYER_DEFAULT);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [loadout, setLoadout] = useState<number[]>(DEFAULT_SKILLS.map((s) => s.id));
  const [token, setToken] = useState<string>("");
  const [jsonText, setJsonText] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  const [loadingToken, setLoadingToken] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {
      // ignore
    }
  }, []);
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | "">("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simCount, setSimCount] = useState(10);
  const [aggregated, setAggregated] = useState<{ wins: number; avgTurns: number; avgHpLeft: number } | null>(null);

  const selectedMonster = useMemo(
    () => allMonsters.find((m) => m.id === Number(selectedMonsterId)),
    [allMonsters, selectedMonsterId]
  );

  const applyImported = (res: { player: PlayerStats; skills: Skill[]; loadout: number[] }) => {
    setPlayer(res.player);
    setSkills(res.skills);
    setLoadout(res.loadout);
  };

  const handleImport = () => {
    setImportError("");
    const res = importCharacterData(jsonText);
    if ("error" in res) {
      setImportError(res.error);
      return;
    }
    applyImported(res);
  };

  const handleTokenLoad = async () => {
    setImportError("");
    if (!token.trim()) {
      setImportError("Pega tu token Bearer primero");
      return;
    }
    setLoadingToken(true);
    try {
      const data = await fetchCharacterData(token.trim());
      applyImported(data);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(TOKEN_KEY, token.trim());
      }
    } catch (err: any) {
      setImportError(err.message || "Error cargando datos");
    } finally {
      setLoadingToken(false);
    }
  };

  const clearToken = () => {
    setToken("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  };

  const runSimulation = () => {
    if (!selectedMonster) return;
    setSimulating(true);
    setTimeout(() => {
      const res = simulateCombat(player, selectedMonster, skills, loadout);
      setResult(res);
      setSimulating(false);
    }, 100);
  };

  const runMonteCarlo = () => {
    if (!selectedMonster) return;
    setSimulating(true);
    setTimeout(() => {
      let wins = 0;
      let totalTurns = 0;
      let totalHpLeft = 0;
      let lastLog: SimulationResult | null = null;
      for (let i = 0; i < simCount; i++) {
        const res = simulateCombat(player, selectedMonster, skills, loadout);
        if (res.victory) wins++;
        totalTurns += res.turns;
        totalHpLeft += res.finalPlayerHp;
        lastLog = res;
      }
      setAggregated({ wins, avgTurns: totalTurns / simCount, avgHpLeft: totalHpLeft / simCount });
      setResult(lastLog);
      setSimulating(false);
    }, 100);
  };

  const updateStat = (key: keyof PlayerStats, value: string) => {
    setPlayer((p) => ({ ...p, [key]: value === "" ? 0 : Number(value) }));
  };

  const equippedNames = loadout
    .map((id) => skills.find((s) => s.id === id))
    .filter(Boolean) as Skill[];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent">
            ⚔️ Simulador de Combate
          </h1>
          <p className="text-slate-400 mt-1">Simula peleas con tus stats, skills y loadout reales</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">
            🗺️ Zonas
          </Link>
          <Link href="/loot" className="px-4 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 rounded-lg text-sm transition">
            🎒 Loot
          </Link>
          <Link href="/equipamiento" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition">
            ⚔️ Equipamiento
          </Link>
          <Link href="/cofres" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition">
            📦 Cofres
          </Link>
          <Link href="/oro" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition">
            💰 Oro
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: import + stats */}
        <div className="space-y-6">
          {/* Token Bearer import */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-3 text-slate-100">🔑 Cargar con Bearer</h2>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Pega tu token Bearer temporal. Se guarda solo en la memoria de esta pestaña{" "}
              <code className="bg-slate-800 px-1 rounded">sessionStorage</code> y las llamadas salen directamente desde tu navegador a{" "}
              <code className="bg-slate-800 px-1 rounded">eldoriaworld.com/api</code>. Solo lectura (GET).
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold-500 mb-3"
            />
            {importError && <p className="text-red-400 text-xs mb-2">{importError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleTokenLoad}
                disabled={loadingToken}
                className="flex-1 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition"
              >
                {loadingToken ? "Cargando..." : "Cargar mi personaje"}
              </button>
              <button
                onClick={clearToken}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
              >
                Borrar
              </button>
            </div>
            <details className="mt-3 text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-300">¿Dónde saco el token?</summary>
              <div className="mt-2 space-y-1 pl-2 border-l border-slate-700">
                <p>1. Entra a eldoriaworld.com en tu navegador y loguéate</p>
                <p>2. F12 → Network → busca cualquier llamada a /api</p>
                <p>3. En Headers busca Authorization: Bearer eyJ...</p>
                <p>4. Copia solo la parte después de Bearer</p>
              </div>
            </details>
          </div>

          {/* JSON fallback */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold mb-3 text-slate-100">📥 O importar JSON manual</h2>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Si prefieres no pegar el token, copia y pega las respuestas de los endpoints.
            </p>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{ "character": {...}, "skills": {...}, "loadout": {...} }`}
              className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-gold-500 mb-3"
            />
            <button
              onClick={handleImport}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition"
            >
              Importar JSON
            </button>
          </div>

          {/* Player stats panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4 text-slate-100">Tus stats</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "level", label: "Nivel" },
                { key: "hp", label: "HP actual" },
                { key: "hpMax", label: "HP máx" },
                { key: "mp", label: "MP actual" },
                { key: "mpMax", label: "MP máx" },
                { key: "attack", label: "ATK" },
                { key: "defense", label: "DEF" },
                { key: "intelligence", label: "INT" },
                { key: "magicDef", label: "DEF mágica" },
                { key: "crit", label: "Crítico %" },
                { key: "dodge", label: "Dodge %" },
                { key: "accuracy", label: "Accuracy" },
              ].map((s) => (
                <div key={s.key}>
                  <label className="block text-xs text-slate-500 mb-1">{s.label}</label>
                  <input
                    type="number"
                    value={player[s.key as keyof PlayerStats]}
                    onChange={(e) => updateStat(s.key as keyof PlayerStats, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setPlayer(PLAYER_DEFAULT);
                setSkills(DEFAULT_SKILLS);
                setLoadout(DEFAULT_SKILLS.map((s) => s.id));
                setJsonText("");
              }}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
            >
              Restaurar por defecto
            </button>
          </div>

          {/* Equipped skills */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold mb-3 text-slate-100">Skills en loadout PvE</h2>
            {equippedNames.length === 0 ? (
              <p className="text-sm text-slate-500">No hay skills importadas.</p>
            ) : (
              <ul className="space-y-2">
                {equippedNames.map((s) => (
                  <li key={s.id} className="text-sm flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2 border border-slate-800">
                    <span>{s.name}</span>
                    <span className="text-xs text-slate-500">
                      {s.type} · CD {s.cooldownTurns}t · {s.mpCost} MP
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel: monster + actions + results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4 text-slate-100">Seleccionar monstruo</h2>
            <select
              value={selectedMonsterId}
              onChange={(e) => {
                setSelectedMonsterId(e.target.value === "" ? "" : Number(e.target.value));
                setResult(null);
                setAggregated(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-gold-500"
            >
              <option value="">-- Elige un monstruo --</option>
              {allMonsters.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.level}] {m.name} — {m.zoneName} (stamina {m.stamina_cost}, HP {m.hp_max.toLocaleString()}, ATK {m.attack})
                </option>
              ))}
            </select>

            {selectedMonster && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">HP</span>
                  <span className="font-semibold text-slate-200">{selectedMonster.hp_max.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">ATK</span>
                  <span className="font-semibold text-slate-200">{selectedMonster.attack}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">DEF</span>
                  <span className="font-semibold text-slate-200">{selectedMonster.defense}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">Stamina</span>
                  <span className="font-semibold text-yellow-400">{selectedMonster.stamina_cost}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">XP</span>
                  <span className="font-semibold text-emerald-400">{selectedMonster.xp_reward.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">Gold</span>
                  <span className="font-semibold text-slate-200">{selectedMonster.gold_min}-{selectedMonster.gold_max}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">Dodge</span>
                  <span className="font-semibold text-slate-200">{selectedMonster.dodge}%</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block">Spell Resist</span>
                  <span className="font-semibold text-slate-200">{selectedMonster.spell_resist}</span>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={runSimulation}
                disabled={!selectedMonster || simulating}
                className="px-6 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg transition"
              >
                {simulating ? "Simulando..." : "Simular 1 combate"}
              </button>
              <button
                onClick={runMonteCarlo}
                disabled={!selectedMonster || simulating}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
              >
                Simular {simCount} combates
              </button>
              <input
                type="number"
                value={simCount}
                onChange={(e) => setSimCount(Number(e.target.value))}
                min={2}
                max={1000}
                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-slate-100">Resultado</h2>
                <span
                  className={`px-4 py-1 rounded-full text-sm font-bold ${
                    result.victory ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800" : "bg-red-900/50 text-red-400 border border-red-800"
                  }`}
                >
                  {result.victory ? "VICTORIA" : "DERROTA"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block text-xs">Turnos</span>
                  <span className="font-semibold text-lg">{result.turns}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block text-xs">Tu HP final</span>
                  <span className={`font-semibold text-lg ${result.finalPlayerHp > player.hpMax * 0.3 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.finalPlayerHp}/{player.hpMax}
                  </span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block text-xs">HP monstruo</span>
                  <span className="font-semibold text-lg text-slate-200">{Math.max(0, result.finalMonsterHp).toLocaleString()}</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <span className="text-slate-500 block text-xs">Motivo</span>
                  <span className="font-semibold text-sm text-slate-200">{result.reason}</span>
                </div>
              </div>

              {aggregated && (
                <div className="mb-4 p-4 bg-purple-900/20 border border-purple-800 rounded-xl">
                  <h3 className="text-sm font-bold text-purple-300 mb-2">Monte Carlo ({simCount} combates)</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 block">Victorias</span>
                      <span className="font-bold text-emerald-400">{aggregated.wins} / {simCount} ({((aggregated.wins / simCount) * 100).toFixed(0)}%)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Turnos promedio</span>
                      <span className="font-bold text-slate-200">{aggregated.avgTurns.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">HP restante promedio</span>
                      <span className="font-bold text-slate-200">{aggregated.avgHpLeft.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 sticky top-0">
                    <tr className="text-left text-slate-400">
                      <th className="py-2 px-3">Turno</th>
                      <th className="py-2 px-3">Acción</th>
                      <th className="py-2 px-3">Daño/Cura</th>
                      <th className="py-2 px-3">Tu HP</th>
                      <th className="py-2 px-3">HP Mob</th>
                      <th className="py-2 px-3">MP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.logs.map((log, idx) => (
                      <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-slate-500">{log.turn}</td>
                        <td className="py-1.5 px-3">{log.action}</td>
                        <td className="py-1.5 px-3">
                          {log.damage ? <span className="text-red-400">-{log.damage}</span> : null}
                          {log.heal ? <span className="text-emerald-400">+{log.heal}</span> : null}
                        </td>
                        <td className="py-1.5 px-3">{log.playerHp}</td>
                        <td className="py-1.5 px-3">{log.monsterHp.toLocaleString()}</td>
                        <td className="py-1.5 px-3 text-blue-400">{log.mp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
