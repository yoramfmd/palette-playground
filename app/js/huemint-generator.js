(() => {
  const corpus = Array.isArray(window.HUEMINT_LOCAL_CORPUS)
    ? window.HUEMINT_LOCAL_CORPUS.filter(record => Array.isArray(record.colors) && record.colors.length >= 4)
    : [];
  const favoritesKey = 'palettePlaygroundHuemintFavoritesV1';
  const strip = document.getElementById('huemintLocalPalette');
  const status = document.getElementById('huemintLocalStatus');
  const generateButton = document.getElementById('huemintLocalGenerate');
  const saveButton = document.getElementById('huemintLocalSaveFavorite');
  const favoritesBox = document.getElementById('huemintLocalFavorites');
  const templateSelect = document.getElementById('huemintLocalTemplate');
  let currentIndex = 0;
  let activeCorpus = [];
  let currentRecord = null;

  function templateLabel(template) {
    if (template === 'illustration-1') return 'Illustration 1';
    if (template === 'illustration-3') return 'Illustration 3';
    return 'Website Magazine';
  }

  function directPaletteForSlots(colors) {
    const target = typeof window.getPaletteSlotCount === 'function'
      ? window.getPaletteSlotCount()
      : 10;
    if (colors.length === target) return colors.slice();
    if (colors.length > target) {
      return Array.from({ length: target }, (_, index) => {
        const sourceIndex = Math.round(index * (colors.length - 1) / Math.max(1, target - 1));
        return colors[sourceIndex];
      });
    }
    return Array.from({ length: target }, (_, index) => colors[index % colors.length]);
  }

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
    row.style.gridTemplateColumns = `repeat(${colors.length}, 1fr)`;
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
      window.applyListPaletteToAllThreeWindows(directPaletteForSlots(record.colors));
    }
    status.textContent = message || `Applied ${templateLabel(record.template)} · direct colors, no interpolation`;
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

  function selectTemplate() {
    activeCorpus = corpus.filter(record => record.template === templateSelect.value);
    currentIndex = 0;
    currentRecord = activeCorpus[0] || null;
    if (!currentRecord) {
      strip.replaceChildren();
      status.textContent = `No captured palettes for ${templateLabel(templateSelect.value)}.`;
      generateButton.disabled = true;
      saveButton.disabled = true;
      return;
    }
    strip.replaceChildren(makeStrip(currentRecord.colors));
    status.textContent = `${activeCorpus.length} real ${templateLabel(templateSelect.value)} palettes available locally`;
    generateButton.disabled = false;
    saveButton.disabled = false;
  }

  selectTemplate();
  renderFavorites();

  templateSelect.addEventListener('change', selectTemplate);

  generateButton.addEventListener('click', () => {
    applyRecord(activeCorpus[currentIndex]);
    currentIndex = (currentIndex + 1) % activeCorpus.length;
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
