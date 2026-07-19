"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import skillTreeData from "@/public/skill_tree_catalog.json";
import skillsData from "@/public/skills_catalog.json";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────

interface SkillTreeNode {
  code: string;
  branch: string;
  tier: number;
  col: number;
  name: string;
  name_en: string;
  icon: string;
  max_level: number;
  effect: { type: string; amount: number };
  prereq: any;
  desc: string;
  desc_en: string;
}

interface SkillCatalog {
  id: number;
  code: string;
  name: string;
  name_en: string;
  tree: string;
  type: "active" | "passive" | "ultimate";
  max_level: number;
  level_req: number;
  parent_skill_id: number | null;
  mp_cost: number;
  cooldown_seconds: number;
  damage_formula: string | null;
  effects: string;
  race_lock: string | null;
  description: string;
  description_en: string;
}

interface Branch {
  name: string;
  name_en: string;
  color: string;
  icon: string;
  min_level?: number;
  min_other_sp?: number;
}

const NODE_W = 120;
const NODE_H = 56;
const GAP_X = 16;
const GAP_Y = 20;

// ─── Stat Formulas (approximated from game data) ────────────────────────

function calcDerivedStats(
  str: number, agi: number, int_: number, vit: number, per: number, res: number,
  treeBonuses: Record<string, number>,
  skillPassives: Record<string, number>,
  race: string
) {
  const tAtk = treeBonuses.attack_flat || 0;
  const tHpPct = treeBonuses.hp_max_pct || 0;
  const tMpPct = treeBonuses.mp_max_pct || 0;

  const raceHp = race === "ogre" ? 105 : race === "human" ? 50 : race === "elf" ? 30 : race === "undead" ? 40 : race === "fae" ? 20 : race === "drakkar" ? 80 : 0;
  const raceAtk = race === "ogre" ? 5 : race === "drakkar" ? 8 : race === "human" ? 3 : 0;

  const baseHp = 80 + raceHp;
  const baseMp = 50;

  const hpMax = Math.floor((baseHp + vit * 15) * (1 + (tHpPct + (skillPassives.hp_pct || 0)) / 100));
  const mpMax = Math.floor((baseMp + int_ * 3) * (1 + tMpPct / 100));
  const stMax = 100 + Math.floor(vit * 0.5);

  const attack = Math.floor(str * 2.4 + raceAtk + tAtk);
  const defense = Math.floor(res * 2 + 10);
  const spellAttack = Math.floor(int_ * 2.5);
  const magicDef = Math.floor(res * 1.8 + 5);
  const crit = Math.round((agi * 0.15 + per * 0.1) * 10) / 10;
  const dodge = Math.round(agi * 0.2 * 10) / 10;
  const accuracy = Math.round((per * 0.3 + agi * 0.05) * 10) / 10;
  const speed = Math.floor(100 + str * 0.3 + agi * 0.5);
  const debuffResist = Math.floor(res * 0.5);

  return { hpMax, mpMax, stMax, attack, defense, spellAttack, magicDef, crit, dodge, accuracy, speed, debuffResist };
}

// ─── Prereq checking ────────────────────────────────────────────────────

function checkPrereq(
  prereq: any,
  allocs: Record<string, number>,
  branchNodes: SkillTreeNode[],
  totalBranchSP: Record<string, number>
): boolean {
  if (!prereq) return true;

  if (prereq.all && Array.isArray(prereq.all)) {
    return prereq.all.every((p: any) => {
      if (p.code) return (allocs[p.code] || 0) >= p.level;
      return false;
    });
  }

  if (prereq.count && prereq.branch && prereq.tier) {
    const count = branchNodes.filter(
      (n) => n.branch === prereq.branch && n.tier <= prereq.tier && (allocs[n.code] || 0) >= (prereq.level || 1)
    ).length;
    return count >= prereq.count;
  }

  if (prereq.code) {
    return (allocs[prereq.code] || 0) >= (prereq.level || 1);
  }

  return true;
}

