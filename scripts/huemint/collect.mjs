import path from 'node:path';
import { parseCollectorArgs } from './args.mjs';
import { createWebsiteMagazineRequest } from '../../research/huemint/config.mjs';
import { requestHuemintPalettes } from '../../research/huemint/client.mjs';
import { makeCorpusRecord, readCorpus, writeCorpus } from '../../research/huemint/corpus.mjs';

const options = parseCollectorArgs(process.argv.slice(2));
const outputDirectory = path.resolve(options.outputDirectory);
const jsonlPath = path.join(outputDirectory, 'website-magazine.jsonl');
const existing = await readCorpus(jsonlPath);
const recordsById = new Map(existing.map(record => [record.id, record]));
let received = 0;
let added = 0;

for (let requestIndex = 0; requestIndex < options.requests && added < options.maxPalettes; requestIndex += 1) {
  const payload = createWebsiteMagazineRequest({
    mode: options.mode,
    preset: options.preset,
    temperature: options.temperature,
    numResults: Math.min(10, options.maxPalettes - added)
  });
  const results = await requestHuemintPalettes(payload);
  received += results.length;

  for (const result of results) {
    const record = makeCorpusRecord(result, payload);
    if (!recordsById.has(record.id) && added < options.maxPalettes) {
      recordsById.set(record.id, record);
      added += 1;
    }
  }

  // Persist after every successful request so an interrupted run can resume
  // from the last completed batch without losing collected palettes.
  await writeCorpus([...recordsById.values()], outputDirectory);

  if (requestIndex + 1 < options.requests && added < options.maxPalettes) {
    await new Promise(resolve => setTimeout(resolve, options.delayMs));
  }
}

const files = await writeCorpus([...recordsById.values()], outputDirectory);
console.log(JSON.stringify({
  requests: options.requests,
  delayMs: options.delayMs,
  received,
  added,
  totalUnique: recordsById.size,
  files
}, null, 2));
