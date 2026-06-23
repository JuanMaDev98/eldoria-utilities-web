#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fusiona los datos de zonas de la API (eldoria_zones.json) con las tablas de loot
más completas de wiki_reference.json para enriquecer el atlas de loot.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI_REF = Path("D:/Work/eldoria/akuma/memory/games/eldoria/wiki_reference.json")
ZONES_API = ROOT / "public" / "eldoria_zones.json"
OUT = ROOT / "public" / "eldoria_zones_with_loot.json"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


api = load_json(ZONES_API)
ref = load_json(WIKI_REF)

# Construir mapa de monstruos desde wiki_reference
wiki_monsters = {}
for src in [ref.get("top_monsters_by_xp_per_stamina", []), *ref.get("best_monsters_by_level", {}).values()]:
    for m in src:
        if m["code"] not in wiki_monsters:
            wiki_monsters[m["code"]] = m

# Normalizar loot de wiki_reference
def parse_loot_table(raw):
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if not isinstance(raw, str):
        return []
    raw = raw.strip()
    if not raw or raw == "[]":
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


def normalize_loot_entries(code):
    m = wiki_monsters.get(code, {})
    table = parse_loot_table(m.get("loot_table"))
    out = []
    for entry in table:
        if not isinstance(entry, dict):
            continue
        if "drops" in entry and isinstance(entry["drops"], list):
            drops = entry["drops"]
            total_weight = sum((d.get("weight", 1) or 1) for d in drops)
            for d in drops:
                w = d.get("weight", 1) or 1
                chance = (w / total_weight * 100) if total_weight else 0
                out.append({
                    "item": d.get("code", "?"),
                    "qty": d.get("qty", 1),
                    "chance": round(chance, 2),
                    "name": d.get("code", "?"),
                    "name_en": None,
                    "rarity": "common",
                    "item_type": "material",
                })
        elif "item" in entry:
            chance = entry.get("chance", 0)
            out.append({
                "item": entry.get("item", "?"),
                "qty": entry.get("qty", 1) or 1,
                "chance": round(chance, 2),
                "name": entry.get("item", "?"),
                "name_en": None,
                "rarity": "common",
                "item_type": "material",
            })
    return out


ITEM_TYPES = {
    "carbon": "material", "iron_ore": "material", "mithril_ore": "material",
    "amethyst_quartz": "material", "dragon_scale": "material",
    "herb_common": "material", "herb_rare": "material",
    "potion_mana": "consumable", "potion_minor": "consumable", "potion_major": "consumable",
    "potion_supreme": "consumable", "potion_stam_20": "consumable", "potion_stam_50": "consumable",
    "potion_stam_max": "consumable", "potion_mana_major": "consumable",
    "box_common": "box", "box_uncommon": "box", "box_rare": "box", "box_mythic": "box",
    "box_common_special": "box",
    "race_random_common_low": "race",
}

ITEM_NAMES = {
    "carbon": "Carbón", "iron_ore": "Mineral de Hierro", "mithril_ore": "Mineral de Mitril",
    "amethyst_quartz": "Cuarzo Amatista", "dragon_scale": "Dragon Scale",
    "herb_common": "Hierba Común", "herb_rare": "Hierba Rara",
    "potion_mana": "Poción de Mana", "potion_minor": "Poción Menor", "potion_major": "Poción Mayor",
    "potion_supreme": "Poción Suprema", "potion_stam_20": "Poción de Stamina 20",
    "potion_stam_50": "Poción de Stamina 50", "potion_stam_max": "Poción de Stamina Max",
    "potion_mana_major": "Poción de Mana Mayor",
    "box_common": "Cofre Común", "box_uncommon": "Cofre Inusual", "box_rare": "Cofre Raro",
    "box_mythic": "Cofre Mítico", "box_common_special": "Cofre Común Especial",
    "race_random_common_low": "Equipo de Raza Común",
}

ITEM_RARITY = {
    "box_common": "common", "box_uncommon": "uncommon", "box_rare": "rare",
    "box_mythic": "mythic", "box_common_special": "uncommon",
    "potion_supreme": "rare", "potion_stam_max": "epic", "potion_stam_50": "rare",
    "potion_mana_major": "uncommon", "potion_major": "uncommon",
    "dragon_scale": "mythic", "amethyst_quartz": "rare", "mithril_ore": "uncommon",
    "herb_rare": "rare",
}


def enrich_drop(d):
    item = d["item"]
    d["name"] = ITEM_NAMES.get(item, d.get("name", item))
    d["item_type"] = ITEM_TYPES.get(item, d.get("item_type", "material"))
    d["rarity"] = ITEM_RARITY.get(item, d.get("rarity", "common"))
    return d


# Fusionar
for zone in api["zones"]:
    for m in zone["monsters"]:
        code = m["code"]
        # Si la API no tiene chance_drops o están vacíos, usar wiki
        if not m.get("chance_drops") and code in wiki_monsters:
            wiki_loot = normalize_loot_entries(code)
            if wiki_loot:
                m["chance_drops"] = [enrich_drop(d) for d in wiki_loot]
        # Añadir respawn_seconds desde wiki si no existe
        if "respawn_seconds" not in m and code in wiki_monsters:
            m["respawn_seconds"] = wiki_monsters[code].get("respawn_seconds", 60)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(api, f, ensure_ascii=False, indent=2)

print(f"Guardado: {OUT}")
print(f"Zonas: {len(api['zones'])}")
print(f"Monstruos con loot API: {sum(1 for z in api['zones'] for m in z['monsters'] if m.get('chance_drops'))}")
