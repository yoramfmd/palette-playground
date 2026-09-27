export const HUEMINT_API_URL = 'https://huemint.com/api/';

export const WEBSITE_MAGAZINE_MATRICES = Object.freeze({
  default: [
    0, 20, 90, 0,
    20, 0, 75, 50,
    90, 75, 0, 0,
    0, 50, 0, 0
  ],
  'high-contrast': [
    0, 15, 100, 50,
    15, 0, 85, 40,
    100, 85, 0, 0,
    50, 40, 0, 0
  ],
  'bright-light': [
    0, 10, 50, 35,
    10, 0, 50, 0,
    50, 50, 0, 0,
    35, 0, 0, 0
  ],
  pastel: [
    0, 10, 50, 35,
    10, 0, 45, 0,
    50, 45, 0, 0,
    35, 0, 0, 0
  ],
  vibrant: [
    0, 10, 65, 45,
    10, 0, 45, 30,
    65, 45, 0, 0,
    45, 30, 0, 0
  ],
  dark: [
    0, 25, 100, 50,
    25, 0, 60, 0,
    100, 60, 0, 0,
    50, 0, 0, 0
  ],
  'hyper-color': [
    0, 30, 90, 0,
    30, 0, 70, 50,
    90, 70, 0, 0,
    0, 50, 0, 0
  ]
});

const MODES = new Set(['transformer', 'diffusion', 'random']);

export function createWebsiteMagazineRequest({
  mode = 'transformer',
  preset = 'default',
  temperature = 1.3,
  numResults = 10
} = {}) {
  if (!MODES.has(mode)) throw new Error(`Unsupported Huemint mode: ${mode}`);
  if (!(preset in WEBSITE_MAGAZINE_MATRICES)) throw new Error(`Unsupported Website Magazine preset: ${preset}`);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2.4) {
    throw new Error('Temperature must be between 0 and 2.4');
  }

  const resultLimit = mode === 'diffusion' ? 5 : 50;
  if (!Number.isInteger(numResults) || numResults < 1 || numResults > resultLimit) {
    throw new Error(`numResults must be between 1 and ${resultLimit} for ${mode}`);
  }

  return {
    num_colors: 4,
    temperature: String(temperature),
    num_results: numResults,
    adjacency: WEBSITE_MAGAZINE_MATRICES[preset].map(String),
    palette: ['-', '-', '-', '-'],
    mode,
    page: 'website-magazine',
    preset
  };
}