function getSkillPassiveEffects(skill: SkillCatalog, level: number): Record<string, number> {
  if (level <= 0) return {};
  try {
    const effects = JSON.parse(skill.effects || "{}");
    const result: Record<string, number> = {};
    if (effects.stat && effects.percent) {
      result[effects.stat] = (effects.percent || 0) * level;
    }
    if (effects.stat && effects.flat) {
      result[effects.stat + "_flat"] = (effects.flat || 0) * level;
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function BuildPage() {
  const branches = skillTreeData.branches as Record<string, Branch>;
  const allNodes = skillTreeData.nodes as SkillTreeNode[];
  const allSkills = skillsData.skills as SkillCatalog[];

  const [level, setLevel] = useState(21);
  const [statPts, setStatPts] = useState(84);
  const [treePts, setTreePts] = useState(42);
  const [skillPts, setSkillPts] = useState(21);

  const [autoCalc, setAutoCalc] = useState(true);

  const [stats, setStats] = useState({ str: 7, agi: 5, int_: 5, vit: 9, per: 5, res: 5 });
  const [treeAllocs, setTreeAllocs] = useState<Record<string, number>>({});
  const [learnedSkills, setLearnedSkills] = useState<Record<string, number>>({});

  const [activeBranch, setActiveBranch] = useState("warrior");
  const [activeSkillTab, setActiveSkillTab] = useState("warrior");

  const treeRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ node: SkillTreeNode; x: number; y: number } | null>(null);

  const [race, setRace] = useState<string>("ogre");

  // Auto-calc points from level
  useEffect(() => {
    if (autoCalc) {
      setStatPts(level * 4);
      setTreePts(level * 2);
      setSkillPts(level);
    }
  }, [level, autoCalc]);

  // Calculate stat totals used
  const statPtsUsed = stats.str + stats.agi + stats.int_ + stats.vit + stats.per + stats.res - 36;
  const statPtsLeft = statPts - statPtsUsed;

  const treePtsUsed = useMemo(
    () => Object.values(treeAllocs).reduce((a, b) => a + b, 0),
    [treeAllocs]
  );
  const treePtsLeft = treePts - treePtsUsed;

  const skillPtsUsed = useMemo(
    () => Object.values(learnedSkills).reduce((a, b) => a + b, 0),
    [learnedSkills]
  );
  const skillPtsLeft = skillPts - skillPtsUsed;

  // Tree branch nodes
  const branchNodes = useMemo(
    () => allNodes.filter((n) => n.branch === activeBranch),
    [allNodes, activeBranch]
  );

  const maxTier = useMemo(() => Math.max(...branchNodes.map((n) => n.tier), 1), [branchNodes]);
  const maxCol = useMemo(() => Math.max(...branchNodes.map((n) => n.col), 0), [branchNodes]);

  // Skill tree bonuses
  const treeBonuses = useMemo(() => {
    const b: Record<string, number> = {};
    for (const node of allNodes) {
      const lvl = treeAllocs[node.code] || 0;
      if (lvl > 0) {
        const key = node.effect.type;
        b[key] = (b[key] || 0) + node.effect.amount * lvl;
      }
    }
    return b;
  }, [allNodes, treeAllocs]);

  // Skill passives
  const skillPassives = useMemo(() => {
    const p: Record<string, number> = {};
    for (const skill of allSkills) {
      const lvl = learnedSkills[skill.code] || 0;
      if (lvl > 0 && skill.type === "passive") {
        const eff = getSkillPassiveEffects(skill, lvl);
        for (const [k, v] of Object.entries(eff)) {
          p[k] = (p[k] || 0) + v;
        }
      }
    }
    return p;
  }, [allSkills, learnedSkills]);

  // Derived stats
  const derived = useMemo(
    () => calcDerivedStats(stats.str, stats.agi, stats.int_, stats.vit, stats.per, stats.res, treeBonuses, skillPassives, race),
    [stats, treeBonuses, skillPassives, race]
  );

  // ─── Stat distribution ──────────────────────────────────────────────

  const updateStat = useCallback(
    (key: keyof typeof stats, delta: number) => {
      setStats((prev) => {
        const newVal = prev[key] + delta;
        if (newVal < 1) return prev;
        const usedNow = Object.values(prev).reduce((a, b) => a + b, 0) - 36;
        if (delta > 0 && usedNow >= statPts) return prev;
        return { ...prev, [key]: newVal };
      });
    },
    [statPts]
  );

  const resetStats = useCallback(() => {
    setStats({ str: 7, agi: 5, int_: 5, vit: 9, per: 5, res: 5 });
  }, []);

  // ─── Skill tree allocation ──────────────────────────────────────────

  const allocTreeNode = useCallback(
    (node: SkillTreeNode) => {
      const cur = treeAllocs[node.code] || 0;
      if (cur >= node.max_level) return;
      if (!checkPrereq(node.prereq, treeAllocs, allNodes, {})) return;
      if (treePtsLeft <= 0) return;
      setTreeAllocs((prev) => ({ ...prev, [node.code]: cur + 1 }));
    },
    [treeAllocs, treePtsLeft, allNodes]
  );

  const deallocTreeNode = useCallback(
    (node: SkillTreeNode) => {
      const cur = treeAllocs[node.code] || 0;
      if (cur <= 0) return;
      // Check if any other node depends on this one at current level
      const dependents = allNodes.filter((n) => {
        if (!n.prereq) return false;
        if (n.prereq.code === node.code) return (treeAllocs[n.code] || 0) > 0;
        if (n.prereq.all && Array.isArray(n.prereq.all)) {
          return n.prereq.all.some((p: any) => p.code === node.code && (treeAllocs[n.code] || 0) > p.level);
        }
        return false;
      });
      if (dependents.length > 0) return;
      setTreeAllocs((prev) => {
        const next = { ...prev };
        if (cur <= 1) delete next[node.code];
        else next[node.code] = cur - 1;
        return next;
      });
    },
    [treeAllocs, allNodes]
  );

  const resetTree = useCallback(() => setTreeAllocs({}), []);

  // ─── Skill learning ─────────────────────────────────────────────────

  const learnSkill = useCallback(
    (skill: SkillCatalog) => {
      const cur = learnedSkills[skill.code] || 0;
      if (cur >= skill.max_level) return;
      if (skillPtsLeft <= 0) return;
      if (skill.race_lock && skill.race_lock !== race) return;
      setLearnedSkills((prev) => ({ ...prev, [skill.code]: cur + 1 }));
    },
    [learnedSkills, skillPtsLeft, race]
  );

  const unlearnSkill = useCallback(
    (skill: SkillCatalog) => {
      const cur = learnedSkills[skill.code] || 0;
      if (cur <= 0) return;
      setLearnedSkills((prev) => {
        const next = { ...prev };
        if (cur <= 1) delete next[skill.code];
        else next[skill.code] = cur - 1;
        return next;
      });
    },
    [learnedSkills]
  );

  const resetSkills = useCallback(() => setLearnedSkills({}), []);

  // ─── Skill tree SVG lines ──────────────────────────────────────────

  const svgLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = [];
    const colSpread = Math.max(maxCol + 1, 7);
    const cellW = NODE_W + GAP_X;
    const cellH = NODE_H + GAP_Y;

    for (const node of branchNodes) {
      if (!node.prereq) continue;
      const targets: string[] = [];

      if (node.prereq.code) targets.push(node.prereq.code);
      if (node.prereq.all && Array.isArray(node.prereq.all)) {
        for (const p of node.prereq.all) {
          if (p.code) targets.push(p.code);
        }
      }

      for (const preCode of targets) {
        const preNode = branchNodes.find((n) => n.code === preCode);
        if (!preNode) continue;

        const x1 = preNode.col * cellW + NODE_W / 2;
        const y1 = (preNode.tier - 1) * cellH + NODE_H / 2;
        const x2 = node.col * cellW + NODE_W / 2;
        const y2 = (node.tier - 1) * cellH + NODE_H / 2;

        const active = (treeAllocs[preCode] || 0) >= (node.prereq.level || 1);
        lines.push({ x1, y1, x2, y2, active });
      }
    }
    return lines;
  }, [branchNodes, treeAllocs, maxCol]);

  // ─── Tab definitions ────────────────────────────────────────────────

  const branchOrder = ["warrior", "vital", "adventurer", "mage", "hunter", "mystic", "pets", "mastery"];

  const skillTabs = useMemo(() => {
    const tabs: { key: string; label: string; skills: SkillCatalog[] }[] = [];

    const byTree: Record<string, SkillCatalog[]> = {};
    for (const s of allSkills) {
      if (!byTree[s.tree]) byTree[s.tree] = [];
      byTree[s.tree].push(s);
    }

    for (const [tree, skills] of Object.entries(byTree)) {
      const nonRace = skills.filter((s) => !s.race_lock);
      if (nonRace.length > 0) {
        tabs.push({ key: tree, label: branches[tree]?.name_en || tree, skills: nonRace });
      }

      const byRace: Record<string, SkillCatalog[]> = {};
      for (const s of skills) {
        if (s.race_lock) {
          if (!byRace[s.race_lock]) byRace[s.race_lock] = [];
          byRace[s.race_lock].push(s);
        }
      }
      for (const [r, rSkills] of Object.entries(byRace)) {
        tabs.push({ key: `${tree}_${r}`, label: `${branches[tree]?.name_en || tree} (${r})`, skills: rSkills });
      }
    }

    return tabs;
  }, [allSkills, branches]);

  // ─── Stat definition ────────────────────────────────────────────────

  const statDefs = [
    { key: "str" as const, label: "STR", color: "text-red-400", desc: "+2.4 ATK, +0.3 Speed" },
    { key: "agi" as const, label: "AGI", color: "text-emerald-400", desc: "+0.2% Dodge, +0.15% Crit, +0.5 Speed" },
    { key: "int_" as const, label: "INT", color: "text-blue-400", desc: "+2.5 Spell ATK, +3 MP" },
    { key: "vit" as const, label: "VIT", color: "text-yellow-400", desc: "+15 HP, +0.5 Stamina" },
    { key: "per" as const, label: "PER", color: "text-purple-400", desc: "+0.3 Accuracy, +0.1% Crit" },
    { key: "res" as const, label: "RES", color: "text-cyan-400", desc: "+2 DEF, +1.8 MDEF" },
  ];

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent">
              🛡️ Build Simulator
            </h1>
            <p className="text-slate-400 mt-1">Diseña tu build perfecto y mira cómo quedan tus stats</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg transition">
              🗺️ Zonas
            </Link>
            <Link href="/oro" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition">
              💰 Oro
            </Link>
            <Link href="/loot" className="px-4 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 font-semibold rounded-lg transition">
              🎒 Loot
            </Link>
            <Link href="/equipamiento" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition">
              ⚔️ Equipamiento
            </Link>
          </div>
        </div>
      </header>

      {/* Level & Points Panel */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Nivel del personaje</label>
            <input
              type="number"
              min={1}
              max={100}
              value={level}
              onChange={(e) => {
                const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                setLevel(v);
              }}
              className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-lg font-bold focus:outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Raza</label>
            <select
              value={race}
              onChange={(e) => setRace(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
            >
              <option value="ogre">Ogre</option>
              <option value="human">Human</option>
              <option value="elf">Elf</option>
              <option value="fae">Fae</option>
              <option value="drakkar">Drakkar</option>
              <option value="undead">Undead</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              id="autoCalc"
              checked={autoCalc}
              onChange={(e) => setAutoCalc(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="autoCalc" className="text-sm text-slate-400">Auto-calcular puntos</label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Stat Points</span>
              <span className={`text-sm font-bold ${statPtsLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {statPtsLeft} / {statPts}
              </span>
            </div>
            <input
              type="number"
              min={0}
              value={statPts}
              disabled={autoCalc}
              onChange={(e) => setStatPts(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold-500 disabled:opacity-50"
            />
          </div>
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Skill Tree Points</span>
              <span className={`text-sm font-bold ${treePtsLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {treePtsLeft} / {treePts}
              </span>
            </div>
            <input
              type="number"
              min={0}
              value={treePts}
              disabled={autoCalc}
              onChange={(e) => setTreePts(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold-500 disabled:opacity-50"
            />
          </div>
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Skill Points</span>
              <span className={`text-sm font-bold ${skillPtsLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {skillPtsLeft} / {skillPts}
              </span>
            </div>
            <input
              type="number"
              min={0}
              value={skillPts}
              disabled={autoCalc}
              onChange={(e) => setSkillPts(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold-500 disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      {/* Raw Stats */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">📊 Raw Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "ATK", value: derived.attack, color: "text-red-400", formula: "STR×2.4 + racial + tree" },
            { label: "DEF", value: derived.defense, color: "text-blue-400", formula: "RES×2 + 10" },
            { label: "HP", value: derived.hpMax, color: "text-emerald-400", formula: "(80+racial+VIT×15)×(1+tree%)" },
            { label: "MP", value: derived.mpMax, color: "text-blue-300", formula: "(50+INT×3)×(1+tree%)" },
            { label: "Stamina", value: derived.stMax, color: "text-yellow-400", formula: "100 + VIT×0.5" },
            { label: "Crit %", value: derived.crit, color: "text-orange-400", formula: "AGI×0.15 + PER×0.1" },
            { label: "Evasion %", value: derived.dodge, color: "text-purple-400", formula: "AGI×0.2" },
            { label: "Accuracy", value: derived.accuracy, color: "text-cyan-400", formula: "PER×0.3 + AGI×0.05" },
            { label: "Speed", value: derived.speed, color: "text-slate-300", formula: "100 + STR×0.3 + AGI×0.5" },
            { label: "Spell ATK", value: derived.spellAttack, color: "text-blue-400", formula: "INT×2.5" },
            { label: "MDEF", value: derived.magicDef, color: "text-cyan-300", formula: "RES×1.8 + 5" },
            { label: "Debuff Resist", value: derived.debuffResist, color: "text-slate-400", formula: "RES×0.5" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
              <div className={`text-xl font-black ${s.color}`}>{typeof s.value === "number" && s.value % 1 !== 0 ? s.value.toFixed(1) : s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</div>
              <div className="text-[9px] text-slate-600 mt-0.5">{s.formula}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Distribution */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">💪 Stats Distribution</h2>
          <div className="flex gap-2">
            <span className={`text-sm font-bold ${statPtsLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {statPtsLeft} pts left
            </span>
            <button onClick={resetStats} className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
              Reset
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {statDefs.map((sd) => (
            <div key={sd.key} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold ${sd.color}`}>{sd.label}</span>
                <span className="text-lg font-black text-slate-100">{stats[sd.key]}</span>
              </div>
              <div className="text-[10px] text-slate-500 mb-2">{sd.desc}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateStat(sd.key, -1)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-lg font-bold transition"
                >
                  -
                </button>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (stats[sd.key] / 100) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => updateStat(sd.key, 1)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-lg font-bold transition"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill Tree */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">🌳 Skill Tree</h2>
          <div className="flex gap-2 items-center">
            <span className={`text-sm font-bold ${treePtsLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {treePtsLeft} pts left
            </span>
            <button onClick={resetTree} className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
              Reset
            </button>
          </div>
        </div>

        {/* Branch tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          {branchOrder.map((b) => {
            const br = branches[b];
            if (!br) return null;
            const branchSP = allNodes.filter((n) => n.branch === b).reduce((acc, n) => acc + (treeAllocs[n.code] || 0), 0);
            return (
              <button
                key={b}
                onClick={() => setActiveBranch(b)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  activeBranch === b
                    ? "border-current shadow-lg"
                    : "bg-slate-900 border-slate-800 hover:border-slate-600"
                }`}
                style={activeBranch === b ? { color: br.color, borderColor: br.color, backgroundColor: `${br.color}20` } : {}}
              >
                {br.name_en}
                <span className="ml-1 opacity-60">{branchSP}</span>
              </button>
            );
          })}
        </div>

        {/* Tree visualization */}
        <div ref={treeRef} className="overflow-x-auto pb-4">
          <div
            className="relative"
            style={{
              width: (maxCol + 1) * (NODE_W + GAP_X) + GAP_X,
              height: maxTier * (NODE_H + GAP_Y) + GAP_Y,
            }}
          >
            {/* SVG lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
            >
              {svgLines.map((line, i) => (
                <line
                  key={i}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.active ? "#facc15" : "#334155"}
                  strokeWidth={line.active ? 2 : 1}
                  strokeDasharray={line.active ? "none" : "4 4"}
                />
              ))}
            </svg>

            {/* Nodes */}
            {branchNodes.map((node) => {
              const lvl = treeAllocs[node.code] || 0;
              const full = lvl >= node.max_level;
              const canAlloc = checkPrereq(node.prereq, treeAllocs, allNodes, {}) && !full && treePtsLeft > 0;
              const canDealloc = lvl > 0;

              const x = node.col * (NODE_W + GAP_X) + GAP_X;
              const y = (node.tier - 1) * (NODE_H + GAP_Y) + GAP_Y;

              const br = branches[node.branch];
              const borderColor = full ? "#facc15" : lvl > 0 ? br?.color || "#64748b" : "#334155";
              const bgColor = full ? "#facc1520" : lvl > 0 ? `${br?.color || "#64748b"}15` : "#0f172a";

              return (
                <div
                  key={node.code}
                  className="absolute rounded-lg border-2 transition-all cursor-pointer hover:scale-105"
                  style={{
                    left: x,
                    top: y,
                    width: NODE_W,
                    height: NODE_H,
                    borderColor,
                    backgroundColor: bgColor,
                  }}
                  onClick={() => allocTreeNode(node)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    deallocTreeNode(node);
                  }}
                  onMouseEnter={(e) => setTooltip({ node, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div className="flex items-center gap-1.5 px-2 py-1 h-full">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs shrink-0">
                      {lvl > 0 ? (
                        <span className="text-gold-400 font-bold">{lvl}</span>
                      ) : (
                        <span className="text-slate-600">{node.max_level}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-slate-200 truncate leading-tight">
                        {node.name_en}
                      </div>
                      <div className="text-[8px] text-slate-500 truncate">
                        +{node.effect.amount * node.max_level} {node.effect.type.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-slate-600 mt-2">Click = asignar punto · Click derecho = quitar punto</p>
      </section>

      {/* Skills */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">⚔️ Skills</h2>
          <div className="flex gap-2 items-center">
            <span className={`text-sm font-bold ${skillPtsLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {skillPtsLeft} pts left
            </span>
            <button onClick={resetSkills} className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
              Reset
            </button>
          </div>
        </div>

        {/* Skill tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          {skillTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSkillTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                activeSkillTab === tab.key
                  ? "bg-gold-600/20 border-gold-500 text-gold-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Skill list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {skillTabs
            .find((t) => t.key === activeSkillTab)
            ?.skills.map((skill) => {
              const lvl = learnedSkills[skill.code] || 0;
              const full = lvl >= skill.max_level;
              const locked = skill.race_lock && skill.race_lock !== race;
              const noPts = skillPtsLeft <= 0 && lvl === 0;

              return (
                <div
                  key={skill.id}
                  className={`bg-slate-950/50 border rounded-xl p-3 transition ${
                    locked ? "border-slate-800 opacity-40" : full ? "border-gold-500/50" : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-semibold text-sm text-slate-100">{skill.name}</div>
                      <div className="text-[10px] text-slate-500">{skill.name_en}</div>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${
                        skill.type === "ultimate"
                          ? "bg-orange-900/30 text-orange-300 border-orange-800"
                          : skill.type === "passive"
                          ? "bg-cyan-900/30 text-cyan-300 border-cyan-800"
                          : "bg-blue-900/30 text-blue-300 border-blue-800"
                      }`}
                    >
                      {skill.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2 line-clamp-2">{skill.description}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 mb-2">
                    {skill.mp_cost > 0 && <span>MP: {skill.mp_cost}</span>}
                    {skill.cooldown_seconds > 0 && <span>CD: {skill.cooldown_seconds}s</span>}
                    {skill.level_req > 1 && <span>Req: lvl {skill.level_req}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: skill.max_level }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-sm ${i < lvl ? "bg-gold-500" : "bg-slate-800"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {lvl}/{skill.max_level}
                    </span>
                    <button
                      onClick={() => learnSkill(skill)}
                      disabled={locked || full || noPts}
                      className="text-[10px] px-2 py-0.5 bg-gold-600 hover:bg-gold-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold rounded transition"
                    >
                      {full ? "MAX" : lvl > 0 ? "+" : "Learn"}
                    </button>
                    {lvl > 0 && (
                      <button
                        onClick={() => unlearnSkill(skill)}
                        className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                      >
                        -
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[60] bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl pointer-events-none w-56"
          style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
        >
          <p className="text-xs font-bold text-slate-200 mb-1">{tooltip.node.name}</p>
          <p className="text-[10px] text-slate-400 mb-1">{tooltip.node.name_en}</p>
          <p className="text-[10px] text-gold-400">
            +{tooltip.node.effect.amount} {tooltip.node.effect.type.replace(/_/g, " ")} / nivel
          </p>
          <p className="text-[10px] text-slate-500">
            Max: {tooltip.node.max_level} · Tier {tooltip.node.tier}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {tooltip.node.desc_en?.replace(/\{n\}/g, String(tooltip.node.effect.amount * tooltip.node.max_level))}
          </p>
        </div>
      )}
    </main>
  );
}
