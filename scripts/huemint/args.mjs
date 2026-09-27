export const COLLECTION_LIMITS = Object.freeze({
  maxRequestsPerRun: 10,
  minDelayMs: 2_000,
  defaultDelayMs: 5_000,
  maxPalettesPerRun: 100
});

export function parseCollectorArgs(argv) {
  const values = Object.fromEntries(argv.map(argument => {
    const [key, value = 'true'] = argument.replace(/^--/, '').split('=', 2);
    return [key, value];
  }));
  const requests = Number(values.requests ?? 1);
  const delayMs = Number(values['delay-ms'] ?? COLLECTION_LIMITS.defaultDelayMs);
  const maxPalettes = Number(values['max-palettes'] ?? 10);

  if (!Number.isInteger(requests) || requests < 1 || requests > COLLECTION_LIMITS.maxRequestsPerRun) {
    throw new Error(`--requests must be 1-${COLLECTION_LIMITS.maxRequestsPerRun}`);
  }
  if (!Number.isInteger(delayMs) || delayMs < COLLECTION_LIMITS.minDelayMs) {
    throw new Error(`--delay-ms must be at least ${COLLECTION_LIMITS.minDelayMs}`);
  }
  if (!Number.isInteger(maxPalettes) || maxPalettes < 1 || maxPalettes > COLLECTION_LIMITS.maxPalettesPerRun) {
    throw new Error(`--max-palettes must be 1-${COLLECTION_LIMITS.maxPalettesPerRun}`);
  }

  return {
    requests,
    delayMs,
    maxPalettes,
    preset: values.preset ?? 'default',
    mode: values.mode ?? 'transformer',
    temperature: Number(values.temperature ?? 1.3),
    outputDirectory: values.output ?? 'research/data/huemint'
  };
}
