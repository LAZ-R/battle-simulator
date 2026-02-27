import { APP_NAME, APP_VERSION } from "../../../app-properties.js";
import { toExternalPath } from "../../router.js";
import { startGame } from "../../services/battle.service.js";
import { getSvgIcon } from "../../services/icons.service.js";
import { updateMenuDom } from "../../services/menu.service.js";
import { COLORS, getPlayerTotalAtk, getPlayerTotalDef, getPlayerTotalUnitsCount, ICONS, initPlayers, player1, player2, SHIELDS } from "../../services/player.service.js";
import { showToast } from "../../services/toast.service.js";
import { isLaptopOrUp, isPhone, isTablet } from "../../utils/breakpoints.js";
import { formatNumber } from "../../utils/math.utils.js";

// VARIABLES //////////////////////////////////////////////////////////////////////////////////////
const HEADER_ICON_CONTAINER = document.getElementById('headerIconContainer');
const HEADER_TITLE = document.getElementById('headerTitle');
const MAIN = document.getElementById('main');
const FOOTER = document.getElementById('footer');

// FUNCTIONS //////////////////////////////////////////////////////////////////////////////////////

export function render() {
  // Set HEADER layout
  if (isPhone || isTablet) {
    HEADER_TITLE.innerHTML = APP_NAME;
  }
  if (isLaptopOrUp) {
    HEADER_TITLE.innerHTML = APP_NAME;
  }

  // Set MAIN layout
  MAIN.innerHTML = `
    <div class="players-container">
      <div class="initial-container">
        ${getInitialDom()}
      </div>
    </div>
  `;

  // Set FOOTER layout
  FOOTER.innerHTML = ``;

  updateMenuDom('homepage');

  setPlayersCustomisationDom();
}

function getInitialDom() {
  return `
    <span>Battles</span>

    <span>Groupes par joueurs</span>

    <select class="lzr-select">
      <option>option 1</option>
      <option>option 2</option>
    </select>
    
    <button class="lzr-button lzr-solid" onclick="onGoToCustomisationClick()">Choisissez vos couleurs</button>
  `;
}

function onGoToCustomisationClick() {
  setPlayersCustomisationDom();
}
window.onGoToCustomisationClick = onGoToCustomisationClick;

function setPlayersCustomisationDom() {
  MAIN.innerHTML = `
    <div class="players-container">
      <div id="player2Container" class="player-container small player-2">${getPlayerCustomisationDom(player2)}</div>
      <div class="custom-center-area">
        <button class="lzr-button lzr-outlined" onclick="onGoToGameClick()">Démarrer la bataille</button>
      </div>
      <div id="player1Container" class="player-container small player-1">${getPlayerCustomisationDom(player1)}</div>
    </div>
  `;
}

function onGoToGameClick() {
  setPlayersGameDom();
}
window.onGoToGameClick = onGoToGameClick;

export function setPlayersGameDom() {
  MAIN.innerHTML = `
    <div class="players-container">
      <svg id="battlefield-lines"></svg>
      <div id="player2Container" class="player-container player-2" style="--color: ${player2.color}; --filter: ${COLORS.find((e) => e.hsl == player2.color).filter};">${getPlayerDom(player2)}</div>
      <div id="player1Container" class="player-container player-1" style="--color: ${player1.color}; --filter: ${COLORS.find((e) => e.hsl == player1.color).filter};">${getPlayerDom(player1)}</div>
    </div>
  `;

  startGame();
}

function getPlayerCustomisationDom(player) {
  return `
    <div class="custom-group-block">
      <span>Choisissez les couleurs<br>de votre armée</span>
      <div class="custom-group-line">
        ${getColorButtons(player)}
      </div>
    </div>
    <!-- <div class="custom-group-block">
      <span>shield</span>
      <div class="custom-group-line">
        ${getShieldButtons(player)}
      </div>
    </div>
    <div class="custom-group-block">
      <span>icon</span>
      <div class="custom-group-line">
        ${getIconButtons(player)}
      </div>
    </div> -->
  `;
}

