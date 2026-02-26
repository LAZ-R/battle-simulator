import { formatNumber, getRandomIntegerBetween } from "../utils/math.utils.js";

export const COLORS = [
  { id: 'cyan',     hsl: 'hsl(180, 70%,  60%)', filter: 'brightness(0) saturate(100%) invert(76%) sepia(89%) saturate(303%) hue-rotate(122deg) brightness(90%) contrast(94%)', },
  { id: 'magenta',  hsl: 'hsl(300, 80%,  70%)', filter: 'brightness(0) saturate(100%) invert(62%) sepia(95%) saturate(1169%) hue-rotate(255deg) brightness(98%) contrast(91%)', },
  { id: 'yellow',   hsl: 'hsl(60,  70%,  60%)', filter: 'brightness(0) saturate(100%) invert(84%) sepia(73%) saturate(418%) hue-rotate(1deg) brightness(96%) contrast(84%)', },
  
  { id: 'mint',     hsl: 'hsl(150, 50%,  70%)', filter: 'brightness(0) saturate(100%) invert(86%) sepia(28%) saturate(433%) hue-rotate(91deg) brightness(89%) contrast(92%)', },
  { id: 'lavender', hsl: 'hsl(270, 80%,  80%)', filter: 'brightness(0) saturate(100%) invert(69%) sepia(7%) saturate(2434%) hue-rotate(223deg) brightness(103%) contrast(92%)', },
  { id: 'peach',    hsl: 'hsl(30,  80%,  70%)', filter: 'brightness(0) saturate(100%) invert(84%) sepia(91%) saturate(3386%) hue-rotate(305deg) brightness(100%) contrast(89%)', },
];
export const SHIELDS = [
  { id: 'shield-A' },
  { id: 'shield-B' },
  { id: 'shield-C' },
];
export const ICONS = [
  { id: 'icon-A' },
  { id: 'icon-B' },
  { id: 'icon-C' },
];

/* 
Règles finales

Phase 1. L’attaquant choisit librement ses groupes attaquants.
entre 0 et 8

ex: 
Attaquants
  A: 1200 lanciers
  B: 800 archers
  C: 300 cavaliers

Phase 2. Le défenseur assigne des bloqueurs.
Tous les attaquants doivent être “au contact” (donc bloqués), sinon on ne passe pas à la phase 3
Comme mtg, 1 bloqueur = 1 attaquant, mais tu peux bloquer le même attaquant avec plusieurs bloqueurs
Chaque groupe défenseur ne peut être assigné qu’à un seul attaquant.

Si groupsB.length < 8, tu peux "split" un groupe en 2 groupes de taille égale (dans la limite des unités disponibles, et seulement jusqu'à 8 groupes au total)
Le split devient un équivalent “je couvre plus de terrain”, mais avec une contrepartie naturelle : chaque demi-groupe est plus faible.

ex:
Défense 
  X bloque A
  Y + Z bloquent B
  W bloque C

Phase 3. Résolution par "couple de combat"

Pour chaque attaquant :
  si groupA_atk > group(s)B_def, groupA pert 25% de ses unités et group(s)B meurt. 
  si groupA_atk <= group(s)B_def, groupA pert 50% de ses unités et group(s)B pert 25% de ses unités.
*/

export let player1 = {
  id: 'player1',
  color: COLORS[0].hsl,
  shield: 'shield-A',
  icon: 'icon-A',
  groups: [],
}

export let player2 = {
  id: 'player2',
  color: COLORS[1].hsl,
  shield: 'shield-B',
  icon: 'icon-B',
  groups: [],
}

