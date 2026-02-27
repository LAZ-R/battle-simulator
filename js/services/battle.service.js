import { APP_ORIGIN } from "../router.js";
import { formatNumber, getRandomIntegerBetween } from "../utils/math.utils.js";
import { setPlayersGameDom } from "../views/homepage/homepage.view.js";
import { getPlayerTotalAtk, getPlayerTotalDef, getPlayerTotalUnitsCount, initPlayers, player1, player2, setPlayerTopBar } from "./player.service.js";

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

let CURRENT_ATTACKING_PLAYER = null;
let CURRENT_DEFENDING_PLAYER = null;
let CURRENT_PHASE = 1;

let splitId = 0;

let currentBattle = {
  attacking: [],
  battles: [],
}

let isBlocking = false;
let selectedBlocker = null;
let assignedDefenders = [];

let arrowColor = '#5c5c5c';

export function startGame() {
  let players = [player1, player2];

  let rndIndex = getRandomIntegerBetween(0, 1);
  CURRENT_ATTACKING_PLAYER = players[rndIndex];
  players.splice(rndIndex, 1);
  CURRENT_DEFENDING_PLAYER = players[0];

  initPlayers();
  setDomForPhase1();
}

function getPlayerGroupsDom(player) {
  let str = '';
  for (let group of player.groups) {
    str += `
    <button id="${group.id}" class="group-block" onclick="onGroupClick('${group.id}')">
      <div>
        <span id="${player.id}${group.id}Units" class="group-units-value">${formatNumber(group.units)}</span>
        <span>unités</span>
      </div>
      
      <span class="group-name">${group.name}</span>

      <div class="group-bottom">
        <img src="${APP_ORIGIN}assets/medias/images/icons/${group.atk}-${group.def}.png" />
        <span class="pt-box">${group.atk}/${group.def}</span>
      </div>
    </button>
    `;
  }
  return str;
}

function setDomForPhase1() {
  // Current attacking player
  const currentAttackingPlayerBottomAreaElement = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}BottomArea`);
  currentAttackingPlayerBottomAreaElement.innerHTML = `<button class="lzr-button lzr-solid" onclick="goToPhase2()">Lancer l'assaut</button>`;
  const currentAttackingPlayerGroupsElement = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}Groups`);
  currentAttackingPlayerGroupsElement.innerHTML = getPlayerGroupsDom(CURRENT_ATTACKING_PLAYER);
  const currentAttackingPlayerContainerElement = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}Container`);
  currentAttackingPlayerContainerElement.classList.add('active');
  setPlayerTopBar(CURRENT_ATTACKING_PLAYER);

  // Current defending player
  const currentDefendingPlayerBottomAreaElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}BottomArea`);
  currentDefendingPlayerBottomAreaElement.innerHTML = ``;
  const currentDefendingPlayerGroupsElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}Groups`);
  currentDefendingPlayerGroupsElement.innerHTML = getPlayerGroupsDom(CURRENT_DEFENDING_PLAYER);
  const currentDefendingPlayerContainerElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}Container`);
  currentDefendingPlayerContainerElement.classList.remove('active');
  setPlayerTopBar(CURRENT_DEFENDING_PLAYER);

  setTimeout(() => {
    
    // renversement des blocks DEF
    for (let group of CURRENT_DEFENDING_PLAYER.groups) {
      let element = document.getElementById(group.id);
      element.classList.toggle('spinned', CURRENT_PHASE == 1);
    }
    let atkDom = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopAtk`);
    atkDom.classList.toggle('spinned', CURRENT_PHASE == 1);
    let unitsDom = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopUnits`);
    unitsDom.classList.toggle('spinned', CURRENT_PHASE == 1);
    let defDom = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopDef`);
    defDom.classList.toggle('spinned', CURRENT_PHASE == 1);
  }, 20);

}

