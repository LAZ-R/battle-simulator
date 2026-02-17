// Sélectionne les deux éléments principaux de la structure DOM
let viewport = document.querySelector('.map-viewport'); // la zone visible, qui sert de "fenêtre"
let map = document.querySelector('.map');               // le contenu qu'on va déplacer et zoomer

export function initMapLogic() {
  viewport = document.querySelector('.map-viewport');
  map = document.querySelector('.map');

  // Variables globales
  let scale = 1;
  let originX = 0;
  let originY = 0;
  let lastTouches = [];

  // --- Configuration ---
  let MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const INITIAL_SCALE = 1;
  const REBOUND_STRENGTH = 0.2; // 0 = rebond brutal, 1 = pas de rebond (tu peux ajuster)

  // --- Fonction utilitaire : centre entre deux doigts
  function getTouchesCenter(touch1, touch2) {
    // Récupère le rectangle du viewport pour connaître son offset dans la page
    const rect = viewport.getBoundingClientRect();

    // Centre entre les deux doigts, ramené au repère local du viewport
    return {
      x: ((touch1.clientX + touch2.clientX) / 2) - rect.left,
      y: ((touch1.clientY + touch2.clientY) / 2) - rect.top
    };
  }

  // --- Applique la transformation
  function applyTransform() {
    map.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
  }

  // --- Calcule et applique les limites douces
  function applyBounds() {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight; // carré
    const mapWidth = map.clientWidth * scale;
    const mapHeight = map.clientHeight * scale;

    // Limites de déplacement autorisées
    const minX = viewportWidth - mapWidth;
    const minY = viewportHeight - mapHeight;
    const maxX = 0;
    const maxY = 0;

    // Si la carte dépasse, on ramène en douceur
    if (originX < minX) originX += (minX - originX) * REBOUND_STRENGTH;
    if (originX > maxX) originX += (maxX - originX) * REBOUND_STRENGTH;
    if (originY < minY) originY += (minY - originY) * REBOUND_STRENGTH;
    if (originY > maxY) originY += (maxY - originY) * REBOUND_STRENGTH;

    applyTransform();
  }

  // --- Centre la carte
  function centerMap() {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight; // carré
    const mapWidth = map.clientWidth;
    const mapHeight = map.clientHeight;

    // Contain scale : toute la carte visible
    const containScale = Math.min(viewportWidth / mapWidth, viewportHeight / mapHeight);
    MIN_SCALE = containScale;

    scale = INITIAL_SCALE || containScale;

    originX = (viewportWidth - mapWidth * scale) / 2;
    originY = (viewportHeight - mapHeight * scale) / 2;

    applyTransform();
  }

  // --- Touch start
  viewport.addEventListener('touchstart', event => {
    if (event.touches.length === 1) {
      lastTouches = [event.touches[0]];
    } else if (event.touches.length === 2) {
      lastTouches = [...event.touches];
    }
  });

  // --- Touch move
  viewport.addEventListener('touchmove', event => {
    event.preventDefault();

    if (event.touches.length === 1 && lastTouches.length === 1) {
      const deltaX = event.touches[0].clientX - lastTouches[0].clientX;
      const deltaY = event.touches[0].clientY - lastTouches[0].clientY;

      originX += deltaX;
      originY += deltaY;

      lastTouches = [event.touches[0]];
    }

    if (event.touches.length === 2 && lastTouches.length === 2) {
      // --- Distances entre les deux doigts avant et après ---
      const previousDistance = Math.hypot(
        lastTouches[0].clientX - lastTouches[1].clientX,
        lastTouches[0].clientY - lastTouches[1].clientY
      );

      const currentDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );

      // --- Centres avant / après ---
      const previousCenter = getTouchesCenter(lastTouches[0], lastTouches[1]);
      const currentCenter = getTouchesCenter(event.touches[0], event.touches[1]);

      // --- Calcul du facteur de zoom ---
      const zoomFactor = currentDistance / previousDistance;
      const newScale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);

      // --- Étape 1 : translation du centre de pinch (si les doigts bougent latéralement) ---
      const dx = currentCenter.x - previousCenter.x;
      const dy = currentCenter.y - previousCenter.y;
      originX += dx;
      originY += dy;

      // --- Étape 2 : ajustement de l’échelle autour du centre ---
      const scaleChange = newScale / scale;
      originX = currentCenter.x - (currentCenter.x - originX) * scaleChange;
      originY = currentCenter.y - (currentCenter.y - originY) * scaleChange;

      // --- Mise à jour ---
      scale = newScale;
      lastTouches = [...event.touches];

      applyBounds(); // garde tes limites douces
    }

    applyBounds(); // <= ici on applique les limites douces
  });

  // --- Touch end
  viewport.addEventListener('touchend', () => {
    lastTouches = [];
  });

  // --- Démarrage
  window.addEventListener('resize', centerMap);
  centerMap();

  // --- Boucle d'animation pour le rebond continu
  // Tant qu'on est hors limites, ça recadre doucement la carte
  function update() {
    applyBounds();
    requestAnimationFrame(update);
  }
  update();
}