const RAW_GROUPS = [
   // Attaque == 1
   { id: '01', base_atk: 1, base_def: 1, name: "Paysans désarmés" },
   { id: '02', base_atk: 1, base_def: 2, name: "Artisants" },
   { id: '03', base_atk: 1, base_def: 3, name: "Porte-boucliers" },
   { id: '04', base_atk: 1, base_def: 4, name: "Gardes de la cité" },
   { id: '05', base_atk: 1, base_def: 5, name: "Gardes des remparts" },

   // Attaque == 2
   { id: '06', base_atk: 2, base_def: 1, name: "Miliciens légers" },
   { id: '07', base_atk: 2, base_def: 2, name: "Miliciens" },
   { id: '08', base_atk: 2, base_def: 3, name: "Miliciens lourds" },
   { id: '09', base_atk: 2, base_def: 4, name: "Porte-lances" },
   { id: '10', base_atk: 2, base_def: 5, name: "Pavoisiers" },

   // Attaque == 3
   { id: '11', base_atk: 3, base_def: 1, name: "Éclaireurs" },
   { id: '12', base_atk: 3, base_def: 2, name: "Fantassins légers" },
   { id: '13', base_atk: 3, base_def: 3, name: "Fantassins" },
   { id: '14', base_atk: 3, base_def: 4, name: "Fantassins lourds" },
   { id: '15', base_atk: 3, base_def: 5, name: "Piquiers" },

   // Attaque == 4
   { id: '16', base_atk: 4, base_def: 1, name: "Raiders" },
   { id: '17', base_atk: 4, base_def: 2, name: "Archers" },
   { id: '18', base_atk: 4, base_def: 3, name: "Chevaliers légers" },
   { id: '19', base_atk: 4, base_def: 4, name: "Chevaliers" },
   { id: '20', base_atk: 4, base_def: 5, name: "Chevaliers lourds" },

   // Attaque == 5
   { id: '21', base_atk: 5, base_def: 1, name: "Mercenaires" },
   { id: '22', base_atk: 5, base_def: 2, name: "Assassins furtifs" },
   { id: '23', base_atk: 5, base_def: 3, name: "Duellistes" },
   { id: '24', base_atk: 5, base_def: 4, name: "Maîtres d'armes" },
   { id: '25', base_atk: 5, base_def: 5, name: "Élite<br>royale" },
];
let BALANCED_GROUPS = [];

/**
 * 1) On instancie un groupe "jouable" à partir de sa fiche :
 *    - atk/def fixes
 *    - units tirées aléatoirement dans min/max
 */
function createInstancedGroupFromTemplate(groupTemplate) {
  const unitsRolled = getRandomIntegerBetween(groupTemplate.min_units, groupTemplate.max_units);

  return {
    id: groupTemplate.id,
    name: groupTemplate.name,
    atk: groupTemplate.base_atk,
    def: groupTemplate.base_def,
    units: unitsRolled,
  };
}


/**
 * 2) Score "réel" d'un groupe (avec units tirées)
 *    - attackAbsolute = atk * units
 *    - defenseAbsolute = def * units
 */
function getGroupAttackAbsolute(instancedGroup) {
  return instancedGroup.atk * instancedGroup.units;
}

function getGroupDefenseAbsolute(instancedGroup) {
  return instancedGroup.def * instancedGroup.units;
}

/**
 * 3) Tirage de N groupes uniques depuis une liste
 */
function pickUniqueGroupTemplates(groupTemplates, countToPick) {
  const temporaryArray = [...groupTemplates];
  const pickedTemplates = [];

  for (let index = 0; index < countToPick; index++) {
    const randomIndex = getRandomIntegerBetween(0, temporaryArray.length - 1);
    const chosenTemplate = temporaryArray[randomIndex];

    pickedTemplates.push(chosenTemplate);
    temporaryArray.splice(randomIndex, 1);
  }

  return pickedTemplates;
}

/**
 * 4) On calcule les totaux d'un pool (avec units tirées)
 */
function getPoolTotals(instancedGroupsPool) {
  let poolTotalAttackAbsolute = 0;
  let poolTotalDefenseAbsolute = 0;

  for (const instancedGroup of instancedGroupsPool) {
    poolTotalAttackAbsolute += getGroupAttackAbsolute(instancedGroup);
    poolTotalDefenseAbsolute += getGroupDefenseAbsolute(instancedGroup);
  }

  return { poolTotalAttackAbsolute, poolTotalDefenseAbsolute };
}

/**
 * 5) On calcule la "cible globale" en incluant le RNG :
 *    - On simule plein de pools aléatoires 16/25, avec units tirées
 *    - On prend la moyenne des totaux comme cible "neutre"
 *
 * Pourquoi ? Parce que sinon tu n'as pas de référence stable quand les units sont random.
 */
