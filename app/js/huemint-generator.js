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
  const saveButton = document.getElementById('huemintLocalSaveFavorite');
  const favoritesBox = document.getElementById('huemintLocalFavorites');
  const categorySelect = document.getElementById('huemintLocalCategory');
  const templateSelect = document.getElementById('huemintLocalTemplate');
  const note = document.getElementById('huemintLocalNote');
  let currentIndex = 0;
  let activeCorpus = [];
  let currentRecord = null;

  function templateLabel(template) {
    return catalog.find(item => item.slug === template)?.label || template;
  }

  function categoryForTemplate(template) {
    return catalog.find(item => item.slug === template)?.category || 'Huemint';
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

  function removeFavorite(id) {
    writeFavorites(readFavorites().filter(favorite => favorite.id !== id));
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

  function applyRecord(record, message) {
    if (!record) return;
    currentRecord = record;
    strip.replaceChildren(makeStrip(record.colors));
    if (typeof window.applyListPaletteToAllThreeWindows === 'function') {
      window.applyListPaletteToAllThreeWindows(directPaletteForSlots(record.colors), { direct: true });
    }
    status.textContent = message || `Applied ${categoryForTemplate(record.template)} · ${templateLabel(record.template)} · direct colors`;
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
      const item = document.createElement('div');
      item.className = 'huemintLocalFavoriteItem';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'huemintLocalFavorite';
      button.title = 'Apply saved Huemint palette';
      button.appendChild(makeStrip(record.colors, 'huemintLocalStrip compact'));
      button.addEventListener('click', () => applyRecord(record, 'Applied saved Huemint favorite'));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'huemintLocalDelete';
      deleteButton.textContent = '×';
      deleteButton.title = 'Remove this palette from favorites';
      deleteButton.setAttribute('aria-label', 'Remove saved Huemint palette');
      deleteButton.addEventListener('click', event => {
        event.stopPropagation();
        removeFavorite(record.id);
      });
      item.append(button, deleteButton);
      favoritesBox.appendChild(item);
    });
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
    status.textContent = `${activeCorpus.length} real ${categoryForTemplate(templateSelect.value)} · ${templateLabel(templateSelect.value)} palettes available locally`;
    note.textContent = `Direct mode uses only the ${currentRecord.colors.length} original Huemint colors. For artwork with more slots, colors repeat without gradients or interpolation.`;
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
