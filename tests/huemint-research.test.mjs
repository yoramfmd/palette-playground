import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createIllustration3Request, createIllustrationRequest, createWebsiteMagazineRequest, HUEMINT_API_URL, ILLUSTRATION_1_DEFAULT_MATRIX, ILLUSTRATION_3_DEFAULT_MATRIX } from '../research/huemint/config.mjs';
import { normalizeHuemintResponse, requestHuemintPalettes } from '../research/huemint/client.mjs';
import { makeCorpusRecord, paletteId } from '../research/huemint/corpus.mjs';
import { selectRealHuemintPalette } from '../research/huemint/local-engine.mjs';
import { COLLECTION_LIMITS, parseCollectorArgs } from '../scripts/huemint/args.mjs';
import { HUEMINT_TEMPLATE_CATALOG } from '../research/huemint/template-catalog.mjs';

const appSource = await readFile(new URL('../app/index.html', import.meta.url), 'utf8');
const browserCorpusSource = await readFile(new URL('../app/js/huemint-corpus.js', import.meta.url), 'utf8');
const generatorSource = await readFile(new URL('../app/js/huemint-generator.js', import.meta.url), 'utf8');

test('Website Magazine request matches the current Huemint page proxy contract', () => {
  const payload = createWebsiteMagazineRequest();
  assert.equal(HUEMINT_API_URL, 'https://huemint.com/api/');
  assert.equal(payload.page, 'website-magazine');
  assert.equal(payload.preset, 'default');
  assert.equal(payload.num_colors, 4);
  assert.equal(payload.adjacency.length, 16);
  assert.deepEqual(payload.palette, ['-', '-', '-', '-']);
});

test('Huemint response validation accepts only four valid hex colors', () => {
  assert.deepEqual(normalizeHuemintResponse({
    results: [{ palette: ['#FFFFFF', '#f4957a', '#00143b', '#a1cfa5'], score: -7.5 }]
  }), [{ colors: ['#ffffff', '#f4957a', '#00143b', '#a1cfa5'], score: -7.5 }]);
  assert.throws(() => normalizeHuemintResponse({ results: [{ palette: ['red'] }] }));
});

test('Illustration 1 request uses Huemint current six-color contrast graph', () => {
  const payload = createIllustrationRequest();
  assert.equal(payload.page, 'illustration-1');
  assert.equal(payload.num_colors, 6);
  assert.equal(payload.adjacency.length, 36);
  assert.deepEqual(payload.adjacency.map(Number), ILLUSTRATION_1_DEFAULT_MATRIX);
  assert.equal(normalizeHuemintResponse({
    results: [{ palette: ['#ffffff', '#111111', '#ff0000', '#00ff00', '#0000ff', '#ffff00'] }]
  }, 6)[0].colors.length, 6);
});

test('Illustration 3 request uses Huemint current eleven-color role graph', () => {
  const payload = createIllustration3Request();
  assert.equal(payload.page, 'illustration-3');
  assert.equal(payload.num_colors, 11);
  assert.equal(payload.palette.length, 11);
  assert.equal(payload.adjacency.length, 121);
  assert.deepEqual(payload.adjacency.map(Number), ILLUSTRATION_3_DEFAULT_MATRIX);
});

test('API client sends a POST to the page proxy with browser-origin headers', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ results: [{ palette: ['#ffffff', '#f4957a', '#00143b', '#a1cfa5'], score: -7.5 }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  const payload = createWebsiteMagazineRequest({ numResults: 1 });
  await requestHuemintPalettes(payload, { fetchImpl, retries: 0 });
  assert.equal(request.url, HUEMINT_API_URL);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.origin, 'https://huemint.com');
  assert.equal(JSON.parse(request.options.body).page, 'website-magazine');
});

test('API client does not retry a non-rate-limited 4xx response', async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    return new Response('not found', { status: 404 });
  };
  await assert.rejects(
    requestHuemintPalettes(createWebsiteMagazineRequest(), { fetchImpl, retries: 2, sleep: async () => {} }),
    /HTTP 404/
  );
  assert.equal(attempts, 1);
});