function computeGlobalTargetsWithRandomUnits(groupTemplates, numberOfSimulations = 4000) {
  let sumOfPoolAttackTotals = 0;
  let sumOfPoolDefenseTotals = 0;

  for (let simulationIndex = 0; simulationIndex < numberOfSimulations; simulationIndex++) {
    const pickedTemplates = pickUniqueGroupTemplates(groupTemplates, 16);
    const instancedPool = pickedTemplates.map(createInstancedGroupFromTemplate);

    const { poolTotalAttackAbsolute, poolTotalDefenseAbsolute } = getPoolTotals(instancedPool);

    sumOfPoolAttackTotals += poolTotalAttackAbsolute;
    sumOfPoolDefenseTotals += poolTotalDefenseAbsolute;
  }

  return {
    targetPoolAttackAbsolute: sumOfPoolAttackTotals / numberOfSimulations,
    targetPoolDefenseAbsolute: sumOfPoolDefenseTotals / numberOfSimulations,
  };
}

/**
 * 6) Score d'un pool :
 *    - On veut que le pool soit "neutre" : proche de la cible globale
 *    - Et pas trop déséquilibré attack vs defense (sinon pool trop orienté)
 *
 * Ajuste les poids si besoin, mais ça marche bien en base.
 */
function getPoolNeutralityScore(instancedGroupsPool, globalTargets) {
  const { poolTotalAttackAbsolute, poolTotalDefenseAbsolute } = getPoolTotals(instancedGroupsPool);

  const distanceToGlobalAttackTarget = Math.abs(poolTotalAttackAbsolute - globalTargets.targetPoolAttackAbsolute);
  const distanceToGlobalDefenseTarget = Math.abs(poolTotalDefenseAbsolute - globalTargets.targetPoolDefenseAbsolute);

  const poolOrientationDifference = Math.abs(poolTotalAttackAbsolute - poolTotalDefenseAbsolute);

  // Poids : on privilégie la neutralité globale, puis on évite les pools trop orientés.
  const score =
    distanceToGlobalAttackTarget +
    distanceToGlobalDefenseTarget +
    0.15 * poolOrientationDifference;

  return score;
}

/**
 * 7) Fabrique le "meilleur" pool16 avec RNG inclus
 *    - On essaie plein de tentatives
 *    - Chaque tentative tire 16 groupes + units
 *    - On garde le pool avec le meilleur score
 */
export function createBalancedPool16WithRandomUnits(groupTemplates, {
  numberOfTries = 6000,
  numberOfGlobalTargetSimulations = 4000,
} = {}) {
  const globalTargets = computeGlobalTargetsWithRandomUnits(groupTemplates, numberOfGlobalTargetSimulations);

  let bestInstancedPool = null;
  let bestInstancedPoolScore = Infinity;

  for (let tryIndex = 0; tryIndex < numberOfTries; tryIndex++) {
    const pickedTemplates = pickUniqueGroupTemplates(groupTemplates, 16);
    const instancedPool = pickedTemplates.map(createInstancedGroupFromTemplate);

    const currentScore = getPoolNeutralityScore(instancedPool, globalTargets);

    if (currentScore < bestInstancedPoolScore) {
      bestInstancedPoolScore = currentScore;
      bestInstancedPool = instancedPool;
    }
  }

  return {
    instancedPool16: bestInstancedPool,
    instancedPoolScore: bestInstancedPoolScore,
    globalTargets,
  };
}

/**
 * 8) Split 16 -> 2x8 équilibré en utilisant les values RÉELLES (units tirées)
 *    Objectif : total attackAbs et total defenseAbs proches.
 */
function getTeamTotals(instancedTeamGroups) {
  let teamTotalAttackAbsolute = 0;
  let teamTotalDefenseAbsolute = 0;

  for (const instancedGroup of instancedTeamGroups) {
    teamTotalAttackAbsolute += getGroupAttackAbsolute(instancedGroup);
    teamTotalDefenseAbsolute += getGroupDefenseAbsolute(instancedGroup);
  }

  return { teamTotalAttackAbsolute, teamTotalDefenseAbsolute };
}

