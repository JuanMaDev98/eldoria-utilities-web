"use client";

import { useMemo, useState } from "react";
import shopData from "@/public/official_shop.json";
import Link from "next/link";

interface ShopItem {
  catalog_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  rarity: string;
  item_type: string;
  subtype?: string | null;
  level_req: number;
  price: number;
  currency: string;
  stock: number;
  description?: string | null;
  icon?: string | null;
  bonus_strength: number;
  bonus_agility: number;
  bonus_intelligence: number;
  bonus_vitality: number;
  bonus_attack: number;
  bonus_spell_attack: number;
  bonus_defense: number;
  bonus_magic_def: number;
  bonus_hp: number;
  bonus_mp: number;
  bonus_crit: string;
  bonus_dodge: string;
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
  common: "border-slate-600 text-slate-300",
  uncommon: "border-emerald-600 text-emerald-300",
  rare: "border-blue-600 text-blue-300",
  epic: "border-purple-600 text-purple-300",
  mythic: "border-orange-600 text-orange-300",
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

function statLine(label: string, value: number | string) {
  const v = typeof value === "string" ? parseFloat(value) : value;
  if (!v) return null;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
      {label} +{value}
    </span>
  );
}

export default function EquipmentPage() {
  const items: ShopItem[] = useMemo(() => shopData.items || [], []);
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<"level" | "price" | "rarity">("level");
  const [expanded, setExpanded] = useState<number | null>(null);

  const slots = useMemo(() => {
    const set = new Set(items.map((i) => i.item_type));
    return Array.from(set).sort();
  }, [items]);

  const rarities = useMemo(() => {
    const set = new Set(items.map((i) => i.rarity));
    return Array.from(set).sort((a, b) => (rarityOrder[a] || 0) - (rarityOrder[b] || 0));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      const matchesSearch =
        i.item_name.toLowerCase().includes(search.toLowerCase()) ||
        i.item_code.toLowerCase().includes(search.toLowerCase());
      const matchesSlot = slotFilter === "all" || i.item_type === slotFilter;
      const matchesRarity = rarityFilter === "all" || i.rarity === rarityFilter;
      const matchesLevel = maxLevel === "" || i.level_req <= maxLevel;
      return matchesSearch && matchesSlot && matchesRarity && matchesLevel;
    });

    list.sort((a, b) => {
      if (sortBy === "level") return a.level_req - b.level_req || b.price - a.price;
      if (sortBy === "price") return b.price - a.price || a.level_req - b.level_req;
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0) || a.level_req - b.level_req;
    });
    return list;
  }, [items, search, slotFilter, rarityFilter, maxLevel, sortBy]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent">
              ⚔️ Eldoria Equipamiento
            </h1>
            <p className="text-slate-400 mt-1">Catálogo de armas, armaduras y accesorios con sus stats y fuentes</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg transition"
            >
              🗺️ Zonas
            </Link>
            <Link
              href="/loot"
              className="px-4 py-2 bg-gold-600 hover:bg-amber-500 text-slate-950 font-semibold rounded-lg transition"
            >
              🎒 Loot
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4">
          <input
            type="text"
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todos los slots</option>
            {slots.map((s) => (
              <option key={s} value={s}>
                {slotLabels[s] || s}
              </option>
            ))}
          </select>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todas las rarezas</option>
            {rarities.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Nivel máx"
            value={maxLevel}
            onChange={(e) => setMaxLevel(e.target.value === "" ? "" : Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-gold-500"
          >
            <option value="level">Ordenar por nivel</option>
            <option value="price">Ordenar por precio</option>
            <option value="rarity">Ordenar por rareza</option>
          </select>
        </div>
      </header>

      {/* Sources explanation */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-100 mb-3">🛒 ¿Cómo se consigue el equipamiento?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-400">
          <div>
            <strong className="text-gold-400">Tienda Oficial (NPC)</strong>
            <p>Armas, armaduras y accesorios de nivel bajo/medio se compran con gemas. Es la fuente más directa y confiable.</p>
          </div>
          <div>
            <strong className="text-gold-400">Cofres (boxes)</strong>
            <p>box_common, box_uncommon, box_rare, box_mythic pueden contener equipo. Abrirlos es la principal fuente de items de rareza alta.</p>
          </div>
          <div>
            <strong className="text-gold-400">Bazar / Mercado P2P</strong>
            <p>Jugadores venden equipo entre sí usando gemas. Precios variables según oferta y demanda.</p>
          </div>
          <div>
            <strong className="text-gold-400">Ofertas diarias y packs</strong>
            <p>Daily deals, featured items y packs de temporada rotan equipo épicos/legendarios con descuento.</p>
          </div>
        </div>
      </section>

      {/* Results count */}
      <p className="text-slate-500 text-sm mb-3">
        Mostrando {filtered.length} de {items.length} items
      </p>

      {/* Equipment grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const isOpen = expanded === item.catalog_id;
          return (
            <div
              key={item.catalog_id}
              className={`rounded-2xl border p-4 transition ${rarityColors[item.rarity] || rarityColors.common} ${
                rarityBg[item.rarity] || rarityBg.common
              } bg-opacity-30 hover:bg-opacity-50`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">{item.item_name}</h3>
                  <p className="text-xs text-slate-500">{item.item_code}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/50 border border-current uppercase font-bold">
                  {item.rarity}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/50 text-slate-300 border border-slate-700">
                  {slotLabels[item.item_type] || item.item_type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/50 text-slate-300 border border-slate-700">
                  Nv req {item.level_req}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/50 text-gold-300 border border-gold-700">
                  {item.price.toLocaleString()} {item.currency}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {statLine("ATK", item.bonus_attack)}
                {statLine("MAG", item.bonus_spell_attack)}
                {statLine("DEF", item.bonus_defense)}
                {statLine("MDEF", item.bonus_magic_def)}
                {statLine("HP", item.bonus_hp)}
                {statLine("MP", item.bonus_mp)}
                {statLine("STR", item.bonus_strength)}
                {statLine("AGI", item.bonus_agility)}
                {statLine("INT", item.bonus_intelligence)}
                {statLine("VIT", item.bonus_vitality)}
                {parseFloat(item.bonus_crit) > 0 && statLine("Crit", item.bonus_crit + "%")}
                {parseFloat(item.bonus_dodge) > 0 && statLine("Dodge", item.bonus_dodge + "%")}
              </div>

              {item.description && <p className="text-xs text-slate-400 italic mb-2">{item.description}</p>}

              <button
                onClick={() => setExpanded(isOpen ? null : item.catalog_id)}
                className="text-xs text-gold-400 hover:text-gold-300 font-semibold"
              >
                {isOpen ? "Ocultar stats" : "Ver stats completos"}
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400 space-y-1">
                  <p><strong>Fuente:</strong> Tienda Oficial (NPC)</p>
                  <p><strong>Stock:</strong> {item.stock}</p>
                  <p><strong>Subtipo:</strong> {item.subtype || "-"}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <span>STR: {item.bonus_strength}</span>
                    <span>AGI: {item.bonus_agility}</span>
                    <span>INT: {item.bonus_intelligence}</span>
                    <span>VIT: {item.bonus_vitality}</span>
                    <span>ATK: {item.bonus_attack}</span>
                    <span>MAG: {item.bonus_spell_attack}</span>
                    <span>DEF: {item.bonus_defense}</span>
                    <span>MDEF: {item.bonus_magic_def}</span>
                    <span>HP: {item.bonus_hp}</span>
                    <span>MP: {item.bonus_mp}</span>
                    <span>Crit: {item.bonus_crit}%</span>
                    <span>Dodge: {item.bonus_dodge}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No se encontraron items con esos filtros.
        </div>
      )}
    </main>
  );
}