function getColorButtons(player) {
  let str = '';
  let isPlayer1 = player.id == player1.id;
  let isPlayer2 = player.id == player2.id;

  for (let color of COLORS) {
    str += `
    <button 
      id="${player.id}ColorButton-${color.id}" 
      onclick="setPlayerColor('${player.id}', '${color.hsl}')" 
      style="--color: ${color.hsl};" 
      class="lzr-button lzr-square color-button ${(COLORS.indexOf(color) == 0 && isPlayer1) || (COLORS.indexOf(color) == 1 && isPlayer2) ? 'selected' : ''}">
    </button>`;
  }
  return str;
}
function setPlayerColor(playerId, newColor) {
  if (playerId == player1.id) {
    player1.color = newColor;
  } else {
    player2.color = newColor;
  }
  
  // deselectOthers
  for (let color of COLORS) {
    let element = document.getElementById(`${playerId}ColorButton-${color.id}`);
    element.classList.toggle('selected', newColor == color.hsl);
  }
}
window.setPlayerColor = setPlayerColor;

function getShieldButtons(player) {
  let str = '';
  let isPlayer1 = player.id == player1.id;
  let isPlayer2 = player.id == player2.id;

  for (let shield of SHIELDS) {
    str += `
    <button 
      id="${player.id}ShieldButton-${shield.id}" 
      onclick="setPlayerShield('${player.id}', '${shield.id}')" 
      class="lzr-button lzr-square shield-button ${(SHIELDS.indexOf(shield) == 0 && isPlayer1) || (SHIELDS.indexOf(shield) == 1 && isPlayer2) ? 'selected' : ''}">
      <img src="/assters/media/images/shields/${shield.id}.png" />
    </button>`;
  }
  return str;
}
function setPlayerShield(playerId, newShield) {
  if (playerId == player1.id) {
    player1.shield = newShield;
  } else {
    player2.shield = newShield;
  }
  
  // deselectOthers
  for (let shield of SHIELDS) {
    let element = document.getElementById(`${playerId}ShieldButton-${shield.id}`);
    element.classList.toggle('selected', newShield == shield.id);
  }
}
window.setPlayerShield = setPlayerShield;

function getIconButtons(player) {
  let str = '';
  let isPlayer1 = player.id == player1.id;
  let isPlayer2 = player.id == player2.id;

  for (let icon of ICONS) {
    str += `
    <button 
      id="${player.id}IconButton-${icon.id}" 
      onclick="setPlayerIcon('${player.id}', '${icon.id}')" 
      class="lzr-button lzr-square icon-button ${(ICONS.indexOf(icon) == 0 && isPlayer1) || (ICONS.indexOf(icon) == 1 && isPlayer2) ? 'selected' : ''}">
      <img src="/assters/media/images/icons/${icon.id}.png" />
    </button>`;
  }
  return str;
}
function setPlayerIcon(playerId, newIcon) {
  if (playerId == player1.id) {
    player1.icon = newIcon;
  } else {
    player2.icon = newIcon;
  }
  
  // deselectOthers
  for (let icon of ICONS) {
    let element = document.getElementById(`${playerId}IconButton-${icon.id}`);
    element.classList.toggle('selected', newIcon == icon.id);
  }
}
window.setPlayerIcon = setPlayerIcon;

function getPlayerDom(player) {
  let urlPath = `${location.origin}${location.pathname}`;
  console.log(urlPath);
  let groupsStr = '';
  for (let group of player.groups) {
    console.log(`${urlPath}/assets/medias/images/icons/${group.atk}-${group.def}.png`);
    groupsStr += `
    <button id="${group.id}" class="group-block" onclick="onGroupClick('${group.id}')">
      <div>
        <span id="${player.id}${group.id}Units" class="group-units-value">${formatNumber(group.units)}</span>
        <span>unités</span>
      </div>
      
      <span class="group-name">${group.name}</span>

      <div class="group-bottom">
        <img src="${urlPath}assets/medias/images/icons/${group.atk}-${group.def}.png" />
        <span class="pt-box">${group.atk}/${group.def}</span>
      </div>
    </button>`;
  }
  return `
    <div class="top-area">
      <div id="${player.id}TopAtk" class="top-block atk">
        <span>ATK</span>
        <span id="${player.id}GlobalAtkValue" class="value">${getPlayerTotalAtk(player)}</span>
      </div>
      <div id="${player.id}TopUnits" class="top-block units">
        <span>Unités totales</span>
        <span id="${player.id}GlobalUnitsValue" class="value">${getPlayerTotalUnitsCount(player)}</span>
      </div>
      <div id="${player.id}TopDef" class="top-block def">
        <span>DEF</span>
        <span id="${player.id}GlobalDefValue" class="value">${getPlayerTotalDef(player)}</span>
      </div>
    </div>

    <div id="${player.id}Groups" class="central-area">${groupsStr}</div>

    <div id="${player.id}BottomArea" class="bottom-area">
    </div>
  `;
}

