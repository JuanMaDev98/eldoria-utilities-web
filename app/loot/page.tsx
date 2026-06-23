"use client";

import { useMemo, useState } from "react";
import zonesData from "@/public/eldoria_zones_with_loot.json";
import Link from "next/link";

interface DropItem {
  item: string;
  qty: number;
  chance?: number;
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
  xp_reward: number;
  gold_min: number;
  gold_max: number;
  is_boss: number;
  dmg_type?: string;
  dot_chance?: number;
  guaranteed_drops: DropItem[];
  chance_drops: DropItem[];
  unique_drop_chance: number | null;
  unique_common_max_per_player: number | null;
  unique_uncommon_drop_chance: number | null;
  unique_rare_drop_chance: number | null;
  unique_epic_drop_chance: number | null;
  attribute_point_chance: number | null;
  skill_tree_point_chance: number | null;
  respawn_seconds?: number;
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
  monsters: Monster[];
}

const rarityColors: Record<string, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  mythic: "text-orange-400",
  legendary: "text-yellow-400",
};

const rarityBg: Record<string, string> = {
  common: "bg-slate-700",
  uncommon: "bg-emerald-600",
  rare: "bg-blue-600",
  epic: "bg-purple-600",
  mythic: "bg-orange-600",
  legendary: "bg-yellow-600",
};

function getItemTypeLabel(type: string) {
  const map: Record<string, string> = {
    material: "Material",
    consumable: "Consumible",
    box: "Cofre",
    weapon: "Arma",
    armor: "Armadura",
    accessory: "Accesorio",
    race: "Raza",
  };
  return map[type] || type;
}

function classifyMonsterLoot(m: Monster) {
  const drops = [...m.guaranteed_drops, ...m.chance_drops];
  const classes: string[] = [];
  const items = new Set(drops.map((d) => d.item));
  const types = new Set(drops.map((d) => d.item_type));

  if (items.has("dragon_scale") || (m.unique_rare_drop_chance || 0) > 0 || (m.unique_epic_drop_chance || 0) > 0) {
    classes.push("Loot raro");
  }
  if (types.has("box")) classes.push("Cofres");
  if (types.has("material")) classes.push("Materiales");
  if (types.has("consumable")) classes.push("Pociones");
  if (types.has("weapon") || types.has("armor") || types.has("accessory") || types.has("race")) {
    classes.push("Equipable");
  }
  return classes.length ? classes.join(", ") : "Sin loot listado";
}

function priorityScore(m: Monster) {
  let score = 5;
  const avgGold = (m.gold_min + m.gold_max) / 2;
  const goldPerStam = avgGold / m.stamina_cost;
  const xpPerStam = m.xp_reward / m.stamina_cost;
  const drops = [...m.guaranteed_drops, ...m.chance_drops];
  const hasDragon = drops.some((d) => d.item === "dragon_scale");
  const hasRareBox = drops.some((d) => d.item.includes("box_rare") || d.item.includes("box_mythic"));
  const hasBox = drops.some((d) => d.item_type === "box");
  const hasMats = drops.some((d) => d.item_type === "material");

  if (m.is_boss) {
    score += 1;
    if (hasDragon || hasRareBox) score += 2;
    else if (hasBox) score += 1;
    if (m.stamina_cost === 1) score += 2;
    else if (m.stamina_cost >= 10) score -= 1;
    if (!drops.length && (m.unique_drop_chance || 0) <= 0) score -= 2;
  } else {
    if (m.stamina_cost === 1) score += 1;
    if (goldPerStam > 40) score += 2;
    else if (goldPerStam > 20) score += 1;
    if (xpPerStam > 400) score += 1;
    if (hasDragon || hasRareBox) score += 2;
    else if (hasBox) score += 1;
    if (hasMats) score += 1;
    if (!drops.length) score -= 2;
  }
  return Math.max(1, Math.min(10, score));
}

function priorityLabel(score: number) {
  const labels: Record<number, string> = {
    10: "Máxima", 9: "Muy Alta", 8: "Alta", 7: "Buena", 6: "Media-Alta",
    5: "Media", 4: "Media-Baja", 3: "Baja", 2: "Muy Baja", 1: "Evitar",
  };
  return labels[score] || "Media";
}