function setDomForPhase2() {
  // Current attacking player
  const currentAttackingPlayerBottomAreaElement = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}BottomArea`);
  currentAttackingPlayerBottomAreaElement.innerHTML = ``;
  const currentAttackingPlayerContainerElement = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}Container`);
  currentAttackingPlayerContainerElement.classList.remove('active');
  setPlayerTopBar(CURRENT_ATTACKING_PLAYER);

  // Current defending player
  const currentDefendingPlayerBottomAreaElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}BottomArea`);
  if (currentBattle.battles.length == 0) {
    currentDefendingPlayerBottomAreaElement.innerHTML = `<button class="lzr-button lzr-solid" onclick="goToPhase3()">Contrer l'offensive</button>`;
  } else {
    currentDefendingPlayerBottomAreaElement.innerHTML = `<span class="keep-blocking">Bloquez toutes les unités ennemies</span>`;
  }
  const currentDefendingPlayerContainerElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}Container`);
  currentDefendingPlayerContainerElement.classList.add('active');
  setPlayerTopBar(CURRENT_DEFENDING_PLAYER);

  // renversement des blocks DEF
  for (let group of CURRENT_DEFENDING_PLAYER.groups) {
    let element = document.getElementById(group.id);
    element.classList.toggle('spinned', CURRENT_PHASE != 2);
  }
  let atkDomDef = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopAtk`);
  atkDomDef.classList.toggle('spinned', CURRENT_PHASE != 2);
  let unitsDomDef = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopUnits`);
  unitsDomDef.classList.toggle('spinned', CURRENT_PHASE != 2);
  let defDom = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopDef`);
  defDom.classList.toggle('spinned', CURRENT_PHASE != 2);

  // renversement des blocks ATK
  for (let group of CURRENT_ATTACKING_PLAYER.groups) {
    let element = document.getElementById(group.id);
    element.classList.toggle('spinned', CURRENT_PHASE == 2);
  }
  let atkDomAtk = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}TopAtk`);
    atkDomAtk.classList.toggle('spinned', CURRENT_PHASE == 2);
  let unitsDomAtk = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}TopUnits`);
    unitsDomAtk.classList.toggle('spinned', CURRENT_PHASE == 2);
  let defDomDef = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}TopDef`);
    defDomDef.classList.toggle('spinned', CURRENT_PHASE == 2);
}

function setDomForPhase3() {
  // Current attacking player
  const currentAttackingPlayerBottomAreaElement = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}BottomArea`);
  currentAttackingPlayerBottomAreaElement.innerHTML = `<button class="lzr-button lzr-solid" onclick="goToNewTurn()">Ok</button>`;
  setPlayerTopBar(CURRENT_ATTACKING_PLAYER);

  // Current defending player
  const currentDefendingPlayerBottomAreaElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}BottomArea`);
  currentDefendingPlayerBottomAreaElement.innerHTML = ``;
  const currentDefendingPlayerContainerElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}Container`);
  currentDefendingPlayerContainerElement.classList.remove('active');
  setPlayerTopBar(CURRENT_DEFENDING_PLAYER);

  // renversement des blocks DEF
  for (let group of CURRENT_DEFENDING_PLAYER.groups) {
    let element = document.getElementById(group.id);
    element.classList.toggle('spinned', CURRENT_PHASE != 3);
  }
  let atkDomDef = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopAtk`);
  atkDomDef.classList.toggle('spinned', CURRENT_PHASE != 3);
  let unitsDomDef = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopUnits`);
  unitsDomDef.classList.toggle('spinned', CURRENT_PHASE != 3);
  let defDom = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}TopDef`);
  defDom.classList.toggle('spinned', CURRENT_PHASE != 3);

  // renversement des blocks ATK
  for (let group of CURRENT_ATTACKING_PLAYER.groups) {
    let element = document.getElementById(group.id);
    element.classList.toggle('spinned', CURRENT_PHASE != 3);
  }
  let atkDomAtk = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}TopAtk`);
    atkDomAtk.classList.toggle('spinned', CURRENT_PHASE != 3);
  let unitsDomAtk = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}TopUnits`);
    unitsDomAtk.classList.toggle('spinned', CURRENT_PHASE != 3);
  let defDomDef = document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}TopDef`);
    defDomDef.classList.toggle('spinned', CURRENT_PHASE != 3);
}

