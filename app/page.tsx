"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import zonesData from "@/public/eldoria_zones_with_loot.json";
import Link from "next/link";

interface DropItem {
  item: string;
  qty: number;
  chance: number;
  name: string;
  name_en?: string | null;
  rarity: string;
  item_type: string;
}

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
  gems_min?: number;
  gems_max?: number;
  is_boss: number;
  dmg_type?: string;
  dot_chance?: number;
  dot_dpt?: number;
  dot_turns?: number;
  dot_type?: string | null;
  guaranteed_drops: DropItem[];
  chance_drops: DropItem[];
  unique_drop_chance?: number | null;
  unique_common_drop_chance?: number | null;
  unique_common_max_per_player?: number | null;
  unique_uncommon_drop_chance?: number | null;
  unique_uncommon_max_per_player?: number | null;
  unique_rare_drop_chance?: number | null;
  unique_rare_max_per_player?: number | null;
  unique_epic_drop_chance?: number | null;
  unique_epic_max_per_player?: number | null;
  attribute_point_chance?: number | null;
  attribute_point_max_per_player?: number | null;
  attribute_point_qty?: number;
  skill_tree_point_chance?: number | null;
  skill_tree_point_max_per_player?: number | null;
  skill_tree_point_qty?: number;
  respawn_seconds?: number;
  boss_kills_limit?: number | null;
}

interface Zone {
  id: number;
  code: string;
  name: string;
  name_en?: string | null;
  type: string;
  description?: string | null;
  min_level: number;
  max_level: number;
  danger: number;
  pvp_enabled: number;
  hp_regen_bonus_pct: number;
  mp_regen_bonus_pct: number;
  stamina_regen_bonus_pct: number;
  gold_loss_on_death?: string;
  item_loss_chance?: string;
  loot_rarity?: string | null;
  monsters: Monster[];
}

const TYPE_LABELS: Record<string, string> = {
  city: "Ciudades",
  farm: "Farm",
  loot: "Loot",
  wild: "Salvaje",
  pvp: "PvP",
  event: "Eventos",
};

const TYPE_ICONS: Record<string, string> = {
  city: "🏰",
  farm: "🌾",
  loot: "💎",
  wild: "🌿",
  pvp: "⚔️",
  event: "🎉",
};

const TYPE_ORDER = ["city", "farm", "loot", "wild", "pvp", "event"];

const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  mythic: "text-orange-400",
  legendary: "text-yellow-400",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-slate-800/60 border-slate-700",
  uncommon: "bg-emerald-900/40 border-emerald-700",
  rare: "bg-blue-900/40 border-blue-700",
  epic: "bg-purple-900/40 border-purple-700",
  mythic: "bg-orange-900/40 border-orange-700",
  legendary: "bg-yellow-900/40 border-yellow-700",
};

const RARITY_HEX: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#34d399",
  rare: "#60a5fa",
  epic: "#c084fc",
  mythic: "#fb923c",
  legendary: "#facc15",
};

function StatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SkillIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11C12 11 8 8 5 9c0 0 1-4 4-3 0 0-1-4 3-5 0 0 0 4-3 5 3-1 6 1 6 1s2 3-2 5c0 0 2 2 3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 21h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SwordIcon({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14.5 3.5L20.5 9.5L10 20L4 14L14.5 3.5Z" stroke={color || "currentColor"} strokeWidth="2" strokeLinejoin="round" />
      <path d="M14.5 3.5L20.5 9.5" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14L7.5 17.5" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 20L7.5 17.5" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const [zones] = useState<Zone[]>(zonesData.zones || []);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(TYPE_ORDER));
  const [sortBy, setSortBy] = useState<"level" | "name">("level");
  const [hoveredMonster, setHoveredMonster] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [efficiency, setEfficiency] = useState<0 | 1 | 2>(0);
  const [bonusExp, setBonusExp] = useState<number>(0);
  const [bonusOro, setBonusOro] = useState<number>(0);
  const [isDesktop, setIsDesktop] = useState(true);
  const [showBestMobs, setShowBestMobs] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const types = useMemo(() => {
    return TYPE_ORDER.filter((t) => zones.some((z) => z.type === t));
  }, [zones]);

  const filteredZones = useMemo(() => {
    let list = zones.filter((z) => {
      const matchesSearch =
        z.name.toLowerCase().includes(search.toLowerCase()) ||
        z.code.toLowerCase().includes(search.toLowerCase()) ||
        z.monsters.some((m) => m.name.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "all" || z.type === typeFilter;
      const matchesLevel = maxLevel === "" || z.min_level <= maxLevel;
      return matchesSearch && matchesType && matchesLevel;
    });

    list.sort((a, b) => {
      if (sortBy === "level") return a.min_level - b.min_level || a.id - b.id;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [zones, search, typeFilter, maxLevel, sortBy]);

  const groupedZones = useMemo(() => {
    const groups: Record<string, Zone[]> = {};
    for (const zone of filteredZones) {
      if (!groups[zone.type]) groups[zone.type] = [];
      groups[zone.type].push(zone);
    }
    return groups;
  }, [filteredZones]);

  const getRowKey = (type: string, index: number, zoneId: number) =>
    isDesktop ? `${type}-${Math.floor(index / 2)}` : `zone-${zoneId}`;

  const toggleRow = (type: string, index: number, zoneId: number) => {
    const key = getRowKey(type, index, zoneId);
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const expandAll = () => {
    const allRows = new Set<string>();
    for (const type of Object.keys(groupedZones)) {
      groupedZones[type].forEach((z, i) => allRows.add(getRowKey(type, i, z.id)));
    }
    setExpandedTypes(new Set(TYPE_ORDER));
    setExpandedRows(allRows);
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const getMonsterHighlights = (m: Monster) => {
    const highlights: { icon: ReactNode; label: string; color: string }[] = [];
    if (m.attribute_point_chance && m.attribute_point_chance > 0) {
      highlights.push({ icon: <StatIcon className="w-3.5 h-3.5" />, label: `${m.attribute_point_chance}% attr`, color: "text-amber-400" });
    }
    if (m.skill_tree_point_chance && m.skill_tree_point_chance > 0) {
      highlights.push({ icon: <SkillIcon className="w-3.5 h-3.5" />, label: `${m.skill_tree_point_chance}% skill`, color: "text-cyan-400" });
    }
    if (m.unique_drop_chance && m.unique_drop_chance > 0) {
      highlights.push({ icon: <SwordIcon className="w-3.5 h-3.5" color={RARITY_HEX.common} />, label: `unique ${m.unique_drop_chance}%`, color: "text-slate-300" });
    }
    if (m.unique_uncommon_drop_chance && m.unique_uncommon_drop_chance > 0) {
      highlights.push({ icon: <SwordIcon className="w-3.5 h-3.5" color={RARITY_HEX.uncommon} />, label: `inusual ${m.unique_uncommon_drop_chance}%`, color: "text-emerald-400" });
    }
    if (m.unique_rare_drop_chance && m.unique_rare_drop_chance > 0) {
      highlights.push({ icon: <SwordIcon className="w-3.5 h-3.5" color={RARITY_HEX.rare} />, label: `raro ${m.unique_rare_drop_chance}%`, color: "text-blue-400" });
    }
    if (m.unique_epic_drop_chance && m.unique_epic_drop_chance > 0) {
      highlights.push({ icon: <SwordIcon className="w-3.5 h-3.5" color={RARITY_HEX.epic} />, label: `épico ${m.unique_epic_drop_chance}%`, color: "text-purple-400" });
    }
    return highlights;
  };

  const getMonsterDrops = (m: Monster) => {
    const drops: { name: string; chance: number; rarity: string; qty: number; guaranteed: boolean }[] = [];
    for (const d of m.guaranteed_drops || []) {
      drops.push({ name: d.name, chance: 100, rarity: d.rarity, qty: d.qty, guaranteed: true });
    }
    for (const d of m.chance_drops || []) {
      drops.push({ name: d.name, chance: d.chance, rarity: d.rarity, qty: d.qty, guaranteed: false });
    }
    return drops;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent mb-2">
          🗺️ Eldoria Zones
        </h1>
        <p className="text-slate-400">Base de datos interactiva de zonas y monstruos</p>
        <p className="text-sm text-slate-500 mt-1">{zones.length} zonas · {zones.reduce((acc, z) => acc + z.monsters.length, 0)} monstruos</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/loot" className="inline-block px-5 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition">
            🎒 Atlas de Loot
          </Link>
          <Link href="/equipamiento" className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition">
            ⚔️ Equipamiento
          </Link>
          <Link href="/cofres" className="inline-block px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition">
            📦 Cofres
          </Link>
          <Link href="/oro" className="inline-block px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition">
            💰 Oro
          </Link>
          <Link href="/simulador" className="inline-block px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition">
            ⚔️ Simulador de combate
          </Link>
        </div>
      </header>

      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar zona o monstruo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todos los tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Nivel máximo"
            value={maxLevel}
            onChange={(e) => setMaxLevel(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="level">Ordenar por nivel</option>
            <option value="name">Ordenar por nombre</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500" title="Talento que reduce costo de stamina de monstruos">Eficiencia</label>
            <select
              value={efficiency}
              onChange={(e) => setEfficiency(Number(e.target.value) as 0 | 1 | 2)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">% Bonus Exp</label>
            <input
              type="number"
              min={0}
              value={bonusExp || ""}
              onChange={(e) => setBonusExp(e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">% Bonus Oro</label>
            <input
              type="number"
              min={0}
              value={bonusOro || ""}
              onChange={(e) => setBonusOro(e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBestMobs(true)} className="px-4 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-sm transition">Mejores Mobs para Farmear</button>
            <button onClick={expandAll} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">Expandir</button>
            <button onClick={collapseAll} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">Colapsar</button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {types.map((type) => {
          const typeZones = groupedZones[type];
          if (!typeZones || typeZones.length === 0) return null;
          const isTypeOpen = expandedTypes.has(type);
          const totalMonsters = typeZones.reduce((acc, z) => acc + z.monsters.length, 0);

          return (
            <div key={type} className="border border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleType(type)}
                className="w-full text-left px-5 py-3 bg-slate-900/80 hover:bg-slate-800/80 transition flex items-center gap-3"
              >
                <span className="text-xl">{TYPE_ICONS[type] || "📍"}</span>
                <span className="text-lg font-bold text-gold-400">{TYPE_LABELS[type] || type}</span>
                <span className="text-sm text-slate-500">({typeZones.length} zonas · {totalMonsters} monstruos)</span>
                <span className={`ml-auto text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {isTypeOpen && (
                <div className="p-4 bg-slate-900/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {typeZones.map((zone, idx) => {
                      const rowKey = getRowKey(type, idx, zone.id);
                      const isZoneOpen = expandedRows.has(rowKey);
                      const bossCount = zone.monsters.filter((m) => m.is_boss).length;
                      return (
                        <div
                          key={zone.id}
                          className={`border rounded-xl overflow-hidden transition ${isZoneOpen ? "border-gold-500/50 shadow-lg shadow-gold-500/5" : "border-slate-700/50 hover:border-slate-600"}`}
                        >
                          <button
                            onClick={() => toggleRow(type, idx, zone.id)}
                            className="w-full text-left px-4 py-3 bg-slate-900/60 hover:bg-slate-800/70 transition"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-slate-100">{zone.name}</span>
                              {zone.pvp_enabled ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-800">PvP</span> : null}
                              {bossCount > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800">{bossCount} boss</span> : null}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Nivel req: {zone.min_level} · Danger {zone.danger} · {zone.monsters.length} mob
                              {zone.gold_loss_on_death && zone.gold_loss_on_death !== "0.00" ? ` · -${zone.gold_loss_on_death}% gold` : ""}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                              {zone.hp_regen_bonus_pct > 0 && <span className="text-emerald-400">❤️ +{zone.hp_regen_bonus_pct}%</span>}
                              {zone.mp_regen_bonus_pct > 0 && <span className="text-blue-400">💧 +{zone.mp_regen_bonus_pct}%</span>}
                              {zone.stamina_regen_bonus_pct > 0 && <span className="text-yellow-400">⚡ +{zone.stamina_regen_bonus_pct}%</span>}
                              <span className={`ml-auto text-slate-400 transition-transform ${isZoneOpen ? "rotate-180" : ""}`}>▼</span>
                            </div>
                          </button>

                          {isZoneOpen && (
                            <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800">
                              {zone.description && <p className="text-slate-400 text-xs mb-3 italic">{zone.description}</p>}
                              {zone.monsters.length === 0 ? (
                                <p className="text-slate-500 text-xs">Sin datos de monstruos.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="text-left text-slate-500 border-b border-slate-700">
                                        <th className="py-1.5 pr-3">Nombre</th>
                                        <th className="py-1.5 pr-3">Lvl</th>
                                        <th className="py-1.5 pr-3">Sta</th>
                                        <th className="py-1.5 pr-3">HP</th>
                                        <th className="py-1.5 pr-3">ATK</th>
                                        <th className="py-1.5 pr-3">DEF</th>
                                        <th className="py-1.5 pr-3">Dodge</th>
                                        <th className="py-1.5 pr-3">XP</th>
                                        <th className="py-1.5 pr-3">Gold</th>
                                        <th className="py-1.5 pr-3">Exp/Sta</th>
                                        <th className="py-1.5 pr-3">Oro/Sta</th>
                                        <th className="py-1.5 pr-3">Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {zone.monsters.map((m) => {
                                        const effectiveSta = Math.max(1, m.stamina_cost - efficiency);
                                        const goldAvg = (m.gold_min + m.gold_max) / 2;
                                        const adjustedXp = Math.round(m.xp_reward * (1 + bonusExp / 100));
                                        const adjustedGold = Math.round(goldAvg * (1 + bonusOro / 100));
                                        const expPerSta = effectiveSta > 0 ? (adjustedXp / effectiveSta).toFixed(1) : "0";
                                        const goldPerSta = effectiveSta > 0 ? (adjustedGold / effectiveSta).toFixed(1) : "0";
                                        const staChanged = efficiency > 0 && m.stamina_cost > 1;
                                        const highlights = getMonsterHighlights(m);
                                        const drops = getMonsterDrops(m);
                                        return (
                                          <tr
                                            key={m.id}
                                            className={`border-b border-slate-800/40 hover:bg-slate-800/30 ${m.is_boss ? "text-purple-100 bg-purple-950/30 border-l-2 border-l-purple-500" : "text-slate-300"}`}
                                            onMouseEnter={(e) => { setHoveredMonster(m.id); setHoverPos({ x: e.clientX, y: e.clientY }); }}
                                            onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                            onMouseLeave={() => setHoveredMonster(null)}
                                          >
                                            <td className="py-1.5 pr-3 font-medium whitespace-nowrap relative">
                                              <div className="flex items-center gap-1.5">
                                                {m.is_boss ? (
                                                  <span className="font-bold text-purple-300">{m.name}</span>
                                                ) : (
                                                  <span>{m.name}</span>
                                                )}
                                                {m.is_boss ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-800/60 text-purple-200 font-bold border border-purple-600/40">BOSS</span> : null}
                                                {highlights.map((h, i) => (
                                                  <span key={i} className={`${h.color}`} title={h.label}>
                                                    {h.icon}
                                                  </span>
                                                ))}
                                              </div>
                                            </td>
                                            <td className="py-1.5 pr-3">{m.level}</td>
                                            <td className="py-1.5 pr-3 font-semibold text-yellow-400">
                                              {staChanged ? (
                                                <span><span className="line-through text-slate-600">{m.stamina_cost}</span> {effectiveSta}</span>
                                              ) : m.stamina_cost}
                                            </td>
                                            <td className="py-1.5 pr-3">{m.hp_max.toLocaleString()}</td>
                                            <td className="py-1.5 pr-3">{m.attack.toLocaleString()}</td>
                                            <td className="py-1.5 pr-3">{m.defense.toLocaleString()}</td>
                                            <td className="py-1.5 pr-3">{m.dodge}%</td>
                                            <td className="py-1.5 pr-3 font-semibold text-emerald-400">
                                              {bonusExp > 0 ? (
                                                <span><span className="line-through text-slate-600">{m.xp_reward.toLocaleString()}</span> {adjustedXp.toLocaleString()}</span>
                                              ) : m.xp_reward.toLocaleString()}
                                            </td>
                                            <td className="py-1.5 pr-3">
                                              {bonusOro > 0 ? (
                                                <span><span className="line-through text-slate-600">{m.gold_min}-{m.gold_max}</span> {adjustedGold.toLocaleString()}</span>
                                              ) : `${m.gold_min}-${m.gold_max}`}
                                            </td>
                                            <td className="py-1.5 pr-3 font-semibold text-cyan-400">{expPerSta}</td>
                                            <td className="py-1.5 pr-3 font-semibold text-amber-400">{goldPerSta}</td>
                                            <td className="py-1.5 pr-3 text-slate-500">
                                              {m.dmg_type}
                                              {m.dot_chance ? ` · DOT` : ""}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredZones.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">No se encontraron zonas con esos filtros.</p>
          </div>
        )}
      </div>
      {hoveredMonster && (() => {
        const m = zones.flatMap((z) => z.monsters).find((m) => m.id === hoveredMonster);
        if (!m) return null;
        const drops = getMonsterDrops(m);
        const highlights = getMonsterHighlights(m);
        return (
          <div
            className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl pointer-events-none"
            style={{ left: hoverPos.x + 16, top: hoverPos.y - 8 }}
          >
            <p className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <span>{m.name}</span>
              {m.is_boss ? <span className="text-[10px] text-purple-400">BOSS</span> : null}
              {highlights.map((h, i) => (
                <span key={i} className={`${h.color} flex items-center gap-0.5`} title={h.label}>
                  {h.icon}
                </span>
              ))}
            </p>
            {drops.length > 0 && (
              <>
                <p className="text-[10px] text-slate-500 uppercase mt-2 mb-1">Drops</p>
                <div className="space-y-0.5">
                  {drops.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className={`font-medium ${RARITY_COLORS[d.rarity] || "text-slate-400"}`}>{d.name}</span>
                      {d.qty > 1 && <span className="text-slate-600">x{d.qty}</span>}
                      <span className={`ml-auto ${d.guaranteed ? "text-emerald-400" : "text-slate-500"}`}>
                        {d.guaranteed ? "100%" : `${d.chance}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {m.attribute_point_chance != null && m.attribute_point_chance > 0 && (
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[11px] flex items-center gap-1">
                <StatIcon className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400">Attr points: {m.attribute_point_chance}%</span>
                {m.attribute_point_max_per_player ? <span className="text-slate-600 ml-1">(max {m.attribute_point_max_per_player})</span> : null}
              </div>
            )}
            {m.skill_tree_point_chance != null && m.skill_tree_point_chance > 0 && (
              <div className="text-[11px] flex items-center gap-1">
                <SkillIcon className="w-3 h-3 text-cyan-400" />
                <span className="text-cyan-400">Skill points: {m.skill_tree_point_chance}%</span>
                {m.skill_tree_point_max_per_player ? <span className="text-slate-600 ml-1">(max {m.skill_tree_point_max_per_player})</span> : null}
              </div>
            )}
          </div>
        );
      })()}
      {showBestMobs && (() => {
        const effective = (sta: number) => Math.max(1, sta - efficiency);
        const adjGold = (m: Monster) => Math.round(((m.gold_min + m.gold_max) / 2) * (1 + bonusOro / 100));
        const adjXp = (m: Monster) => Math.round(m.xp_reward * (1 + bonusExp / 100));

        const eligible = zones
          .flatMap((z) => z.monsters.map((m) => ({ ...m, zoneName: z.name, zoneType: z.type })))
          .filter((m) => (maxLevel === "" || m.level <= maxLevel) && m.stamina_cost > 0);

        const bestGold = eligible.reduce((best, m) => {
          if (!best) return m;
          const sta = effective(m.stamina_cost);
          const score = adjGold(m) / sta;
          const bestSta = effective(best.stamina_cost);
          const bestScore = adjGold(best) / bestSta;
          if (score > bestScore) return m;
          if (score === bestScore) {
            if (adjGold(m) / sta > adjGold(best) / bestSta) return m;
            if (adjXp(m) / sta > adjXp(best) / bestSta) return m;
            if (m.level < best.level) return m;
          }
          return best;
        }, null as { zoneName: string } & Monster | null);

        const bestExp = eligible.reduce((best, m) => {
          if (!best) return m;
          const sta = effective(m.stamina_cost);
          const score = adjXp(m) / sta;
          const bestSta = effective(best.stamina_cost);
          const bestScore = adjXp(best) / bestSta;
          if (score > bestScore) return m;
          if (score === bestScore) {
            if (adjGold(m) / sta > adjGold(best) / bestSta) return m;
            if (adjXp(m) / sta > adjXp(best) / bestSta) return m;
            if (m.level < best.level) return m;
          }
          return best;
        }, null as { zoneName: string } & Monster | null);

        type DropEntry = { name: string; chance: number; qty: number; guaranteed: boolean; rarity: string };
        const mobDrops: Map<number, { mob: { zoneName: string } & Monster; drops: DropEntry[] }> = new Map();
        for (const m of eligible) {
          const drops: DropEntry[] = [];
          for (const d of m.guaranteed_drops || []) drops.push({ name: d.name, chance: 100, qty: d.qty, guaranteed: true, rarity: d.rarity });
          for (const d of m.chance_drops || []) drops.push({ name: d.name, chance: d.chance, qty: d.qty, guaranteed: false, rarity: d.rarity });
          if (drops.length > 0) mobDrops.set(m.id, { mob: m, drops });
        }

        const resourceMap = new Map<string, { mob: { zoneName: string } & Monster; drop: DropEntry }[]>();
        for (const { mob, drops } of Array.from(mobDrops.values())) {
          for (const d of drops) {
            if (!resourceMap.has(d.name)) resourceMap.set(d.name, []);
            resourceMap.get(d.name)!.push({ mob, drop: d });
          }
        }

        const bestByResource: { name: string; mob: { zoneName: string } & Monster; drop: DropEntry; score: number }[] = [];
        for (const [name, entries] of Array.from(resourceMap.entries())) {
          let best = entries[0];
          let bestScore = best.drop.chance / effective(best.mob.stamina_cost);
          for (let i = 1; i < entries.length; i++) {
            const e = entries[i];
            const score = e.drop.chance / effective(e.mob.stamina_cost);
            if (score > bestScore) {
              best = e;
              bestScore = score;
            } else if (score === bestScore) {
              const bGold = adjGold(best.mob) / effective(best.mob.stamina_cost);
              const eGold = adjGold(e.mob) / effective(e.mob.stamina_cost);
              if (eGold > bGold) { best = e; bestScore = score; }
              else if (eGold === bGold) {
                const bExp = adjXp(best.mob) / effective(best.mob.stamina_cost);
                const eExp = adjXp(e.mob) / effective(e.mob.stamina_cost);
                if (eExp > bExp) { best = e; bestScore = score; }
                else if (eExp === bExp && e.mob.level < best.mob.level) { best = e; bestScore = score; }
              }
            }
          }
          bestByResource.push({ name, mob: best.mob, drop: best.drop, score: bestScore });
        }
        bestByResource.sort((a, b) => b.score - a.score);

        const MobCard = ({ label, color, mob, sub }: { label: string; color: string; mob: { zoneName: string } & Monster; sub: string }) => {
          const sta = effective(mob.stamina_cost);
          return (
            <div className={`border rounded-xl p-4 ${color}`}>
              <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</div>
              <div className="font-bold text-lg">{mob.name}</div>
              <div className="text-sm opacity-80">{mob.zoneName} · Nivel {mob.level}</div>
              <div className="text-xs mt-2 space-y-0.5 opacity-80">
                <div>{sub}</div>
                <div>Stamina: {sta !== mob.stamina_cost ? <><span className="line-through opacity-50">{mob.stamina_cost}</span> {sta}</> : sta}</div>
                <div>Oro/Sta: {(adjGold(mob) / sta).toFixed(1)} · Exp/Sta: {(adjXp(mob) / sta).toFixed(1)}</div>
              </div>
            </div>
          );
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowBestMobs(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gold-400">🏆 Mejores Mobs para Farmear</h2>
                <button onClick={() => setShowBestMobs(false)} className="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Filtros: {maxLevel !== "" ? `Nivel máx ${maxLevel}` : "Sin límite"} · Eficiencia {efficiency} · {bonusOro > 0 ? `+${bonusOro}% oro` : "sin bonus oro"} · {bonusExp > 0 ? `+${bonusExp}% exp` : "sin bonus exp"}
              </p>

              {eligible.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay monstruos elegibles con los filtros actuales.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {bestGold && <MobCard label="🥇 Mejor para Oro" color="border-amber-700/50 bg-amber-950/30" mob={bestGold} sub={`Oro/Sta: ${(adjGold(bestGold) / effective(bestGold.stamina_cost)).toFixed(1)}`} />}
                    {bestExp && <MobCard label="🥈 Mejor para Exp" color="border-emerald-700/50 bg-emerald-950/30" mob={bestExp} sub={`Exp/Sta: ${(adjXp(bestExp) / effective(bestExp.stamina_cost)).toFixed(1)}`} />}
                  </div>

                  <h3 className="text-sm font-bold text-slate-300 mb-3">📦 Mejor mob por recurso (drop_chance / stamina)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-700">
                          <th className="py-1.5 pr-3">Recurso</th>
                          <th className="py-1.5 pr-3">Mejor Mob</th>
                          <th className="py-1.5 pr-3">Zona</th>
                          <th className="py-1.5 pr-3">Chance</th>
                          <th className="py-1.5 pr-3">Sta</th>
                          <th className="py-1.5 pr-3">Eff. Score</th>
                          <th className="py-1.5 pr-3">Oro/Sta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bestByResource.map((r) => {
                          const sta = effective(r.mob.stamina_cost);
                          return (
                            <tr key={r.name} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                              <td className="py-1.5 pr-3 font-medium text-slate-200">{r.name}</td>
                              <td className="py-1.5 pr-3 text-slate-300">{r.mob.name}</td>
                              <td className="py-1.5 pr-3 text-slate-400">{r.mob.zoneName}</td>
                              <td className="py-1.5 pr-3">{r.drop.chance}%</td>
                              <td className="py-1.5 pr-3">{sta !== r.mob.stamina_cost ? <span><span className="line-through text-slate-600">{r.mob.stamina_cost}</span> {sta}</span> : sta}</td>
                              <td className="py-1.5 pr-3 font-semibold text-cyan-400">{r.score.toFixed(2)}</td>
                              <td className="py-1.5 pr-3 text-amber-400">{(adjGold(r.mob) / sta).toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}