function strategyFor(m: Monster) {
  if (m.is_boss) {
    if ((m.respawn_seconds || 300) >= 600) return "Boss rush con grupo / esperar respawn";
    return "Boss rush (respawn corto)";
  }
  if (m.stamina_cost <= 1 && m.hp_max < 3000) return "Farmeo rápido en bucle (solo)";
  if (m.stamina_cost <= 3) return "Ruta rápida de densidad media";
  return "Grupo o burst de habilidades";
}

export default function LootPage() {
  const zones: Zone[] = zonesData.zones || [];
  const [selectedZoneId, setSelectedZoneId] = useState<number>(zones[3]?.id || zones[0]?.id);
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchLoot, setSearchLoot] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");

  const zonesWithMonsters = useMemo(
    () => zones.filter((z) => z.monsters.length > 0).sort((a, b) => a.min_level - b.min_level || a.id - b.id),
    [zones]
  );

  const enrichedMonsters = useMemo(() => {
    const list: (Monster & { zone: Zone; priority: number; priorityLabel: string; classes: string })[] = [];
    zonesWithMonsters.forEach((zone) => {
      zone.monsters.forEach((m) => {
        const p = priorityScore(m);
        list.push({ ...m, zone, priority: p, priorityLabel: priorityLabel(p), classes: classifyMonsterLoot(m) });
      });
    });
    return list;
  }, [zonesWithMonsters]);

  const selectedZone = useMemo(
    () => zonesWithMonsters.find((z) => z.id === selectedZoneId) || zonesWithMonsters[0],
    [zonesWithMonsters, selectedZoneId]
  );

  const filteredMonsters = useMemo(() => {
    if (!selectedZone) return [];
    return selectedZone.monsters
      .map((m) => {
        const p = priorityScore(m);
        return { ...m, priority: p, priorityLabel: priorityLabel(p), classes: classifyMonsterLoot(m) };
      })
      .filter((m) => {
        const matchesName = m.name.toLowerCase().includes(searchName.toLowerCase());
        const matchesLoot =
          searchLoot === "" ||
          m.guaranteed_drops.some((d) => d.name.toLowerCase().includes(searchLoot.toLowerCase()) || d.item.toLowerCase().includes(searchLoot.toLowerCase())) ||
          m.chance_drops.some((d) => d.name.toLowerCase().includes(searchLoot.toLowerCase()) || d.item.toLowerCase().includes(searchLoot.toLowerCase()));
        const matchesCat =
          catFilter === "all" ||
          (catFilter === "mats" && m.classes.includes("Materiales")) ||
          (catFilter === "chests" && m.classes.includes("Cofres")) ||
          (catFilter === "potions" && m.classes.includes("Pociones")) ||
          (catFilter === "rare" && m.classes.includes("Loot raro")) ||
          (catFilter === "fast" && m.stamina_cost === 1 && !m.is_boss);
        return matchesName && matchesLoot && matchesCat;
      })
      .sort((a, b) => b.priority - a.priority || b.level - a.level || a.name.localeCompare(b.name));
  }, [selectedZone, searchName, searchLoot, catFilter]);

  const activeMonster = useMemo(() => {
    if (selectedMonsterId) return filteredMonsters.find((m) => m.id === selectedMonsterId);
    return filteredMonsters[0] || null;
  }, [filteredMonsters, selectedMonsterId]);

  const top5 = useMemo(() => {
    return [...enrichedMonsters].sort((a, b) => b.priority - a.priority || b.level - a.level).slice(0, 5);
  }, [enrichedMonsters]);

  const dragonScaleMobs = useMemo(() => {
    return enrichedMonsters
      .filter((m) => [...m.guaranteed_drops, ...m.chance_drops].some((d) => d.item === "dragon_scale"))
      .sort((a, b) => {
        const da = [...a.guaranteed_drops, ...a.chance_drops].find((d) => d.item === "dragon_scale");
        const db = [...b.guaranteed_drops, ...b.chance_drops].find((d) => d.item === "dragon_scale");
        return (db?.chance || 0) - (da?.chance || 0);
      });
  }, [enrichedMonsters]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent">
              🎒 Eldoria Loot Atlas
            </h1>
            <p className="text-slate-400 mt-1">Guía de drops, probabilidades y estrategia de farmeo por monstruo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg transition"
            >
              🗺️ Zonas
            </Link>
            <Link
              href="/equipamiento"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
            >
              ⚔️ Equipamiento
            </Link>
            <Link
              href="/cofres"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition"
            >
              📦 Cofres
            </Link>
            <Link
              href="/oro"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition"
            >
              💰 Oro
            </Link>
            <Link
              href="/simulador"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition"
            >
              ⚔️ Simulador
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <input
            type="text"
            placeholder="Buscar monstruo..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <input
            type="text"
            placeholder="Buscar loot específico..."
            value={searchLoot}
            onChange={(e) => setSearchLoot(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todo el loot</option>
            <option value="mats">Materiales</option>
            <option value="chests">Cofres</option>
            <option value="potions">Pociones</option>
            <option value="rare">Loot raro</option>
            <option value="fast">Farm rápido</option>
          </select>
          <select
            value={selectedZoneId}
            onChange={(e) => {
              setSelectedZoneId(Number(e.target.value));
              setSelectedMonsterId(null);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500 md:hidden"
          >
            {zonesWithMonsters.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} (Nv {z.min_level}-{z.max_level})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Zone tabs desktop */}
      <nav className="hidden md:flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-thin">
        {zonesWithMonsters.map((z) => (
          <button
            key={z.id}
            onClick={() => {
              setSelectedZoneId(z.id);
              setSelectedMonsterId(null);
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-semibold transition ${
              selectedZoneId === z.id
                ? "bg-gradient-to-r from-gold-600 to-amber-600 border-transparent text-slate-950"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-gold-500/50"
            }`}
          >
            {z.name}
            <span className="block text-xs opacity-80 font-normal">Nv {z.min_level}-{z.max_level}</span>
          </button>
        ))}
      </nav>

      {selectedZone && (
        <section className="mb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">{selectedZone.name}</h2>
              <p className="text-slate-400 text-sm">
                Nivel {selectedZone.min_level}-{selectedZone.max_level} · Peligro {selectedZone.danger}/100 · {selectedZone.monsters.length} monstruos
              </p>
            </div>
            {selectedZone.description && (
              <p className="text-slate-500 text-sm italic max-w-2xl">{selectedZone.description}</p>
            )}
          </div>

          {filteredMonsters.length === 0 ? (
            <p className="text-slate-500">No hay monstruos que coincidan con los filtros.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Monster tabs */}
              <div className="lg:col-span-4 xl:col-span-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredMonsters.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMonsterId(m.id)}
                      className={`text-left p-3 rounded-xl border transition ${
                        activeMonster?.id === m.id
                          ? "bg-slate-800 border-gold-500 shadow-lg shadow-gold-500/5"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-100 text-sm leading-tight">{m.name}</span>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                            m.priority >= 8 ? "bg-emerald-400" : m.priority >= 5 ? "bg-yellow-400" : "bg-red-400"
                          }`}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Nv {m.level} · Stamina {m.stamina_cost}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.is_boss ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800">BOSS</span>
                        ) : null}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {m.priorityLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Monster detail */}
              <div className="lg:col-span-8 xl:col-span-9">
                {activeMonster ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-2xl md:text-3xl font-bold text-slate-100">{activeMonster.name}</h3>
                          {activeMonster.is_boss ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800 text-xs font-bold">BOSS</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs">Mob</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                            activeMonster.priority >= 8
                              ? "bg-emerald-900/30 text-emerald-300 border-emerald-800"
                              : activeMonster.priority >= 5
                              ? "bg-yellow-900/30 text-yellow-300 border-yellow-800"
                              : "bg-red-900/30 text-red-300 border-red-800"
                          }`}>
                            Prioridad {activeMonster.priorityLabel} ({activeMonster.priority}/10)
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                          {activeMonster.code} · Respawn {(activeMonster.respawn_seconds || 60)}s · Tipo {activeMonster.dmg_type || "physical"}
                          {activeMonster.dot_chance ? ` · DOT ${activeMonster.dot_chance}%` : ""}
                        </p>
                        <p className="text-gold-400 text-sm mt-1 font-medium">{activeMonster.classes}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                      {[
                        { label: "Nivel", value: activeMonster.level },
                        { label: "HP", value: activeMonster.hp_max.toLocaleString() },
                        { label: "ATK", value: activeMonster.attack.toLocaleString() },
                        { label: "DEF", value: activeMonster.defense.toLocaleString() },
                        { label: "Dodge", value: `${activeMonster.dodge}%` },
                        { label: "Stamina", value: activeMonster.stamina_cost },
                        { label: "XP", value: activeMonster.xp_reward.toLocaleString() },
                        { label: "Gold", value: `${activeMonster.gold_min}-${activeMonster.gold_max}` },
                        { label: "XP/Stam", value: Math.round(activeMonster.xp_reward / activeMonster.stamina_cost).toLocaleString() },
                        { label: "Gold/Stam", value: ((activeMonster.gold_min + activeMonster.gold_max) / 2 / activeMonster.stamina_cost).toFixed(1) },
                        { label: "Acc", value: activeMonster.accuracy },
                        { label: "Tipo", value: activeMonster.is_boss ? "Boss" : "Mob" },
                      ].map((s) => (
                        <div key={s.label} className="bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-center">
                          <div className="text-gold-400 font-bold text-sm md:text-base">{s.value}</div>
                          <div className="text-slate-500 text-[10px] uppercase tracking-wider">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Drops */}
                    <div className="space-y-6">
                      {activeMonster.guaranteed_drops.length > 0 && (
                        <div>
                          <h4 className="text-lg font-bold text-slate-100 mb-3">✅ Drops garantizados</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeMonster.guaranteed_drops.map((d, i) => (
                              <div key={i} className="flex items-center gap-3 bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${rarityBg[d.rarity] || "bg-slate-700"}`}>
                                  {d.qty}x
                                </div>
                                <div>
                                  <div className={`font-semibold ${rarityColors[d.rarity] || "text-slate-200"}`}>{d.name}</div>
                                  <div className="text-xs text-slate-500">
                                    {d.item} · {getItemTypeLabel(d.item_type)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeMonster.chance_drops.length > 0 && (
                        <div>
                          <h4 className="text-lg font-bold text-slate-100 mb-3">🎲 Drops por probabilidad</h4>
                          <div className="space-y-2">
                            {activeMonster.chance_drops.map((d, i) => (
                              <div key={i} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-300 font-semibold">{d.qty}x</span>
                                    <span className={`font-bold ${rarityColors[d.rarity] || "text-slate-200"}`}>{d.name}</span>
                                    <span className="text-xs text-slate-500">{d.item} · {getItemTypeLabel(d.item_type)}</span>
                                  </div>
                                  <span className="text-gold-400 font-bold text-sm whitespace-nowrap">{d.chance}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${rarityBg[d.rarity] || "bg-slate-600"}`}
                                    style={{ width: `${Math.min(100, d.chance || 0)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unique chances */}
                      {((activeMonster.unique_drop_chance || 0) > 0 ||
                        (activeMonster.unique_uncommon_drop_chance || 0) > 0 ||
                        (activeMonster.unique_rare_drop_chance || 0) > 0 ||
                        (activeMonster.unique_epic_drop_chance || 0) > 0 ||
                        (activeMonster.attribute_point_chance || 0) > 0 ||
                        (activeMonster.skill_tree_point_chance || 0) > 0) && (
                        <div>
                          <h4 className="text-lg font-bold text-slate-100 mb-3">🎁 Recompensas adicionales</h4>
                          <div className="flex flex-wrap gap-2">
                            {(activeMonster.unique_drop_chance || 0) > 0 && (
                              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700">
                                Único común {activeMonster.unique_drop_chance}% (max {activeMonster.unique_common_max_per_player})
                              </span>
                            )}
                            {(activeMonster.unique_uncommon_drop_chance || 0) > 0 && (
                              <span className="px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-300 text-xs border border-emerald-800">
                                Único inusual {activeMonster.unique_uncommon_drop_chance}%
                              </span>
                            )}
                            {(activeMonster.unique_rare_drop_chance || 0) > 0 && (
                              <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-300 text-xs border border-blue-800">
                                Único raro {activeMonster.unique_rare_drop_chance}%
                              </span>
                            )}
                            {(activeMonster.unique_epic_drop_chance || 0) > 0 && (
                              <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-300 text-xs border border-purple-800">
                                Único épico {activeMonster.unique_epic_drop_chance}%
                              </span>
                            )}
                            {(activeMonster.attribute_point_chance || 0) > 0 && (
                              <span className="px-3 py-1 rounded-full bg-yellow-900/30 text-yellow-300 text-xs border border-yellow-800">
                                Punto de atributo {activeMonster.attribute_point_chance}%
                              </span>
                            )}
                            {(activeMonster.skill_tree_point_chance || 0) > 0 && (
                              <span className="px-3 py-1 rounded-full bg-orange-900/30 text-orange-300 text-xs border border-orange-800">
                                Punto de árbol {activeMonster.skill_tree_point_chance}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Strategy */}
                      <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-800/30 rounded-xl p-4">
                        <h4 className="text-gold-400 font-bold mb-2">⚔️ Estrategia recomendada</h4>
                        <p className="text-slate-300 text-sm">
                          <strong>Mejor farmeo:</strong> {strategyFor(activeMonster)}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          {activeMonster.is_boss
                            ? "Alto riesgo/recompensa. Ideal para loot raro o puntos de árbol, no para farmeo constante por hora."
                            : "Bajo coste de stamina, ideal para rutas repetitivas y acumulación de materiales."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Loot tips */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">🎯 Trucos para loot específico</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-gold-400 font-bold mb-2">Dragon Scale</h4>
            <p className="text-slate-400 text-sm">
              {dragonScaleMobs.length
                ? `Los mejores chances explícitos: ${dragonScaleMobs
                    .slice(0, 4)
                    .map((m) => `${m.name} (${[...m.guaranteed_drops, ...m.chance_drops].find((d) => d.item === "dragon_scale")?.chance}%)`)
                    .join(", ")}.`
                : "No hay datos de dragon_scale en esta versión."}
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-gold-400 font-bold mb-2">Carbon concentrado</h4>
            <p className="text-slate-400 text-sm">
              Las Minas de Carbón son la fuente directa. Prioriza mobs con chance_drops de <strong>carbon</strong>. Recuerda el límite de 15 peleas diarias por mob en esa zona.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-gold-400 font-bold mb-2">Hierbas</h4>
            <p className="text-slate-400 text-sm">
              Campos de Hierbas es la zona dedicada. También busca mobs con <strong>herb_common</strong> y <strong>herb_rare</strong> en Pantano Oscuro y Grieta del Cósmos.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-gold-400 font-bold mb-2">Cofres</h4>
            <p className="text-slate-400 text-sm">
              Filtra por &quot;Cofres&quot;. Los box_common son comunes en zonas iniciales; box_rare y superiores salen de bosses en zonas de loot avanzadas.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-gold-400 font-bold mb-2">Puntos de árbol / atributo</h4>
            <p className="text-slate-400 text-sm">
              Busca mobs con <strong>skill_tree_point_chance</strong> o <strong>attribute_point_chance</strong> mayor a 0. Suelen ser bosses de eventos o zonas élite.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-gold-400 font-bold mb-2">Farm rápido</h4>
            <p className="text-slate-400 text-sm">
              Filtra por &quot;Farm rápido&quot; para ver mobs de stamina 1. Son la base del farmeo por hora: kills rápidas, bajo riesgo y loot constante.
            </p>
          </div>
        </div>
      </section>

      {/* Top 5 */}
      <section>
        <h2 className="text-2xl font-bold text-slate-100 mb-4">🏆 Top 5 opciones para farmear loot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {top5.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedZoneId(m.zone.id);
                setSelectedMonsterId(m.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-left bg-slate-900/60 border border-slate-800 hover:border-gold-500/50 rounded-xl p-4 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl font-black text-gold-500/30">#{idx + 1}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {m.priorityLabel}
                </span>
              </div>
              <h4 className="font-bold text-slate-100">{m.name}</h4>
              <p className="text-xs text-slate-400 mb-2">{m.zone.name} · Nv {m.level}</p>
              <p className="text-xs text-slate-500">{m.classes}</p>
              <p className="text-xs text-gold-400 mt-2">
                Gold/Stam {((m.gold_min + m.gold_max) / 2 / m.stamina_cost).toFixed(1)} · XP/Stam {Math.round(m.xp_reward / m.stamina_cost)}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
