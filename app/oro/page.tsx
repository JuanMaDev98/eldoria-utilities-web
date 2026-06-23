"use client";

import { useMemo, useState } from "react";
import goldData from "@/public/gold_farm.json";
import Link from "next/link";

interface DropDetail {
  item: string;
  name: string;
  qty: number;
  chance?: number;
  price: number;
  expected: number;
  rarity: string;
}

interface Mob {
  zone_id: number;
  zone_code: string;
  zone_name: string;
  zone_min_level: number;
  zone_max_level: number;
  zone_danger: number;
  zone_req_item_rarity: string | null;
  limited_daily: boolean;
  monster_id: number;
  monster_code: string;
  monster_name: string;
  monster_level: number;
  stamina_cost: number;
  hp_max: number;
  attack: number;
  defense: number;
  dodge: number;
  spell_resist: number;
  is_boss: number;
  base_gold_avg: number;
  drop_gold_expected: number;
  total_gold_expected: number;
  base_gold_per_stam: number;
  total_gold_per_stam: number;
  top_drops: DropDetail[];
  viability_default: string;
}

const rarityOrder: Record<string, number> = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6,
};

const rarityColors: Record<string, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
  mythic: "text-orange-400",
};

const viabilityColors: Record<string, string> = {
  high: "bg-emerald-900/30 text-emerald-300 border-emerald-800",
  medium: "bg-yellow-900/30 text-yellow-300 border-yellow-800",
  low: "bg-red-900/30 text-red-300 border-red-800",
};

const viabilityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export default function OroPage() {
  const mobs: Mob[] = useMemo(() => (goldData.mobs || []) as Mob[], []);
  const [search, setSearch] = useState("");
  const [minLevel, setMinLevel] = useState<number | "">("");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [reqFilter, setReqFilter] = useState<string>("all");
  const [bossFilter, setBossFilter] = useState<string>("all");
  const [viaFilter, setViaFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"total" | "base" | "level">("total");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dailyKills, setDailyKills] = useState<number>(500);

  const reqOptions = useMemo(() => {
    const set = new Set(mobs.map((m) => m.zone_req_item_rarity || "none"));
    return Array.from(set).sort((a, b) => (rarityOrder[a] || 0) - (rarityOrder[b] || 0));
  }, [mobs]);

  const filtered = useMemo(() => {
    let list = mobs.filter((m) => {
      const matchesSearch =
        m.monster_name.toLowerCase().includes(search.toLowerCase()) ||
        m.zone_name.toLowerCase().includes(search.toLowerCase());
      const matchesMin = minLevel === "" || m.monster_level >= minLevel;
      const matchesMax = maxLevel === "" || m.monster_level <= maxLevel;
      const matchesReq =
        reqFilter === "all" ||
        (reqFilter === "none" && !m.zone_req_item_rarity) ||
        m.zone_req_item_rarity === reqFilter;
      const matchesBoss = bossFilter === "all" || (bossFilter === "boss" ? m.is_boss : !m.is_boss);
      const matchesVia = viaFilter === "all" || m.viability_default === viaFilter;
      return matchesSearch && matchesMin && matchesMax && matchesReq && matchesBoss && matchesVia;
    });

    list.sort((a, b) => {
      if (sortBy === "total") return b.total_gold_per_stam - a.total_gold_per_stam;
      if (sortBy === "base") return b.base_gold_per_stam - a.base_gold_per_stam;
      return a.monster_level - b.monster_level;
    });
    return list;
  }, [mobs, search, minLevel, maxLevel, reqFilter, bossFilter, viaFilter, sortBy]);

  const top5 = useMemo(() => filtered.slice(0, 5), [filtered]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent">
              💰 Guía de Farmeo de Oro
            </h1>
            <p className="text-slate-400 mt-1">Análisis de oro/stamina incluyendo drops vendibles a NPC</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg transition">
              🗺️ Zonas
            </Link>
            <Link href="/loot" className="px-4 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 font-semibold rounded-lg transition">
              🎒 Loot
            </Link>
            <Link href="/equipamiento" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition">
              ⚔️ Equipamiento
            </Link>
            <Link href="/cofres" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition">
              📦 Cofres
            </Link>
            <Link href="/simulador" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition">
              ⚔️ Simulador
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
            <p className="text-sm text-amber-200/80">
              <strong className="text-amber-400">⚠️ Datos estimados:</strong> Los valores incluyen oro base + valor esperado de drops vendidos a NPC.
              Precios como mithril_ore (2500g) o dragon_scale (250k) vienen de la data del juego. La viabilidad se calcula con stats base de nivel 21
              (HP 740, ATK 67, DEF 43, INT 53) — con mejor equipo podés matar mobs mucho más difíciles.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-gold-400 font-bold text-sm mb-2">🌳 Skill tree para oro</h3>
            <div className="flex flex-wrap gap-2">
              {goldData.skill_tree_for_gold.map((s: any) => (
                <span key={s.code} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700" title={s.effect}>
                  {s.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Prioridad: <strong>m_gold1</strong> y <strong>m_gold2</strong> para +% oro, luego nodos de stamina (máx/costo/regen) para más peleas por hora.
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
          <input
            type="text"
            placeholder="Buscar mob o zona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <input
            type="number"
            placeholder="Nivel min"
            value={minLevel}
            onChange={(e) => setMinLevel(e.target.value === "" ? "" : Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <input
            type="number"
            placeholder="Nivel max"
            value={maxLevel}
            onChange={(e) => setMaxLevel(e.target.value === "" ? "" : Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={reqFilter}
            onChange={(e) => setReqFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todo acceso</option>
            <option value="none">Sin requisito</option>
            {reqOptions.filter((r) => r !== "none").map((r) => (
              <option key={r} value={r}>
                Requiere {r}
              </option>
            ))}
          </select>
          <select
            value={bossFilter}
            onChange={(e) => setBossFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todos</option>
            <option value="normal">No bosses</option>
            <option value="boss">Solo bosses</option>
          </select>
          <select
            value={viaFilter}
            onChange={(e) => setViaFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Toda viabilidad</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="total">Ordenar: oro total/stam</option>
            <option value="base">Ordenar: oro base/stam</option>
            <option value="level">Ordenar: nivel</option>
          </select>
        </div>
      </section>

      {/* Daily estimate */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-100">📊 Estimado diario con cap de kills</h2>
            <p className="text-xs text-slate-500">
              Cap PvE: {goldData.daily_caps.pve_kills} kills/día. Minas de Carbón / Campos de Hierbas: {goldData.daily_caps.limited_mob_fights} peleas por mob.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Kills/día</label>
            <input
              type="number"
              value={dailyKills}
              onChange={(e) => setDailyKills(Number(e.target.value))}
              className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>
        {top5.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
            {top5.map((m, idx) => (
              <div key={m.monster_id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                <div className="text-2xl font-black text-gold-500/30">#{idx + 1}</div>
                <h4 className="font-bold text-slate-100 text-sm">{m.monster_name}</h4>
                <p className="text-xs text-slate-500">{m.zone_name} · Nv {m.monster_level}</p>
                <p className="text-sm text-gold-400 font-bold mt-1">
                  {(m.total_gold_expected * dailyKills).toLocaleString()}g/día
                </p>
                <p className="text-xs text-slate-500">{m.total_gold_per_stam.toFixed(1)} g/stam</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Results count */}
      <p className="text-slate-500 text-sm mb-3">Mostrando {filtered.length} de {mobs.length} mobs</p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-950 sticky top-0">
            <tr className="text-left text-slate-400 border-b border-slate-800">
              <th className="py-3 px-3">Mob</th>
              <th className="py-3 px-3">Zona</th>
              <th className="py-3 px-3">Lvl</th>
              <th className="py-3 px-3">Stam</th>
              <th className="py-3 px-3 text-right">Oro base/stam</th>
              <th className="py-3 px-3 text-right">Drops/stam</th>
              <th className="py-3 px-3 text-right">Total/stam</th>
              <th className="py-3 px-3">Viabilidad</th>
              <th className="py-3 px-3">Requisito</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const isOpen = expanded === m.monster_id;
              return (
                <>
                  <tr
                    key={m.monster_id}
                    onClick={() => setExpanded(isOpen ? null : m.monster_id)}
                    className={`border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer ${m.is_boss ? "text-purple-200" : "text-slate-300"}`}
                  >
                    <td className="py-3 px-3 font-medium">
                      {m.monster_name}
                      {m.is_boss ? <span className="ml-2 text-[10px] text-purple-400">BOSS</span> : null}
                      {m.limited_daily ? <span className="ml-2 text-[10px] text-amber-400">15/día</span> : null}
                    </td>
                    <td className="py-3 px-3">{m.zone_name}</td>
                    <td className="py-3 px-3">{m.monster_level}</td>
                    <td className="py-3 px-3 text-yellow-400 font-semibold">{m.stamina_cost}</td>
                    <td className="py-3 px-3 text-right">{m.base_gold_per_stam.toFixed(1)}</td>
                    <td className="py-3 px-3 text-right">{(m.drop_gold_expected / m.stamina_cost).toFixed(1)}</td>
                    <td className="py-3 px-3 text-right font-bold text-gold-400">{m.total_gold_per_stam.toFixed(1)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${viabilityColors[m.viability_default]}`}>
                        {viabilityLabels[m.viability_default]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {m.zone_req_item_rarity ? `Item ${m.zone_req_item_rarity}` : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={9} className="bg-slate-950/30 px-3 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-gold-400 font-bold mb-2">Stats del mob</h4>
                            <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                              <span>HP: {m.hp_max.toLocaleString()}</span>
                              <span>ATK: {m.attack}</span>
                              <span>DEF: {m.defense}</span>
                              <span>Dodge: {m.dodge}%</span>
                              <span>Spell Res: {m.spell_resist}</span>
                              <span>Danger zona: {m.zone_danger}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-gold-400 font-bold mb-2">Top drops esperados</h4>
                            <div className="space-y-1">
                              {m.top_drops.length === 0 && <p className="text-xs text-slate-500">Sin drops vendibles listados.</p>}
                              {m.top_drops.map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className={`${rarityColors[d.rarity] || "text-slate-300"}`}>
                                    {d.name} {d.qty > 1 ? `x${d.qty}` : ""} {d.chance ? `(${d.chance}%)` : ""}
                                  </span>
                                  <span className="text-slate-500">
                                    {d.expected.toFixed(0)}g esperados
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No se encontraron mobs con esos filtros.
        </div>
      )}
    </main>
  );
}
