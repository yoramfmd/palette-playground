import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function paletteId(colors) {
  return createHash('sha256').update(colors.map(color => color.toLowerCase()).join('|')).digest('hex').slice(0, 20);
}

export function makeCorpusRecord(result, payload, capturedAt = new Date().toISOString()) {
  return {
    id: paletteId(result.colors),
    colors: result.colors,
    score: result.score,
    generator: payload.mode,
    creativity: Number(payload.temperature),
    preset: payload.preset,
    template: payload.page,
    adjacency: payload.adjacency.map(Number),
    capturedAt,
    source: 'huemint-website-magazine'
  };
}

export async function readCorpus(filePath) {
  try {
    const source = await readFile(filePath, 'utf8');
    return source.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export async function writeCorpus(records, outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const jsonlPath = path.join(outputDirectory, 'website-magazine.jsonl');
  const csvPath = path.join(outputDirectory, 'website-magazine.csv');
  const sorted = [...records].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt) || a.id.localeCompare(b.id));
  const jsonl = `${sorted.map(record => JSON.stringify(record)).join('\n')}\n`;
  const columns = ['id', 'colors', 'score', 'generator', 'creativity', 'preset', 'template', 'adjacency', 'capturedAt', 'source'];
  const csv = [columns.join(','), ...sorted.map(record => columns.map(column => csvCell(record[column])).join(','))].join('\n') + '\n';
  await writeFile(jsonlPath, jsonl, 'utf8');
  await writeFile(csvPath, csv, 'utf8');
  return { jsonlPath, csvPath };
}
