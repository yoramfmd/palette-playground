(() => {
  const corpus = Array.isArray(window.HUEMINT_LOCAL_CORPUS)
    ? window.HUEMINT_LOCAL_CORPUS.filter(record => Array.isArray(record.colors) && record.colors.length === 4)
    : [];
  const favoritesKey = 'palettePlaygroundHuemintFavoritesV1';
  const strip = document.getElementById('huemintLocalPalette');
  const status = document.getElementById('huemintLocalStatus');
  const generateButton = document.getElementById('huemintLocalGenerate');
  const saveButton = document.getElementById('huemintLocalSaveFavorite');
  const favoritesBox = document.getElementById('huemintLocalFavorites');
  let currentIndex = 0;
  let currentRecord = corpus[0] || null;

  function readFavorites() {
    try {
      const parsed = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeFavorites(favorites) {
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }

  function makeStrip(colors, className = 'huemintLocalStrip') {
    const row = document.createElement('div');
    row.className = className;
    colors.forEach(color => {
      const swatch = document.createElement('span');
      swatch.style.background = color;
      swatch.title = color;
      row.appendChild(swatch);
    });
    return row;
  }

  function applyRecord(record, message) {
    if (!record) return;
    currentRecord = record;
    strip.replaceChildren(makeStrip(record.colors));
    if (typeof window.applyListPaletteToAllThreeWindows === 'function') {
      window.applyListPaletteToAllThreeWindows(record.colors);
    }
    status.textContent = message || `Applied real Huemint palette ${currentIndex + 1} of ${corpus.length}`;
  }

  function renderFavorites() {
    const favorites = readFavorites();
    favoritesBox.replaceChildren();
    if (!favorites.length) {
      const empty = document.createElement('div');
      empty.className = 'huemintLocalEmpty';
      empty.textContent = 'No saved favorites yet.';
      favoritesBox.appendChild(empty);
      return;
    }
    favorites.forEach(record => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'huemintLocalFavorite';
      button.title = 'Apply saved Huemint palette';
      button.appendChild(makeStrip(record.colors, 'huemintLocalStrip compact'));
      button.addEventListener('click', () => applyRecord(record, 'Applied saved Huemint favorite'));
      favoritesBox.appendChild(button);
    });
  }

  if (!corpus.length) {
    status.textContent = 'Local Huemint corpus is unavailable.';
    generateButton.disabled = true;
    saveButton.disabled = true;
    return;
  }

  strip.replaceChildren(makeStrip(corpus[currentIndex].colors));
  status.textContent = `${corpus.length} real Huemint palettes available locally`;
  renderFavorites();

  generateButton.addEventListener('click', () => {
    applyRecord(corpus[currentIndex]);
    currentIndex = (currentIndex + 1) % corpus.length;
  });

  saveButton.addEventListener('click', () => {
    const record = currentRecord;
    const favorites = readFavorites();
    if (!favorites.some(favorite => favorite.id === record.id)) {
      favorites.push(record);
      writeFavorites(favorites);
    }
    renderFavorites();
    status.textContent = 'Saved as a local favorite';
  });
})();