export function splitPool16IntoTwoBalancedTeams(instancedPool16) {
  const poolSize = instancedPool16.length; // 16
  if (poolSize !== 16) {
    throw new Error("splitPool16IntoTwoBalancedTeams: le pool doit contenir 16 groupes.");
  }

  let bestMask = 0;
  let bestSplitScore = Infinity;

  // On test toutes les équipes de 8 parmi 16
  for (let mask = 0; mask < (1 << poolSize); mask++) {
    // Compter bits = 8
    let numberOfGroupsInTeamA = 0;
    for (let index = 0; index < poolSize; index++) {
      if (mask & (1 << index)) numberOfGroupsInTeamA++;
    }
    if (numberOfGroupsInTeamA !== 8) continue;

    const teamA = [];
    const teamB = [];

    for (let index = 0; index < poolSize; index++) {
      if (mask & (1 << index)) teamA.push(instancedPool16[index]);
      else teamB.push(instancedPool16[index]);
    }

    const teamATotals = getTeamTotals(teamA);
    const teamBTotals = getTeamTotals(teamB);

    const attackDifference = Math.abs(teamATotals.teamTotalAttackAbsolute - teamBTotals.teamTotalAttackAbsolute);
    const defenseDifference = Math.abs(teamATotals.teamTotalDefenseAbsolute - teamBTotals.teamTotalDefenseAbsolute);

    const splitScore = attackDifference + defenseDifference;

    if (splitScore < bestSplitScore) {
      bestSplitScore = splitScore;
      bestMask = mask;
    }
  }

  const bestTeamA = [];
  const bestTeamB = [];

  for (let index = 0; index < poolSize; index++) {
    if (bestMask & (1 << index)) bestTeamA.push(instancedPool16[index]);
    else bestTeamB.push(instancedPool16[index]);
  }

  return {
    teamA: bestTeamA,
    teamB: bestTeamB,
    bestSplitScore,
  };
}

/**
 * Si les combats durent trop longtemps → monte K (plus d’unités partout).
 * Si ça snowball trop vite → baisse variance (moins de tirages extrêmes).
 * Si les 5/5 restent trop forts → monte bonus (0.6–0.8).
 * @param {*} groups 
 * @param {*} params 
 * @returns 
 */
function getBalancedUnitRanges(groups, params = {
  K: 1500, // was 15k
  bonus: 0.5,
  variance: 0.30,
}) {
  return groups.map(g => {
    const eff = g.base_atk + g.base_def + params.bonus * Math.min(g.base_atk, g.base_def);
    const base = params.K / eff;

    const min_units = Math.max(1, Math.round(base * (1 - params.variance)));
    const max_units = Math.max(min_units, Math.round(base * (1 + params.variance)));

    return { ...g, min_units, max_units };
  });
}

// ////////////////////////////////////////////////////////////////////////////

export function initPlayers() {
  // Préparation des min/max units
  BALANCED_GROUPS = getBalancedUnitRanges(RAW_GROUPS);

  // 1) pool 16 avec units déjà tirées
  const { instancedPool16 } = createBalancedPool16WithRandomUnits(BALANCED_GROUPS, {
    numberOfTries: 6000,
    numberOfGlobalTargetSimulations: 4000,
  });

  // 2) split en 2 équipes équilibrées (avec units réelles)
  const { teamA, teamB } = splitPool16IntoTwoBalancedTeams(instancedPool16);

  // 3) assigner aux joueurs
  player1.groups = teamA;
  player2.groups = teamB;
}

export function setPlayerTopBar(player) {
  document.getElementById(`${player.id}GlobalAtkValue`).innerHTML = getPlayerTotalAtk(player);
  document.getElementById(`${player.id}GlobalUnitsValue`).innerHTML = getPlayerTotalUnitsCount(player);
  document.getElementById(`${player.id}GlobalDefValue`).innerHTML = getPlayerTotalDef(player);
}

export function getPlayerTotalUnitsCount(player) {
  let total = 0;
  for (let group of player.groups) {
    total += group.units;
  }
  return formatNumber(total);
}
export function getPlayerTotalAtk(player) {
  let total = 0;
  for (let group of player.groups) {
    total += (group.atk * group.units);
  }
  return formatNumber(total);
}
export function getPlayerTotalDef(player) {
  let total = 0;
  for (let group of player.groups) {
    total += (group.def * group.units);
  }
  return formatNumber(total);
}