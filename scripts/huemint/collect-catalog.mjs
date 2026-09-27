import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requestHuemintPalettes } from '../../research/huemint/client.mjs';
import { makeCorpusRecord, readCorpus, writeCorpus } from '../../research/huemint/corpus.mjs';

const values = Object.fromEntries(process.argv.slice(2).map(argument => {
  const [key, value = 'true'] = argument.replace(/^--/, '').split('=', 2);
  return [key, value];
}));
const start = Number(values.start ?? 0);
const count = Number(values.count ?? 10);
const palettesPerTemplate = Number(values.palettes ?? 5);
const delayMs = Number(values['delay-ms'] ?? 3_000);

if (!Number.isInteger(start) || start < 0) throw new Error('--start must be a non-negative integer');
if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('--count must be 1-10');
if (!Number.isInteger(palettesPerTemplate) || palettesPerTemplate < 1 || palettesPerTemplate > 10) throw new Error('--palettes must be 1-10');
if (!Number.isInteger(delayMs) || delayMs < 2_000) throw new Error('--delay-ms must be at least 2000');

const outputDirectory = path.resolve('research/data/huemint');
const definitions = JSON.parse(await readFile(path.join(outputDirectory, 'templates.json'), 'utf8'));
const selected = definitions.slice(start, start + count);
const summary = [];

for (const [index, definition] of selected.entries()) {
  const jsonlPath = path.join(outputDirectory, `${definition.slug}.jsonl`);
  const existing = await readCorpus(jsonlPath);
  const recordsById = new Map(existing.map(record => [record.id, record]));
  const palette = Array(definition.numColors).fill('-');
  if (definition.slug.startsWith('bootstrap-') && palette.length > 1) palette[1] = '#ffffff';
  const payload = {
    num_colors: definition.numColors,
    temperature: '1.3',
    num_results: palettesPerTemplate,
    adjacency: definition.adjacency.map(String),
    palette,
    mode: 'transformer',
    page: definition.slug,
    preset: 'default'
  };
  const results = await requestHuemintPalettes(payload);
  let added = 0;
  for (const result of results) {
    const record = makeCorpusRecord(result, payload);
    if (!recordsById.has(record.id) && added < palettesPerTemplate) {
      recordsById.set(record.id, record);
      added += 1;
    }
  }
  await writeCorpus([...recordsById.values()], outputDirectory, definition.slug);
  summary.push({ template: definition.slug, received: results.length, added, total: recordsById.size });
  console.log(`${definition.slug}: added ${added}, total ${recordsById.size}`);
  if (index + 1 < selected.length) await new Promise(resolve => setTimeout(resolve, delayMs));
}

console.log(JSON.stringify({ start, count: selected.length, palettesPerTemplate, summary }, null, 2));
