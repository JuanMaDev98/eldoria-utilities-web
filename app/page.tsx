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

export default function Home() {
  const [zones] = useState<Zone[]>(zonesData.zones || []);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minLevel, setMinLevel] = useState<number | "">("");
  const [expandedZones, setExpandedZones] = useState<Set<number>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(TYPE_ORDER));
  const [sortBy, setSortBy] = useState<"level" | "danger" | "name">("level");

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

  const groupedZones = useMemo(() => {
    const groups: Record<string, Zone[]> = {};
    for (const zone of filteredZones) {
      if (!groups[zone.type]) groups[zone.type] = [];
      groups[zone.type].push(zone);
    }
    return groups;
  }, [filteredZones]);

  const toggleZone = (id: number) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    setExpandedTypes(new Set(TYPE_ORDER));
    setExpandedZones(new Set(filteredZones.map((z) => z.id)));
  };
  const collapseAll = () => {
    setExpandedZones(new Set());
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
                    {typeZones.map((zone) => {
                      const isZoneOpen = expandedZones.has(zone.id);
                      const bossCount = zone.monsters.filter((m) => m.is_boss).length;
                      return (
                        <div
                          key={zone.id}
                          className={`border rounded-xl overflow-hidden transition ${isZoneOpen ? "border-gold-500/50 shadow-lg shadow-gold-500/5" : "border-slate-700/50 hover:border-slate-600"}`}
                        >
                          <button
                            onClick={() => toggleZone(zone.id)}
                            className="w-full text-left px-4 py-3 bg-slate-900/60 hover:bg-slate-800/70 transition"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-slate-100">{zone.name}</span>
                              {zone.pvp_enabled ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-800">PvP</span> : null}
                              {bossCount > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800">{bossCount} boss</span> : null}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Nivel {zone.min_level}-{zone.max_level} · Danger {zone.danger} · {zone.monsters.length} mob
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
                                        <th className="py-1.5 pr-3">Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {zone.monsters.map((m) => (
                                        <tr key={m.id} className={`border-b border-slate-800/40 hover:bg-slate-800/30 ${m.is_boss ? "text-purple-200" : "text-slate-300"}`}>
                                          <td className="py-1.5 pr-3 font-medium whitespace-nowrap">
                                            {m.name}
                                            {m.is_boss ? <span className="ml-1.5 text-[10px] text-purple-400 font-bold">BOSS</span> : null}
                                          </td>
                                          <td className="py-1.5 pr-3">{m.level}</td>
                                          <td className="py-1.5 pr-3 font-semibold text-yellow-400">{m.stamina_cost}</td>
                                          <td className="py-1.5 pr-3">{m.hp_max.toLocaleString()}</td>
                                          <td className="py-1.5 pr-3">{m.attack.toLocaleString()}</td>
                                          <td className="py-1.5 pr-3">{m.defense.toLocaleString()}</td>
                                          <td className="py-1.5 pr-3">{m.dodge}%</td>
                                          <td className="py-1.5 pr-3 font-semibold text-emerald-400">{m.xp_reward.toLocaleString()}</td>
                                          <td className="py-1.5 pr-3">{m.gold_min}-{m.gold_max}</td>
                                          <td className="py-1.5 pr-3 text-slate-500">
                                            {m.dmg_type}
                                            {m.dot_chance ? ` · DOT` : ""}
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
    </main>
  );
}
