const fs = require('fs');

const zones = JSON.parse(fs.readFileSync('D:\\Work\\eldoria-zones-ui\\public\\eldoria_zones_with_loot.json'));
const ref = JSON.parse(fs.readFileSync('D:\\Work\\eldoria\\akuma\\memory\\games\\eldoria\\wiki_reference.json'));
const prices = ref.items_sell_prices || {};

const reqMap = {
  common: ['común', 'common'],
  uncommon: ['inusual', 'uncommon'],
  rare: ['raro', 'rare'],
  epic: ['épico', 'epic'],
  legendary: ['legendario', 'legendary'],
  mythic: ['mítico', 'mythic'],
};

function extractItemRequirement(desc) {
  if (!desc) return null;
  for (const [rarity, terms] of Object.entries(reqMap)) {
    const regex = new RegExp(`item ${terms.join('|')}`, 'i');
    if (regex.test(desc)) return rarity;
  }
  return null;
}

function expectedDropGold(m) {
  let total = 0;
  const details = [];
  [...m.guaranteed_drops, ...m.chance_drops].forEach(d => {
    const price = prices[d.item] || 0;
    const expected = d.chance ? (d.chance / 100) * price * d.qty : price * d.qty;
    total += expected;
    if (price > 0 && expected > 0.5) {
      details.push({
        item: d.item,
        name: d.name,
        qty: d.qty,
        chance: d.chance,
        price,
        expected,
        rarity: d.rarity,
      });
    }
  });
  return { total, details: details.sort((a, b) => b.expected - a.expected) };
}

const mobs = [];
zones.zones.forEach(z => {
  const req = extractItemRequirement(z.description);
  const isColiseum = z.code === 'coliseum';
  const isTraining = z.code === 'training_area';
  const isArena = z.code === 'blood_arena';
  const limitedMob = z.description?.includes('15 veces');

  z.monsters.forEach(m => {
    if (!m.stamina_cost || m.stamina_cost <= 0) return;
    if (isColiseum || isTraining || isArena) return;
    const avgGold = (m.gold_min + m.gold_max) / 2;
    const { total: dropGold, details } = expectedDropGold(m);
    const totalGold = avgGold + dropGold;
    const goldPerStam = totalGold / m.stamina_cost;
    const baseGoldPerStam = avgGold / m.stamina_cost;

    mobs.push({
      zone_id: z.id,
      zone_code: z.code,
      zone_name: z.name,
      zone_min_level: z.min_level,
      zone_max_level: z.max_level,
      zone_danger: z.danger,
      zone_req_item_rarity: req,
      limited_daily: limitedMob,
      monster_id: m.id,
      monster_code: m.code,
      monster_name: m.name,
      monster_level: m.level,
      stamina_cost: m.stamina_cost,
      hp_max: m.hp_max,
      attack: m.attack,
      defense: m.defense,
      dodge: m.dodge,
      spell_resist: m.spell_resist,
      is_boss: m.is_boss,
      base_gold_avg: avgGold,
      drop_gold_expected: dropGold,
      total_gold_expected: totalGold,
      base_gold_per_stam: baseGoldPerStam,
      total_gold_per_stam: goldPerStam,
      top_drops: details.slice(0, 5),
    });
  });
});

// Add viability score (rough estimate based on mob stats vs typical lvl 21)
// Using default sim stats as baseline: hp 740, atk 67, def 43, int 53
function viabilityScore(m) {
  const playerHp = 740;
  const playerAtk = 67;
  const playerDef = 43;
  const playerInt = 53;
  const magicDmg = Math.max(1, Math.floor(playerInt * 4.2 - m.spell_resist * 4));
  const physDmg = Math.max(1, Math.floor(playerAtk - m.defense));
  const bestDmg = Math.max(magicDmg, physDmg);
  const mobDmg = Math.max(1, Math.floor(m.attack - playerDef));
  const turnsToKill = Math.ceil(m.hp_max / bestDmg);
  const turnsToDie = Math.ceil(playerHp / mobDmg);
  if (turnsToDie > turnsToKill * 2) return 'high';
  if (turnsToDie > turnsToKill) return 'medium';
  return 'low';
}

mobs.forEach(m => {
  m.viability_default = viabilityScore(m);
});

mobs.sort((a, b) => b.total_gold_per_stam - a.total_gold_per_stam);

const result = {
  generated_at: new Date().toISOString(),
  disclaimer: 'Los valores de drops usan precios de venta a NPC. Las probabilidades exactas pueden variar. La viabilidad es una estimación con stats base de nivel 21.',
  daily_caps: {
    pve_kills: 500,
    limited_mob_fights: 15,
  },
  skill_tree_for_gold: [
    { code: 'm_gold1', name: 'Manos de Oro', branch: 'merchant', effect: '+0.5% oro de monstruos/nivel, max 5' },
    { code: 'm_gold2', name: 'Avaricia', branch: 'merchant', effect: '+1% oro de monstruos/nivel, max 5 (requiere m_claim1 lvl 3)' },
    { code: 'e_stam1', name: 'Aliento Profundo', branch: 'explorer', effect: '+2 stamina máx/nivel' },
    { code: 'e_stam2', name: 'Resistencia Atlética', branch: 'explorer', effect: '+8 stamina máx/nivel' },
    { code: 'e_stam_cost1', name: 'Eficiencia', branch: 'explorer', effect: '-1% costo stamina PvE/nivel' },
    { code: 'e_stam_regen1', name: 'Segundo Aliento', branch: 'explorer', effect: '+3% regen stamina/nivel' },
    { code: 'e_loot1', name: 'Ojo de Águila', branch: 'explorer', effect: '+0.5% chance de loot/nivel' },
  ],
  mobs,
};

fs.writeFileSync('D:\\Work\\eldoria-zones-ui\\public\\gold_farm.json', JSON.stringify(result, null, 2));
console.log('Generated gold_farm.json with', mobs.length, 'mobs');
console.log('Top 5 total gold/stam:');
mobs.slice(0, 5).forEach(m => console.log(m.monster_name, m.zone_name, m.total_gold_per_stam.toFixed(1), 'g/stam'));
