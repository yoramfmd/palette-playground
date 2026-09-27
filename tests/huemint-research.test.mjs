import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createIllustration3Request, createIllustrationRequest, createWebsiteMagazineRequest, HUEMINT_API_URL, ILLUSTRATION_1_DEFAULT_MATRIX, ILLUSTRATION_3_DEFAULT_MATRIX } from '../research/huemint/config.mjs';
import { normalizeHuemintResponse, requestHuemintPalettes } from '../research/huemint/client.mjs';
import { makeCorpusRecord, paletteId } from '../research/huemint/corpus.mjs';
import { selectRealHuemintPalette } from '../research/huemint/local-engine.mjs';
import { COLLECTION_LIMITS, parseCollectorArgs } from '../scripts/huemint/args.mjs';

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
  assert.match(appSource, /js\/huemint-corpus\.js/);
  assert.match(appSource, /js\/huemint-generator\.js/);
  assert.match(browserCorpusSource, /window\.HUEMINT_LOCAL_CORPUS/);
  assert.match(generatorSource, /applyListPaletteToAllThreeWindows/);
  assert.doesNotMatch(generatorSource, /fetch\s*\(/);
  assert.doesNotMatch(generatorSource, /Math\.random/);
  assert.doesNotMatch(generatorSource, /mixHex/);
  assert.match(generatorSource, /directPaletteForSlots/);
  assert.match(generatorSource, /palettePlaygroundHuemintFavoritesV1/);
});