test('collector enforces bounded requests, delay, and palette count', () => {
  assert.deepEqual(parseCollectorArgs([]), {
    requests: 1,
    delayMs: 5_000,
    maxPalettes: 10,
    preset: 'default',
    mode: 'transformer',
    temperature: 1.3,
    template: 'website-magazine',
    outputDirectory: 'research/data/huemint'
  });
  assert.throws(() => parseCollectorArgs([`--requests=${COLLECTION_LIMITS.maxRequestsPerRun + 1}`]));
  assert.throws(() => parseCollectorArgs([`--delay-ms=${COLLECTION_LIMITS.minDelayMs - 1}`]));
});

test('local engine returns real corpus colors deterministically without synthesis', () => {
  const payload = createWebsiteMagazineRequest();
  const source = [
    makeCorpusRecord({ colors: ['#ffffff', '#f4957a', '#00143b', '#a1cfa5'], score: -7.5 }, payload, '2026-09-27T00:00:00.000Z'),
    makeCorpusRecord({ colors: ['#eff2f6', '#9eb2c7', '#070407', '#182d62'], score: -7.6 }, payload, '2026-09-27T00:00:01.000Z')
  ];
  assert.equal(source[0].id, paletteId(source[0].colors));
  const first = selectRealHuemintPalette(source, { seed: 'same-seed' });
  const second = selectRealHuemintPalette(source, { seed: 'same-seed' });
  assert.deepEqual(first.colors, second.colors);
  assert(source.some(record => record.colors.join('|') === first.colors.join('|')));
  assert.equal(first.localSelection.synthesizedColors, false);
});