function goToPhase2() {
  CURRENT_PHASE = 2;
  // Do some shit
  for (let attackingGroupsId of currentBattle.attacking) {
    currentBattle.battles.push({attacking: attackingGroupsId, defending: []});
  }
  console.log(currentBattle.battles);
  setDomForPhase2();

}
window.goToPhase2 = goToPhase2;

function goToPhase3() {
  CURRENT_PHASE = 3;

  console.log(currentBattle);

  selectedBlocker = null;
  assignedDefenders = [];
  isBlocking = false;
  
  // Résolution

  for (let subBattle of currentBattle.battles) {
    console.group('SUB-BATTLE');
    let atkObj = CURRENT_ATTACKING_PLAYER.groups.find((group) => group.id == subBattle.attacking);
    
    let atkTotalAtk = atkObj.units * atkObj.atk;
    let atkTotalDef = atkObj.units * atkObj.def;
    console.log(
      `${atkObj.name}
${atkObj.units} unités
${atkObj.atk}/${atkObj.def}
total ATK: ${atkTotalAtk}`
    );
    console.log('------- VS -------');
    let defTotalAtk = 0;
    let defTotalDef = 0;
    let defObjects = [];

    for (let defGroup of subBattle.defending) {
      let defGroupObj = CURRENT_DEFENDING_PLAYER.groups.find((group) => group.id == defGroup);
      defObjects.push(defGroupObj);
      console.log(
      `${defGroupObj.name}
${defGroupObj.units} unités
${defGroupObj.atk}/${defGroupObj.def}`
    );
      defTotalAtk += defGroupObj.units * defGroupObj.atk;
      defTotalDef += defGroupObj.units * defGroupObj.def;
    }
    console.log(`total DEF : ${defTotalDef}`);

    // Do some shit
    if (atkTotalAtk > defTotalDef) {
      // si groupA_atk > group(s)B_def, groupA pert 25% de ses unités et group(s)B meurt.
      atkObj.units = Math.floor(atkObj.units * .75);
      document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}${atkObj.id}Units`).innerHTML = formatNumber(atkObj.units);
        document.getElementById(atkObj.id).classList.add('winner');
      for (let defGroupObj of defObjects) {
        defGroupObj.units = 0;
        document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}${defGroupObj.id}Units`).innerHTML = formatNumber(defGroupObj.units);
        document.getElementById(defGroupObj.id).classList.add('defeated');
      }
      console.log('l\'attaquant gagne');
    } else {
      // si groupA_atk <= group(s)B_def, groupA pert 50% de ses unités et group(s)B pert 25% de ses unités.
      atkObj.units = Math.floor(atkObj.units * .5);
      document.getElementById(`${CURRENT_ATTACKING_PLAYER.id}${atkObj.id}Units`).innerHTML = formatNumber(atkObj.units);
      document.getElementById(atkObj.id).classList.add('draw');
      for (let defGroupObj of defObjects) {
        defGroupObj.units = Math.floor(defGroupObj.units * .75);
        document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}${defGroupObj.id}Units`).innerHTML = formatNumber(defGroupObj.units);
        document.getElementById(defGroupObj.id).classList.add('winner');
      }
      console.log('le défenseur gagne');
    }

    console.groupEnd();
  }

  setDomForPhase3();
}
window.goToPhase3 = goToPhase3;

function goToNewTurn() {

  clearAllLines();

  if (CURRENT_DEFENDING_PLAYER.groups.length == 0) {
    triggerGameEnd();
    return;
  }
  
  CURRENT_PHASE = 1;

  currentBattle = {
    attacking: [],
    battles: [],
  }

  
  // Empty dead groups
  let atkPlayerEmptyGroups = [];
  for (let group of CURRENT_ATTACKING_PLAYER.groups) {
    if (group.units == 0) {
      atkPlayerEmptyGroups.push(group);
    }
  }
  for (let emptyGroup of atkPlayerEmptyGroups) {
    CURRENT_ATTACKING_PLAYER.groups.splice(CURRENT_ATTACKING_PLAYER.groups.indexOf(emptyGroup), 1);
  }

  let defPlayerEmptyGroups = [];
  for (let group of CURRENT_DEFENDING_PLAYER.groups) {
    if (group.units == 0) {
      defPlayerEmptyGroups.push(group);
    }
  }
  for (let emptyGroup of defPlayerEmptyGroups) {
    CURRENT_DEFENDING_PLAYER.groups.splice(CURRENT_DEFENDING_PLAYER.groups.indexOf(emptyGroup), 1);
  }

  if (CURRENT_DEFENDING_PLAYER.groups.length == 0) {
    triggerGameEnd();
    return;
  }

  if (CURRENT_ATTACKING_PLAYER == player1) {
    CURRENT_ATTACKING_PLAYER = player2;
    CURRENT_DEFENDING_PLAYER = player1;
  } else {
    CURRENT_ATTACKING_PLAYER = player1;
    CURRENT_DEFENDING_PLAYER = player2;
  }


  setDomForPhase1();
}
window.goToNewTurn = goToNewTurn;

function triggerGameEnd() {
  console.log('GameEnd');
  startGame();
}



function onGroupClick(groupId) {
  console.log(groupId);
  const groupDom = document.getElementById(groupId);
  const currentDefendingPlayerBottomAreaElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}BottomArea`);


  // Choix des attaquants
  if ((player1.groups.find((group) => group.id == groupId) != undefined && CURRENT_ATTACKING_PLAYER == player1 && CURRENT_PHASE == 1)
    || (player2.groups.find((group) => group.id == groupId) != undefined && CURRENT_ATTACKING_PLAYER == player2 && CURRENT_PHASE == 1)) {
    let isArleadyPresent = currentBattle.attacking.indexOf(groupId) != -1;
    if (isArleadyPresent) {
      currentBattle.attacking.splice(currentBattle.attacking.indexOf(groupId), 1);
    } else {
      if (currentBattle.attacking.length < CURRENT_DEFENDING_PLAYER.groups.length) {
        currentBattle.attacking.push(groupId);
      }
    }
    groupDom.classList.toggle('selected', currentBattle.attacking.indexOf(groupId) != -1);

    console.log(currentBattle.attacking);
  }

  // Choix du bloqueur
  if ((player1.groups.find((group) => group.id == groupId) != undefined && CURRENT_DEFENDING_PLAYER == player1 && CURRENT_PHASE == 2)
    || (player2.groups.find((group) => group.id == groupId) != undefined && CURRENT_DEFENDING_PLAYER == player2 && CURRENT_PHASE == 2)) {
    if (!isBlocking) {
      if (assignedDefenders.indexOf(groupId) != -1) {
        // Sélection d'un bloqueur déjà attribué
        assignedDefenders.splice(assignedDefenders.indexOf(groupId), 1);
        let currentSubBattle = currentBattle.battles.find((battle) => battle.defending.indexOf(groupId) != -1);
        currentSubBattle.defending.splice(currentSubBattle.defending.indexOf(groupId), 1);
        if (currentSubBattle.defending.length == 0) {
          let attackingDom = document.getElementById(currentSubBattle.attacking);
          attackingDom.classList.remove('blocked');
        }
        groupDom.classList.remove('blocking');
        groupDom.classList.remove('selected');
        const connectionId = `${currentSubBattle.attacking}__${groupId}`;
        clearConnectionLine(connectionId);
        selectedBlocker = null;
      } else {
        // Sélection d'un nouveau bloquer
        isBlocking = true;
        selectedBlocker = groupId;
        groupDom.classList.add('selected');
      }
    } else {
      if (selectedBlocker == groupId) {
        // Sélection du même bloqueur non attribué
        groupDom.classList.remove('selected');
        selectedBlocker = null;
        isBlocking = false;
      }
    }
  }

  // Choix de l'attaquant bloqué
  if ((player1.groups.find((group) => group.id == groupId) != undefined && CURRENT_ATTACKING_PLAYER == player1 && CURRENT_PHASE == 2)
    || (player2.groups.find((group) => group.id == groupId) != undefined && CURRENT_ATTACKING_PLAYER == player2 && CURRENT_PHASE == 2)) {
    if (isBlocking && currentBattle.attacking.indexOf(groupId) != -1) {
      groupDom.classList.add('blocked');
      document.getElementById(selectedBlocker).classList.add('blocking');
      currentBattle.battles.find((battle) => battle.attacking == groupId).defending.push(selectedBlocker);
      assignedDefenders.push(selectedBlocker);

      const connectionId = `${groupId}__${selectedBlocker}`;

      drawConnectionLine(
        groupDom,
        document.getElementById(selectedBlocker),
        connectionId
      );

      selectedBlocker = null;
      isBlocking = false;
    }
  }

  if (CURRENT_PHASE == 2) {
    if (isBlocking) {
      currentDefendingPlayerBottomAreaElement.innerHTML = '';
      if (CURRENT_DEFENDING_PLAYER.groups.length < 8 && CURRENT_DEFENDING_PLAYER.groups.find((e) => e.id == selectedBlocker).units > 1) {
        currentDefendingPlayerBottomAreaElement.innerHTML = `<button class="lzr-button lzr-solid" onclick="onSplitGroup('${selectedBlocker}')">Scinder</button>`;
      }
    } else {
      let isAllBlocked = true;
      for (let subBattle of currentBattle.battles) {
        if (subBattle.defending.length == 0) {
          isAllBlocked = false;
        }
      }
      if (isAllBlocked) {
        currentDefendingPlayerBottomAreaElement.innerHTML = `<button class="lzr-button lzr-solid" onclick="goToPhase3()">Contrer l'offensive</button>`;
      } else {
        currentDefendingPlayerBottomAreaElement.innerHTML = `<span class="keep-blocking">Bloquez toutes les unités ennemies</span>`;
      }
    }
  }
}
window.onGroupClick = onGroupClick;

