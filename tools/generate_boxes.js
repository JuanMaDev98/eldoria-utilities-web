const fs = require('fs');

const zones = JSON.parse(fs.readFileSync('D:\\Work\\eldoria-zones-ui\\public\\eldoria_zones_with_loot.json'));
const shop = JSON.parse(fs.readFileSync('D:\\Work\\eldoria-zones-ui\\public\\official_shop.json'));

const boxDefs = [
  { code: 'box_common', name: 'Cofre Común', rarity: 'common', desc: 'Cofre básico. Mayormente materiales, consumibles y una pequeña probabilidad de equipo inusual.' },
  { code: 'box_common_special', name: 'Cofre Común Especial', rarity: 'uncommon', desc: 'Variante mejorada del cofre común. Tiende a incluir equipo inusual y algunos materiales.' },
  { code: 'box_uncommon', name: 'Cofre Inusual', rarity: 'uncommon', desc: 'Cofre de rareza inusual. Equipo inusual/raro y materiales de calidad media.' },
  { code: 'box_rare', name: 'Cofre Raro', rarity: 'rare', desc: 'Cofre valioso. Buenas probabilidades de equipo raro, épico y ocasional legendario.' },
  { code: 'box_mythic', name: 'Cofre Mítico', rarity: 'mythic', desc: 'Cofre de élite. Alta probabilidad de equipo épico, mítico y legendario.' },
];

// Map each box to equipment rarities it may contain (heuristic)
const boxToEquipRarities = {
  box_common: ['uncommon'],
  box_common_special: ['uncommon'],
  box_uncommon: ['uncommon', 'rare'],
  box_rare: ['rare', 'epic', 'legendary'],
  box_mythic: ['epic', 'mythic', 'legendary'],
};

// Default assumed probabilities for simulator (users can edit)
const defaultProbabilities = {
  box_common: { uncommon: 20, materials: 80 },
  box_common_special: { uncommon: 40, materials: 60 },
  box_uncommon: { uncommon: 50, rare: 40, materials: 10 },
  box_rare: { rare: 50, epic: 35, legendary: 15 },
  box_mythic: { epic: 35, mythic: 40, legendary: 25 },
};

// Collect sources
const sources = {};
boxDefs.forEach(b => sources[b.code] = []);
zones.zones.forEach(z => {
  z.monsters.forEach(m => {
    [...m.guaranteed_drops, ...m.chance_drops].forEach(d => {
      if (sources[d.item]) {
        sources[d.item].push({
          zone_id: z.id,
          zone_name: z.name,
          zone_min_level: z.min_level,
          zone_max_level: z.max_level,
          monster_id: m.id,
          monster_name: m.name,
          monster_level: m.level,
          monster_is_boss: m.is_boss,
          chance: d.chance || 100,
          guaranteed: d.chance === undefined || d.chance === null,
        });
      }
    });
  });
});

// Equipment items by rarity
const equipment = shop.items.filter(i => !['consumable', 'material'].includes(i.item_type));
const equipmentByRarity = {};
equipment.forEach(i => {
  equipmentByRarity[i.rarity] = equipmentByRarity[i.rarity] || [];
  equipmentByRarity[i.rarity].push({
    catalog_id: i.catalog_id,
    item_code: i.item_code,
    item_name: i.item_name,
    item_type: i.item_type,
    rarity: i.rarity,
    level_req: i.level_req,
    price: i.price,
  });
});

const boxes = boxDefs.map(b => ({
  code: b.code,
  name: b.name,
  rarity: b.rarity,
  description: b.desc,
  sources: sources[b.code].sort((a, b) => b.chance - a.chance || a.monster_level - b.monster_level),
  equipment_rarities: boxToEquipRarities[b.code],
  equipment_count: boxToEquipRarities[b.code].reduce((acc, r) => acc + (equipmentByRarity[r]?.length || 0), 0),
  equipment_items: boxToEquipRarities[b.code].flatMap(r => equipmentByRarity[r] || []),
  estimated_probabilities: defaultProbabilities[b.code],
}));

fs.writeFileSync('D:\\Work\\eldoria-zones-ui\\public\\boxes.json', JSON.stringify({ boxes, generated_at: new Date().toISOString(), disclaimer: 'Probabilidades y contenido de cofres estimados. Los datos exactos requieren endpoint /inventory/box-contents autenticado.' }, null, 2));
console.log('Generated public/boxes.json with', boxes.length, 'boxes');
boxes.forEach(b => console.log(b.code, 'sources:', b.sources.length, 'equipment:', b.equipment_count));
