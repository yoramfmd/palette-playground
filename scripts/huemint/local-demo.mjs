import path from 'node:path';
import { readCorpus } from '../../research/huemint/corpus.mjs';
import { selectRealHuemintPalette } from '../../research/huemint/local-engine.mjs';

const corpusPath = path.resolve(process.argv[2] ?? 'research/data/huemint/website-magazine.jsonl');
const records = await readCorpus(corpusPath);
const selection = selectRealHuemintPalette(records, {
  preset: process.argv[3] ?? 'default',
  seed: process.argv[4] ?? 'palette-playground'
});

console.log(JSON.stringify(selection, null, 2));
