import { createHash } from 'node:crypto';

function stableIndex(seed, length) {
  const digest = createHash('sha256').update(String(seed)).digest();
  return digest.readUInt32BE(0) % length;
}

export function selectRealHuemintPalette(records, {
  preset = 'default',
  generator = 'transformer',
  seed = 'palette-playground',
  offset = 0
} = {}) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('The local Huemint corpus is empty');

  const exact = records.filter(record => record.preset === preset && record.generator === generator);
  const sameGenerator = records.filter(record => record.generator === generator);
  const candidates = exact.length ? exact : sameGenerator.length ? sameGenerator : records;
  const index = (stableIndex(seed, candidates.length) + Math.max(0, offset)) % candidates.length;
  const selected = candidates[index];

  return {
    ...selected,
    colors: [...selected.colors],
    adjacency: [...selected.adjacency],
    localSelection: {
      corpusBacked: true,
      synthesizedColors: false,
      candidateCount: candidates.length,
      index
    }
  };
}
