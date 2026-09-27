(() => {
  const corpus = Array.isArray(window.HUEMINT_LOCAL_CORPUS)
    ? window.HUEMINT_LOCAL_CORPUS.filter(record => Array.isArray(record.colors) && record.colors.length >= 2)
    : [];
  const catalog = Array.isArray(window.HUEMINT_TEMPLATE_CATALOG)
    ? window.HUEMINT_TEMPLATE_CATALOG.filter(item => corpus.some(record => record.template === item.slug))
    : [];
  const favoritesKey = 'palettePlaygroundHuemintFavoritesV1';
  const strip = document.getElementById('huemintLocalPalette');
  const status = document.getElementById('huemintLocalStatus');
  const generateButton = document.getElementById('huemintLocalGenerate');
  const backButton = document.getElementById('huemintLocalBack');
  const forwardButton = document.getElementById('huemintLocalForward');
  const saveButton = document.getElementById('huemintLocalSaveFavorite');
  const favoritesBox = document.getElementById('huemintLocalFavorites');
  const removeFavoriteButton = document.getElementById('huemintLocalRemoveFavorite');
  const categorySelect = document.getElementById('huemintLocalCategory');
  const templateSelect = document.getElementById('huemintLocalTemplate');
  const modeSelect = document.getElementById('huemintLocalMode');
  let activeCorpus = [];
  let currentRecord = null;
  let history = [];
  let historyIndex = -1;
  let selectedFavoriteId = null;

  const modeLabels = {
    creative: 'Creative',
    balanced: 'Balanced',
    bold: 'Bold',
    any: 'Any'
  };

  function templateLabel(template) {
    return catalog.find(item => item.slug === template)?.label || template;
  }

  function categoryForTemplate(template) {
    return catalog.find(item => item.slug === template)?.category || 'Huemint';
  }

  function hexToHsl(hex) {
    const value = String(hex).replace('#', '');
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;
    let hue = 0;
    if (delta) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue = (hue * 60 + 360) % 360;
    }
    const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
    return { hue, saturation, lightness };
  }

  function paletteMetrics(colors) {
    const values = colors.map(hexToHsl);
    const chromatic = values.filter(value => value.saturation > 0.08);
    const mean = (list, key) => list.reduce((sum, value) => sum + value[key], 0) / Math.max(1, list.length);
    const range = (list, key) => Math.max(...list.map(value => value[key])) - Math.min(...list.map(value => value[key]));
    let hueSpread = 0;
    chromatic.forEach((left, index) => chromatic.slice(index + 1).forEach(right => {
      const distance = Math.abs(left.hue - right.hue);
      hueSpread = Math.max(hueSpread, Math.min(distance, 360 - distance) / 180);
    }));
    return {
      averageSaturation: mean(values, 'saturation'),
      saturationRange: range(values, 'saturation'),
      lightnessRange: range(values, 'lightness'),
      hueSpread,
      neutralRatio: 1 - chromatic.length / Math.max(1, values.length)
    };
  }

  function paletteDistance(left, right) {
    if (!left || !right) return 1;
    const parse = hex => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
    const rightRgb = right.colors.map(parse);
    const distances = left.colors.map(color => {
      const rgb = parse(color);
      return Math.min(...rightRgb.map(candidate => Math.hypot(
        rgb[0] - candidate[0], rgb[1] - candidate[1], rgb[2] - candidate[2]
      ) / 441.673));
    });
    return distances.reduce((sum, distance) => sum + distance, 0) / Math.max(1, distances.length);
  }

  function qualityScore(record, mode) {
    const metrics = paletteMetrics(record.colors);
    if (mode === 'bold') {
      return metrics.lightnessRange * 0.45 + metrics.averageSaturation * 0.35 + metrics.hueSpread * 0.2;
    }
    if (mode === 'balanced') {
      const saturationBalance = 1 - Math.min(1, Math.abs(metrics.averageSaturation - 0.52) / 0.52);
      const lightnessBalance = 1 - Math.min(1, Math.abs(metrics.lightnessRange - 0.58) / 0.58);
      return saturationBalance * 0.35 + lightnessBalance * 0.35 + metrics.hueSpread * 0.2 + metrics.neutralRatio * 0.1;
    }
    if (mode === 'creative') {
      return metrics.hueSpread * 0.42 + metrics.averageSaturation * 0.22 + metrics.saturationRange * 0.16 + metrics.lightnessRange * 0.2;
    }
    return 0.5;
  }

  function chooseNextRecord() {
    const visitedIds = new Set(history.slice(0, historyIndex + 1).map(record => record.id));
    const unseen = activeCorpus.filter(record => !visitedIds.has(record.id));
    const candidates = unseen.length ? unseen : activeCorpus.filter(record => record.id !== currentRecord?.id);
    const pool = candidates.length ? candidates : activeCorpus;
    const mode = modeSelect.value;
    return pool.slice().sort((left, right) => {
      const leftScore = qualityScore(left, mode) + paletteDistance(left, currentRecord) * 0.38;
      const rightScore = qualityScore(right, mode) + paletteDistance(right, currentRecord) * 0.38;
      return rightScore - leftScore || left.id.localeCompare(right.id);
    })[0] || null;
  }

  function updateHistoryButtons() {
    backButton.disabled = historyIndex <= 0;
    forwardButton.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  }

  function resetHistory(record) {
    history = record ? [record] : [];
    historyIndex = record ? 0 : -1;
    updateHistoryButtons();
  }

  function addToHistory(record) {
    if (history[historyIndex]?.id === record.id) return;
    history = history.slice(0, historyIndex + 1);
    history.push(record);
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function progressLabel() {
    if (historyIndex < 0 || !activeCorpus.length) return '';
    return `${historyIndex + 1} of ${activeCorpus.length} palettes`;
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

  function setSelectedFavorite(id) {
    selectedFavoriteId = id || null;
    favoritesBox.querySelectorAll('.huemintLocalFavoriteItem').forEach(item => {
      const selected = item.dataset.favoriteId === selectedFavoriteId;
      item.classList.toggle('is-selected', selected);
      item.querySelector('.huemintLocalFavorite')?.setAttribute('aria-pressed', String(selected));
    });
    removeFavoriteButton.disabled = !selectedFavoriteId;
  }

  function removeFavorite(id) {
    writeFavorites(readFavorites().filter(favorite => favorite.id !== id));
    selectedFavoriteId = null;
    renderFavorites();
    status.textContent = 'Removed palette from Huemint favorites';
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

  function applyRecord(record, message, options = {}) {
    if (!record) return;
    setSelectedFavorite(options.favoriteSelection === true ? record.id : null);
    currentRecord = record;
    strip.replaceChildren(makeStrip(record.colors));
    if (typeof window.applyListPaletteToAllThreeWindows === 'function') {
      window.applyListPaletteToAllThreeWindows(record.colors, { direct: true });
    }
    if (options.trackHistory !== false) addToHistory(record);
    const source = `${categoryForTemplate(record.template)} · ${templateLabel(record.template)}`;
    status.textContent = options.showProgress === false
      ? (message || `Applied ${modeLabels[modeSelect.value]} selection · ${source}`)
      : `${progressLabel()} · ${modeLabels[modeSelect.value]} · ${source}`;
  }

  function renderFavorites() {
    const favorites = readFavorites();
    favoritesBox.replaceChildren();
    if (!favorites.length) {
      selectedFavoriteId = null;
      const empty = document.createElement('div');
      empty.className = 'huemintLocalEmpty';
      empty.textContent = 'No saved favorites yet.';
      favoritesBox.appendChild(empty);
      setSelectedFavorite(null);
      return;
    }
    if (!favorites.some(record => record.id === selectedFavoriteId)) selectedFavoriteId = null;
    favorites.forEach(record => {
      const item = document.createElement('div');
      item.className = 'huemintLocalFavoriteItem';
      item.dataset.favoriteId = record.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'huemintLocalFavorite';
      button.title = 'Apply saved Huemint palette';
      button.setAttribute('aria-pressed', 'false');
      button.appendChild(makeStrip(record.colors, 'huemintLocalStrip compact'));
      button.addEventListener('click', () => applyRecord(record, 'Applied saved Huemint favorite', {
        trackHistory: false,
        showProgress: false,
        favoriteSelection: true
      }));
      item.appendChild(button);
      favoritesBox.appendChild(item);
    });
    setSelectedFavorite(selectedFavoriteId);
  }

  if (!corpus.length) {
    status.textContent = 'Local Huemint corpus is unavailable.';
    generateButton.disabled = true;
    saveButton.disabled = true;
    return;
  }

  function populateCategories() {
    const categories = [...new Set(catalog.map(item => item.category))];
    categorySelect.replaceChildren(...categories.map(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      return option;
    }));
    categorySelect.value = categories.includes('Illustration') ? 'Illustration' : categories[0];
  }

  function populateTemplates(preferredTemplate) {
    const templates = catalog.filter(item => item.category === categorySelect.value);
    templateSelect.replaceChildren(...templates.map(item => {
      const option = document.createElement('option');
      option.value = item.slug;
      option.textContent = `${item.label} · ${item.numColors} colors`;
      return option;
    }));
    const preferred = templates.find(item => item.slug === preferredTemplate);
    templateSelect.value = preferred?.slug || templates[0]?.slug || '';
  }

  function selectTemplate() {
    activeCorpus = corpus.filter(record => record.template === templateSelect.value);
    currentRecord = activeCorpus[0] || null;
    resetHistory(null);
    if (!currentRecord) {
      strip.replaceChildren();
      status.textContent = `No captured palettes for ${templateLabel(templateSelect.value)}.`;
      generateButton.disabled = true;
      saveButton.disabled = true;
      return;
    }
    strip.replaceChildren(makeStrip(currentRecord.colors));
    status.textContent = `${activeCorpus.length} real ${categoryForTemplate(templateSelect.value)} · ${templateLabel(templateSelect.value)} palettes · ${modeLabels[modeSelect.value]} ranking ready`;
    generateButton.disabled = false;
    saveButton.disabled = false;
  }

  populateCategories();
  populateTemplates('illustration-3');
  selectTemplate();
  renderFavorites();

  categorySelect.addEventListener('change', () => {
    populateTemplates();
    selectTemplate();
  });
  templateSelect.addEventListener('change', selectTemplate);
  modeSelect.addEventListener('change', () => {
    resetHistory(null);
    status.textContent = `${modeLabels[modeSelect.value]} ranking ready · ${activeCorpus.length} real palettes in this template`;
  });

  generateButton.addEventListener('click', () => {
    if (activeCorpus.length && new Set(history.map(record => record.id)).size >= activeCorpus.length) {
      resetHistory(null);
    }
    applyRecord(chooseNextRecord());
  });

  backButton.addEventListener('click', () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    applyRecord(history[historyIndex], 'Returned to previous generated palette', { trackHistory: false });
    updateHistoryButtons();
  });

  forwardButton.addEventListener('click', () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    applyRecord(history[historyIndex], 'Moved forward to next generated palette', { trackHistory: false });
    updateHistoryButtons();
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

  removeFavoriteButton.addEventListener('click', () => {
    if (!selectedFavoriteId) return;
    removeFavorite(selectedFavoriteId);
  });
})();
