"use client";

import { useMemo, useState } from "react";
import boxesData from "@/public/boxes.json";
import Link from "next/link";

interface BoxSource {
  zone_id: number;
  zone_name: string;
  zone_min_level: number;
  zone_max_level: number;
  monster_id: number;
  monster_name: string;
  monster_level: number;
  monster_is_boss: number;
  chance: number;
  guaranteed: boolean;
}

interface EquipmentItem {
  catalog_id: number;
  item_code: string;
  item_name: string;
  item_type: string;
  rarity: string;
  level_req: number;
  price: number;
}

interface Box {
  code: string;
  name: string;
  rarity: string;
  description: string;
  sources: BoxSource[];
  equipment_rarities: string[];
  equipment_count: number;
  equipment_items: EquipmentItem[];
  estimated_probabilities: Record<string, number | undefined>;
}

const rarityOrder: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  mythic: 5,
  legendary: 6,
};

const rarityColors: Record<string, string> = {
  common: "border-slate-500 text-slate-300",
  uncommon: "border-emerald-500 text-emerald-300",
  rare: "border-blue-500 text-blue-300",
  epic: "border-purple-500 text-purple-300",
  mythic: "border-orange-500 text-orange-300",
  legendary: "border-yellow-500 text-yellow-300",
};

const rarityBg: Record<string, string> = {
  common: "bg-slate-800",
  uncommon: "bg-emerald-900/30",
  rare: "bg-blue-900/30",
  epic: "bg-purple-900/30",
  mythic: "bg-orange-900/30",
  legendary: "bg-yellow-900/30",
};

const slotLabels: Record<string, string> = {
  weapon: "Arma",
  armor: "Armadura",
  helmet: "Casco",
  boots: "Botas",
  gloves: "Guantes",
  ring: "Anillo",
  amulet: "Amuleto",
};

function weightedRandom(items: { item: EquipmentItem; weight: number }[]) {
  const total = items.reduce((acc, i) => acc + i.weight, 0);
  let roll = Math.random() * total;
  for (const i of items) {
    roll -= i.weight;
    if (roll <= 0) return i.item;
  }
  return items[items.length - 1]?.item || null;
}