test('research preview uses only the captured local corpus', () => {
  assert.match(appSource, /id="huemintLocalGenerate"/);
  assert.match(appSource, /id="huemintLocalBack"/);
  assert.match(appSource, /id="huemintLocalForward"/);
  assert.match(appSource, /id="huemintLocalMode"/);
  assert.match(appSource, /js\/huemint-corpus\.js/);
  assert.match(appSource, /js\/huemint-generator\.js/);
  assert.match(browserCorpusSource, /window\.HUEMINT_LOCAL_CORPUS/);
  assert.match(browserCorpusSource, /window\.HUEMINT_TEMPLATE_CATALOG/);
  assert.match(generatorSource, /applyListPaletteToAllThreeWindows/);
  assert.doesNotMatch(generatorSource, /fetch\s*\(/);
  assert.doesNotMatch(generatorSource, /Math\.random/);
  assert.doesNotMatch(generatorSource, /mixHex/);
  assert.match(generatorSource, /applyListPaletteToAllThreeWindows\(record\.colors, \{ direct: true \}\)/);
  assert.match(generatorSource, /\{ direct: true \}/);
  assert.match(appSource, /options\.direct && directColors\.length/);
  assert.match(generatorSource, /palettePlaygroundHuemintFavoritesV1/);
  assert.match(generatorSource, /function qualityScore/);
  assert.match(generatorSource, /function paletteDistance/);
  assert.match(generatorSource, /function chooseNextRecord/);
  assert.match(generatorSource, /function addToHistory/);
  assert.match(generatorSource, /trackHistory: false/);
  assert.match(generatorSource, /creative: 'Creative'/);
  assert.match(generatorSource, /function removeFavorite/);
  assert.match(generatorSource, /function setSelectedFavorite/);
  assert.match(generatorSource, /favoriteSelection: true/);
  assert.match(appSource, /id="huemintLocalRemoveFavorite"[^>]*disabled>Remove selected favorite<\/button>/);
  assert.match(appSource, /\.huemintLocalFavoriteItem\.is-selected/);
  assert.doesNotMatch(generatorSource, /huemintLocalDelete/);
  assert.match(appSource, /max-height:184px;overflow-y:auto/);
  assert.doesNotMatch(generatorSource, /indexedDB\.deleteDatabase/);
});

test('palette count changes preserve the active Huemint source colors', () => {
  assert.match(appSource, /function resizeDirectPaletteColors\(colors,targetCount\)/);
  assert.match(appSource, /activeListPaletteSourceColors=\[\.\.\.directColors\]/);
  assert.match(appSource, /activeListPaletteDirect=Boolean\(options\.direct\)/);
  assert.match(appSource, /applyListPaletteToAllThreeWindows\(activeListPaletteSourceColors,\{/);
  assert.match(appSource, /preserveSource:true/);
  assert.match(appSource, /Current palette resized to \$\{imagePaletteCount\} colors/);
});

test('generator progress follows unique history and the active collection total', () => {
  assert.match(generatorSource, /function progressLabel\(\)/);
  assert.match(generatorSource, /`\$\{historyIndex \+ 1\} of \$\{activeCorpus\.length\} palettes`/);
  assert.match(generatorSource, /history\.slice\(0, historyIndex \+ 1\)/);
  assert.match(generatorSource, /new Set\(history\.map\(record => record\.id\)\)\.size >= activeCorpus\.length/);
  assert.match(generatorSource, /resetHistory\(null\)/);
  assert.match(generatorSource, /showProgress: false/);
  assert.doesNotMatch(appSource, /id="huemintLocalNote"/);
  assert.doesNotMatch(generatorSource, /huemintLocalNote/);
});

test('app typography follows Huemint Roboto styling including controls', () => {
  assert.match(appSource, /id="huemintTypographyStyles"/);
  assert.match(appSource, /--huemint-font:Roboto/);
  assert.match(appSource, /url\("fonts\/Roboto-Regular\.ttf"\)/);
  assert.match(appSource, /url\("fonts\/Roboto-Medium\.ttf"\)/);
  assert.match(appSource, /url\("fonts\/Roboto-SemiBold\.ttf"\)/);
  assert.match(appSource, /button,input,select,textarea,option/);
  assert.match(appSource, /input::placeholder,textarea::placeholder/);
  assert.match(appSource, /select option,\s*select optgroup/);
  assert.match(appSource, /select option\{font-weight:400!important\}/);
  assert.match(appSource, /select optgroup\{font-weight:500!important\}/);
  assert.match(appSource, /font-weight:500/);
  assert.match(appSource, /font-weight:600/);
});

test('local palette controls follow Huemint button treatment', () => {
  assert.match(appSource, /#huemintLocalGenerate::after\{content:none/);
  assert.match(appSource, /#huemintLocalBack,#huemintLocalForward\{width:40px/);
  assert.match(appSource, /id="huemintLocalBack"[^>]+aria-label="Previous palette"[^>]*>←<\/button>/);
  assert.match(appSource, /id="huemintLocalForward"[^>]+aria-label="Next palette"[^>]*>→<\/button>/);
});

test('design polish keeps layout responsive and interaction state local', () => {
  assert.match(appSource, /id="designPolishV1Styles"/);
  assert.match(appSource, /--sidebar-width:clamp\(480px,34vw,600px\)/);
  assert.match(appSource, /--ui-control-height:46px/);
  assert.match(appSource, /\.compareStage\.has-expanded/);
  assert.match(appSource, /id="designPolishV1Script"/);
  assert.match(appSource, /palettePlaygroundDesignSectionsV1/);
  assert.doesNotMatch(appSource, /indexedDB\.deleteDatabase/);
});

test('image workflow provides persistent navigation and accessible artwork controls', () => {
  assert.match(appSource, /class="sidebarQuickNav"/);
  assert.match(appSource, /data-scroll-target="paletteSection"/);
  assert.match(appSource, /data-scroll-target="imageLibrarySection"/);
  assert.match(appSource, /data-scroll-target="recolorSection"/);
  assert.match(appSource, /window\.palettePlaygroundScrollSidebarTo=scrollSidebarTo/);
  assert.match(appSource, /card\.addEventListener\("dblclick"/);
  assert.match(appSource, /id="fit"[^>]*>Fit artwork<\/button>/);
  assert.match(appSource, /if\(!e\.ctrlKey && !e\.metaKey\) return/);
  assert.match(appSource, /data-art-pane="original"/);
  assert.match(appSource, /data-art-pane="golden"/);
  assert.match(appSource, /data-art-pane="mixes"/);
  assert.match(appSource, /const artworkRoot=artHost\.firstElementChild\?\.firstElementChild/);
  assert.match(appSource, /event\.target===artHost\.firstElementChild \|\| event\.target===artworkRoot/);
  assert.match(appSource, /Double-click the white background to enlarge or restore all three views/);
  assert.doesNotMatch(appSource, /indexedDB\.deleteDatabase/);
});

test('duplicate scanner offers a near-exact default without automatic deletion', () => {
  assert.match(appSource, /<option value="veryStrict" selected>Very strict · near-exact<\/option>/);
  assert.match(appSource, /metrics\.meanDiff<=2\.2/);
  assert.match(appSource, /metrics\.over16Fraction<=0\.008/);
  assert.match(appSource, /metrics\.edgeFraction<=0\.03/);
  assert.match(appSource, /metrics\.score>=95/);
  assert.match(appSource, /function duplicateScannerPairwiseGroups/);
  assert.match(appSource, /exactRedundantIndexes/);
  assert.match(appSource, /Nothing is uploaded or deleted automatically/);
});

test('palette matrix aligns roles and exposes RGB values without a persistent readout', () => {
  assert.match(appSource, /id="paletteMatrixV1Styles"/);
  assert.match(appSource, /class="paletteMatrixNumbers"/);
  assert.match(appSource, /Same color role in each column/);
  assert.match(appSource, /function paletteMatrixRgbText\(hex\)/);
  assert.match(appSource, /return `RGB \$\{r\}, \$\{g\}, \$\{b\}`/);
  assert.match(appSource, /sw\.setAttribute\("aria-label"/);
  assert.doesNotMatch(appSource, /id="paletteMatrixReadoutText"/);
  assert.doesNotMatch(appSource, /id="paletteMatrixCopy"/);
});

test('palette matching controls remove the duplicate mode and group advanced choices', () => {
  assert.match(appSource, /<option value="original" selected>Dominant Colors<\/option>/);
  assert.match(appSource, /<option value="keyColors">Distinct Key Colors<\/option>/);
  assert.match(appSource, /<optgroup label="Recommended">/);
  assert.match(appSource, /<optgroup label="Advanced">/);
  assert.doesNotMatch(appSource, /<option value="perceptualOnly">/);
  assert.match(appSource, /mode==="original" \|\| mode==="perceptualOnly"/);
});

test('palette list favorites are additive, local, and filterable', () => {
  assert.match(appSource, /id="favoritePalette"[^>]*>☆ Save favorite<\/button>/);
  assert.match(appSource, /palettePlaygroundListFavoritesV1/);
  assert.match(appSource, /function toggleSelectedPaletteFavorite\(\)/);
  assert.match(appSource, /Favorites \(\$\{favoriteCount\}\)/);
  assert.match(appSource, /★ Remove favorite/);
  assert.match(appSource, /aria-pressed/);
  assert.match(appSource, /class="paletteActionSecondaryRow"/);
  assert.match(appSource, /aria-label="Previous random palette"[^>]*>←<\/button>/);
  assert.match(appSource, /aria-label="Next random palette"[^>]*>→<\/button>/);
  assert.match(appSource, /deleteButton\.textContent=browsingFavorites \? "Delete from library" : "Delete palette"/);
  assert.doesNotMatch(appSource, /indexedDB\.deleteDatabase/);
});

test('catalog covers every Huemint navigation template', () => {
  assert.equal(HUEMINT_TEMPLATE_CATALOG.length, 27);
  assert.deepEqual([...new Set(HUEMINT_TEMPLATE_CATALOG.map(item => item.category))], [
    'Brand', 'Website', 'Gradient', 'Gradient + Background', 'Illustration', 'Bootstrap'
  ]);
  for (const item of HUEMINT_TEMPLATE_CATALOG) {
    assert.match(browserCorpusSource, new RegExp(`"slug": "${item.slug}"`));
  }
});