function ensureArrowheadMarkerExists({
  markerId = "arrowhead",
  fillColor = arrowColor,
} = {}) {
  const svgElement = document.getElementById("battlefield-lines");

  // Si le marker existe déjà, on ne le recrée pas
  if (svgElement.querySelector(`#${markerId}`)) return;

  const svgNamespace = "http://www.w3.org/2000/svg";

  const defsElement = document.createElementNS(svgNamespace, "defs");

  const markerElement = document.createElementNS(svgNamespace, "marker");
  markerElement.setAttribute("id", markerId);
  markerElement.setAttribute("markerWidth", "8");
  markerElement.setAttribute("markerHeight", "8");
  markerElement.setAttribute("refX", "7");
  markerElement.setAttribute("refY", "4");
  markerElement.setAttribute("orient", "auto");
  markerElement.setAttribute("markerUnits", "strokeWidth");

  const polygonElement = document.createElementNS(svgNamespace, "polygon");
  polygonElement.setAttribute("points", "0 0, 8 4, 0 8");
  polygonElement.setAttribute("fill", fillColor);

  markerElement.appendChild(polygonElement);
  defsElement.appendChild(markerElement);
  svgElement.appendChild(defsElement);
}

function drawConnectionLine(attackerElement, blockerElement, connectionId) {
  const svgElement = document.getElementById("battlefield-lines");
  ensureArrowheadMarkerExists({ markerId: "arrowhead", fillColor: arrowColor });

  const attackerRect = attackerElement.getBoundingClientRect();
  const blockerRect = blockerElement.getBoundingClientRect();
  const svgRect = svgElement.getBoundingClientRect();

  const attackerCenterX = attackerRect.left + attackerRect.width / 2 - svgRect.left;
  const attackerCenterY = attackerRect.top + attackerRect.height / 2 - svgRect.top;

  const blockerCenterX = blockerRect.left + blockerRect.width / 2 - svgRect.left;
  const blockerCenterY = blockerRect.top + blockerRect.height / 2 - svgRect.top;

  const svgLineElement = document.createElementNS("http://www.w3.org/2000/svg", "line");

  // identifiant de connexion (évite collisions avec d'autres ids DOM)
  svgLineElement.dataset.connectionId = connectionId;

  svgLineElement.setAttribute("x1", blockerCenterX);
  svgLineElement.setAttribute("y1", blockerCenterY);
  svgLineElement.setAttribute("x2", attackerCenterX);
  svgLineElement.setAttribute("y2", attackerCenterY);

  svgLineElement.setAttribute("stroke", arrowColor);
  svgLineElement.setAttribute("stroke-width", "3");
  svgLineElement.setAttribute("stroke-linecap", "round");

  // Flèche au début => elle pointe vers l’attaquant
  svgLineElement.setAttribute("marker-end", "url(#arrowhead)");

  svgElement.appendChild(svgLineElement);

  return svgLineElement;
}