export default function CofresPage() {
  const boxes: Box[] = useMemo(() => boxesData.boxes || [], []);
  const [selectedBoxCode, setSelectedBoxCode] = useState<string>(boxes[0]?.code || "");
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [simResults, setSimResults] = useState<Record<string, { item: EquipmentItem; count: number }[]>>({});
  const [simCount, setSimCount] = useState(100);
  const [editableProbs, setEditableProbs] = useState<Record<string, Record<string, number | undefined>>>(() => {
    const init: Record<string, Record<string, number | undefined>> = {};
    boxes.forEach((b) => (init[b.code] = { ...b.estimated_probabilities }));
    return init;
  });

  const selectedBox = useMemo(
    () => boxes.find((b) => b.code === selectedBoxCode) || boxes[0],
    [boxes, selectedBoxCode]
  );

  const allEquipmentRarities = useMemo(
    () => Array.from(new Set(boxes.flatMap((b) => b.equipment_rarities))).sort((a, b) => rarityOrder[a] - rarityOrder[b]),
    [boxes]
  );

  const allSlots = useMemo(
    () => Array.from(new Set(selectedBox?.equipment_items.map((i) => i.item_type) || [])).sort(),
    [selectedBox]
  );

  const filteredItems = useMemo(() => {
    if (!selectedBox) return [];
    return selectedBox.equipment_items
      .filter((i) => {
        const matchesSearch =
          i.item_name.toLowerCase().includes(search.toLowerCase()) ||
          i.item_code.toLowerCase().includes(search.toLowerCase());
        const matchesRarity = rarityFilter === "all" || i.rarity === rarityFilter;
        const matchesSlot = slotFilter === "all" || i.item_type === slotFilter;
        return matchesSearch && matchesRarity && matchesSlot;
      })
      .sort((a, b) => a.level_req - b.level_req || a.price - b.price);
  }, [selectedBox, search, rarityFilter, slotFilter]);

  const runSimulation = (box: Box) => {
    const probs = editableProbs[box.code] || box.estimated_probabilities;
    const weights: { item: EquipmentItem; weight: number }[] = [];
    box.equipment_items.forEach((item) => {
      const p = probs[item.rarity] || probs["materials"] || 0;
      if (p > 0) weights.push({ item, weight: p });
    });
    if (weights.length === 0) return;

    const counts = new Map<number, { item: EquipmentItem; count: number }>();
    for (let i = 0; i < simCount; i++) {
      const rolled = weightedRandom(weights);
      if (!rolled) continue;
      const existing = counts.get(rolled.catalog_id);
      if (existing) existing.count++;
      else counts.set(rolled.catalog_id, { item: rolled, count: 1 });
    }
    const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    setSimResults((prev) => ({ ...prev, [box.code]: sorted }));
  };

  const updateProb = (boxCode: string, key: string, value: string) => {
    const num = value === "" ? 0 : Number(value);
    setEditableProbs((prev) => ({
      ...prev,
      [boxCode]: { ...prev[boxCode], [key]: Math.max(0, num) },
    }));
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent">
              📦 Cofres de Eldoria
            </h1>
            <p className="text-slate-400 mt-1">Fuentes de cofres y posible equipo según rareza</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg transition">
              🗺️ Zonas
            </Link>
            <Link href="/equipamiento" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition">
              ⚔️ Equipamiento
            </Link>
            <Link href="/oro" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition">
              💰 Oro
            </Link>
          </div>
        </div>

        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 mt-4">
          <p className="text-sm text-amber-200/80">
            <strong className="text-amber-400">⚠️ Datos estimados:</strong> Los contenidos exactos de los cofres no están disponibles públicamente
            (requieren autenticación en <code className="bg-slate-950 px-1 rounded">/inventory/box-contents</code>). Las probabilidades mostradas
            son aproximaciones basadas en la rareza del cofre y el equipo del juego. Ajusta los porcentajes en el simulador si conoces los valores reales.
          </p>
        </div>
      </header>

      {/* Box selector */}
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {boxes.map((b) => (
            <button
              key={b.code}
              onClick={() => {
                setSelectedBoxCode(b.code);
                setSearch("");
                setRarityFilter("all");
                setSlotFilter("all");
              }}
              className={`text-left p-4 rounded-2xl border transition ${
                selectedBox?.code === b.code
                  ? `${rarityColors[b.rarity]} ${rarityBg[b.rarity]} bg-opacity-50 border-current shadow-lg`
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-100">{b.name}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-950/50 border border-current">
                  {b.rarity}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{b.description}</p>
              <p className="text-xs text-slate-500 mt-2">{b.equipment_count} items posibles · {b.sources.length} fuentes</p>
            </button>
          ))}
        </div>
      </section>

      {selectedBox && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: sources + simulator */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5">
              <h2 className="text-xl font-bold text-slate-100 mb-4">🎯 ¿Dónde conseguir {selectedBox.name}?</h2>
              {selectedBox.sources.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay fuentes conocidas en la data pública.</p>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                  {selectedBox.sources.map((s, idx) => (
                    <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{s.monster_name}</span>
                        {s.monster_is_boss ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800">BOSS</span>
                        ) : null}
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        {s.zone_name} · Nv {s.monster_level}
                      </p>
                      <div className="mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            s.guaranteed
                              ? "bg-emerald-900/30 text-emerald-300 border-emerald-800"
                              : "bg-gold-900/30 text-gold-300 border-gold-700"
                          }`}
                        >
                          {s.guaranteed ? "Garantizado" : `Chance ${s.chance}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Simulator */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5">
              <h2 className="text-xl font-bold text-slate-100 mb-3">🎲 Simulador de apertura</h2>
              <p className="text-xs text-slate-500 mb-4">
                Edita los pesos por rareza y simula abrir {selectedBox.name}. Los resultados se calculan solo en tu navegador.
              </p>

              <div className="space-y-2 mb-4">
                {Object.entries(editableProbs[selectedBox.code] || selectedBox.estimated_probabilities).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 w-24 capitalize">{key === "materials" ? "Materiales" : key}</label>
                    <input
                      type="number"
                      min={0}
                      value={val ?? 0}
                      onChange={(e) => updateProb(selectedBox.code, key, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold-500"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs text-slate-400">Aperturas</label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={simCount}
                  onChange={(e) => setSimCount(Number(e.target.value))}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold-500"
                />
                <button
                  onClick={() => runSimulation(selectedBox)}
                  className="flex-1 py-2 bg-gold-600 hover:bg-gold-500 text-slate-950 font-bold rounded-lg transition"
                >
                  Simular
                </button>
              </div>

              {simResults[selectedBox.code] && (
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {simResults[selectedBox.code].slice(0, 20).map(({ item, count }) => (
                    <div key={item.catalog_id} className="flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2 text-sm">
                      <span className={`${rarityColors[item.rarity].split(" ")[1]}`}>{item.item_name}</span>
                      <span className="text-xs text-slate-500">{count} ({((count / simCount) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                  {simResults[selectedBox.code].length === 0 && (
                    <p className="text-xs text-slate-500">Ningún item equipable salió en la simulación (probabilidades muy bajas o solo materiales).</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: equipment contents */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-100">
                  ⚔️ Posible equipo en {selectedBox.name}
                </h2>
                <span className="text-sm text-slate-500">{filteredItems.length} items</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Buscar item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
                />
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
                >
                  <option value="all">Todas las rarezas</option>
                  {allEquipmentRarities.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
                >
                  <option value="all">Todos los slots</option>
                  {allSlots.map((s) => (
                    <option key={s} value={s}>
                      {slotLabels[s] || s}
                    </option>
                  ))}
                </select>
              </div>

              {filteredItems.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay items que coincidan con los filtros.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredItems.map((item) => (
                    <div
                      key={item.catalog_id}
                      className={`rounded-xl border p-3 transition ${rarityColors[item.rarity] || rarityColors.common} ${
                        rarityBg[item.rarity] || rarityBg.common
                      } bg-opacity-20 hover:bg-opacity-40`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{item.item_name}</h4>
                          <p className="text-[10px] text-slate-500">{item.item_code}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/50 border border-current uppercase font-bold">
                          {item.rarity}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/50 text-slate-300 border border-slate-700">
                          {slotLabels[item.item_type] || item.item_type}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/50 text-slate-300 border border-slate-700">
                          Nv req {item.level_req}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/50 text-gold-300 border border-gold-700">
                          {item.price.toLocaleString()} gems
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
