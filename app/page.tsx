"use client";

import { useMemo, useState } from "react";
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
  gems_min?: number;
  gems_max?: number;
  is_boss: number;
  dmg_type?: string;
  dot_chance?: number;
  dot_dpt?: number;
  dot_turns?: number;
  dot_type?: string | null;
  attribute_point_chance?: number;
  skill_tree_point_chance?: number;
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

export default function Home() {
  const [zones] = useState<Zone[]>(zonesData.zones || []);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minLevel, setMinLevel] = useState<number | "">("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"level" | "danger" | "name">("level");

  const types = useMemo(() => {
    const set = new Set(zones.map((z) => z.type));
    return Array.from(set).sort();
  }, [zones]);

  const filteredZones = useMemo(() => {
    let list = zones.filter((z) => {
      const matchesSearch =
        z.name.toLowerCase().includes(search.toLowerCase()) ||
        z.code.toLowerCase().includes(search.toLowerCase()) ||
        z.monsters.some((m) => m.name.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "all" || z.type === typeFilter;
      const matchesLevel = minLevel === "" || z.max_level >= minLevel;
      return matchesSearch && matchesType && matchesLevel;
    });

    list.sort((a, b) => {
      if (sortBy === "level") return a.min_level - b.min_level || a.id - b.id;
      if (sortBy === "danger") return a.danger - b.danger || a.id - b.id;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [zones, search, typeFilter, minLevel, sortBy]);

  const toggleZone = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(filteredZones.map((z) => z.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent mb-2">
          🗺️ Eldoria Zones
        </h1>
        <p className="text-slate-400">Base de datos interactiva de zonas y monstruos</p>
        <p className="text-sm text-slate-500 mt-1">{zones.length} zonas • {zones.reduce((acc, z) => acc + z.monsters.length, 0)} monstruos</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/loot"
            className="inline-block px-5 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition"
          >
            🎒 Atlas de Loot
          </Link>
          <Link
            href="/equipamiento"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
          >
            ⚔️ Equipamiento
          </Link>
          <Link
            href="/cofres"
            className="inline-block px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
          >
            📦 Cofres
          </Link>
          <Link
            href="/oro"
            className="inline-block px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
          >
            💰 Oro
          </Link>
          <Link
            href="/simulador"
            className="inline-block px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition"
          >
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
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Nivel mínimo"
            value={minLevel}
            onChange={(e) => setMinLevel(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="level">Ordenar por nivel</option>
            <option value="danger">Ordenar por peligro</option>
            <option value="name">Ordenar por nombre</option>
          </select>
          <div className="flex gap-2">
            <button onClick={expandAll} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">Expandir</button>
            <button onClick={collapseAll} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">Colapsar</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredZones.map((zone) => {
          const isOpen = expanded.has(zone.id);
          const bossCount = zone.monsters.filter((m) => m.is_boss).length;
          return (
            <div
              key={zone.id}
              className={`border rounded-2xl overflow-hidden transition ${isOpen ? "border-gold-500/50 shadow-lg shadow-gold-500/5" : "border-slate-800 hover:border-slate-600"}`}
            >
              <button
                onClick={() => toggleZone(zone.id)}
                className="w-full text-left px-5 py-4 bg-slate-900/60 hover:bg-slate-800/80 transition flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-bold text-slate-100">{zone.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">{zone.type}</span>
                    {zone.pvp_enabled ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-800">PvP</span> : null}
                    {bossCount > 0 ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800">{bossCount} boss</span> : null}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    Nivel {zone.min_level}-{zone.max_level} · Danger {zone.danger} · {zone.monsters.length} monstruos
                    {zone.gold_loss_on_death ? ` · Muerte: -${zone.gold_loss_on_death}% gold` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  {zone.hp_regen_bonus_pct > 0 && <span className="text-emerald-400">❤️ +{zone.hp_regen_bonus_pct}% HP</span>}
                  {zone.mp_regen_bonus_pct > 0 && <span className="text-blue-400">💧 +{zone.mp_regen_bonus_pct}% MP</span>}
                  {zone.stamina_regen_bonus_pct > 0 && <span className="text-yellow-400">⚡ +{zone.stamina_regen_bonus_pct}% Stamina</span>}
                  <span className={`text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-5 py-4 bg-slate-900/30">
                  {zone.description && <p className="text-slate-400 text-sm mb-4 italic">{zone.description}</p>}
                  {zone.monsters.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay datos de monstruos para esta zona.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-700">
                            <th className="py-2 pr-4">Nombre</th>
                            <th className="py-2 pr-4">Lvl</th>
                            <th className="py-2 pr-4">Stamina</th>
                            <th className="py-2 pr-4">HP</th>
                            <th className="py-2 pr-4">ATK</th>
                            <th className="py-2 pr-4">DEF</th>
                            <th className="py-2 pr-4">Dodge</th>
                            <th className="py-2 pr-4">Acc</th>
                            <th className="py-2 pr-4">XP</th>
                            <th className="py-2 pr-4">Gold</th>
                            <th className="py-2 pr-4">XP/Stam</th>
                            <th className="py-2 pr-4">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zone.monsters.map((m) => (
                            <tr key={m.id} className={`border-b border-slate-800/60 hover:bg-slate-800/40 ${m.is_boss ? "text-purple-200" : "text-slate-300"}`}>
                              <td className="py-2 pr-4 font-medium">
                                {m.name}
                                {m.is_boss ? <span className="ml-2 text-xs text-purple-400">BOSS</span> : null}
                              </td>
                              <td className="py-2 pr-4">{m.level}</td>
                              <td className="py-2 pr-4 font-semibold text-yellow-400">{m.stamina_cost}</td>
                              <td className="py-2 pr-4">{m.hp_max.toLocaleString()}</td>
                              <td className="py-2 pr-4">{m.attack.toLocaleString()}</td>
                              <td className="py-2 pr-4">{m.defense.toLocaleString()}</td>
                              <td className="py-2 pr-4">{m.dodge}%</td>
                              <td className="py-2 pr-4">{m.accuracy}</td>
                              <td className="py-2 pr-4 font-semibold text-emerald-400">{m.xp_reward.toLocaleString()}</td>
                              <td className="py-2 pr-4">{m.gold_min}-{m.gold_max}</td>
                              <td className="py-2 pr-4">{(m.xp_reward / m.stamina_cost).toFixed(0)}</td>
                              <td className="py-2 pr-4 text-xs text-slate-500">
                                {m.dmg_type}
                                {m.dot_chance ? ` · DOT ${m.dot_chance}%` : ""}
                              </td>
                            </tr>
                          ))}
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
    </main>
  );
}