function clearConnectionLine(connectionId) {
  const svgElement = document.getElementById("battlefield-lines");

  const lineToRemove = svgElement.querySelector(`[data-connection-id="${connectionId}"]`);
  if (!lineToRemove) return;

  lineToRemove.remove();
}

function clearAllLines() {
  const svgElement = document.getElementById("battlefield-lines");
  svgElement.innerHTML = "";
}

function onSplitGroup(groupId) {
  splitId += 1;
  console.log(`splitting ${groupId}`);
  let initialGroup = CURRENT_DEFENDING_PLAYER.groups.find((group) => group.id == groupId);
  let newGroup = {
    id: `${initialGroup.id}${splitId}`,
    name: initialGroup.name,
    atk: initialGroup.atk,
    def: initialGroup.def,
    units: Math.floor(initialGroup.units / 2),
  };
  initialGroup.units = Math.ceil(initialGroup.units / 2);
  document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}${groupId}Units`).innerHTML = initialGroup.units;

  document.getElementById('')
  CURRENT_DEFENDING_PLAYER.groups.push(newGroup);

  const currentDefendingPlayerGroupsElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}Groups`);
  currentDefendingPlayerGroupsElement.innerHTML += `
    <button id="${newGroup.id}" class="group-block" onclick="onGroupClick('${newGroup.id}')">
      <div>
        <span id="${CURRENT_DEFENDING_PLAYER.id}${newGroup.id}Units" class="group-units-value">${formatNumber(newGroup.units)}</span>
        <span>unités</span>
      </div>
      
      <span class="group-name">${newGroup.name}</span>

      <div class="group-bottom">
        <img src="${APP_ORIGIN}assets/medias/images/icons/${newGroup.atk}-${newGroup.def}.png" />
        <span class="pt-box">${newGroup.atk}/${newGroup.def}</span>
      </div>
    </button>
  `;
  const currentDefendingPlayerBottomAreaElement = document.getElementById(`${CURRENT_DEFENDING_PLAYER.id}BottomArea`);
  document.getElementById(selectedBlocker).classList.remove('selected');

  selectedBlocker = null;
  isBlocking = false;
  let isAllBlocked = true;
    for (let subBattle of currentBattle.battles) {
      if (subBattle.defending.length == 0) {
        isAllBlocked = false;
      }
    }
    if (isAllBlocked) {
      currentDefendingPlayerBottomAreaElement.innerHTML = `<button class="lzr-button lzr-solid" onclick="goToPhase3()">Contrer l'offensive</button>`;
    } else {
      currentDefendingPlayerBottomAreaElement.innerHTML = `<span class="keep-blocking">Bloquez toutes les unités ennemies</span>`;
    }
}
window.onSplitGroup = onSplitGroup;