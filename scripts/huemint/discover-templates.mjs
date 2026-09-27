import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HUEMINT_TEMPLATE_CATALOG } from '../../research/huemint/template-catalog.mjs';

const outputPath = path.resolve('research/data/huemint/templates.json');
const delayMs = 500;
const definitions = [];

function extractDefinition(html, item) {
  const paletteMatch = html.match(/var\s+palette_num\s*=\s*(\d+)/);
  const matrixMatch = html.match(/var\s+matrix_default\s*=\s*\[([\s\S]*?)\]/);
  if (!paletteMatch || !matrixMatch) throw new Error(`Could not discover ${item.slug}`);
  const numColors = Number(paletteMatch[1]);
  const adjacency = (matrixMatch[1].match(/\d+/g) || []).map(Number);
  if (adjacency.length !== numColors * numColors) {
    throw new Error(`${item.slug} matrix has ${adjacency.length} values; expected ${numColors * numColors}`);
  }
  return { ...item, numColors, adjacency };
}

for (const [index, item] of HUEMINT_TEMPLATE_CATALOG.entries()) {
  const response = await fetch(`https://huemint.com/${item.slug}/`, {
    headers: { accept: 'text/html' },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`${item.slug} returned HTTP ${response.status}`);
  definitions.push(extractDefinition(await response.text(), item));
  if (index + 1 < HUEMINT_TEMPLATE_CATALOG.length) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(definitions, null, 2)}\n`, 'utf8');
console.log(`Discovered ${definitions.length} Huemint templates in ${outputPath}`);
