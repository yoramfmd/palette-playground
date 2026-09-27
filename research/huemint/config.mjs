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

export const ILLUSTRATION_1_DEFAULT_MATRIX = Object.freeze([
  0, 75, 33, 45, 31, 18,
  75, 0, 58, 51, 77, 77,
  33, 58, 0, 0, 0, 0,
  45, 51, 0, 0, 0, 0,
  31, 77, 0, 0, 0, 0,
  18, 77, 0, 0, 0, 0
]);

export const ILLUSTRATION_3_DEFAULT_MATRIX = Object.freeze([
  0, 85, 75, 45, 33, 21, 38, 24, 26, 26, 24,
  85, 0, 14, 42, 55, 90, 54, 74, 87, 100, 97,
  75, 14, 0, 31, 47, 75, 49, 68, 79, 89, 91,
  45, 42, 31, 0, 0, 0, 0, 0, 0, 0, 0,
  33, 55, 47, 0, 0, 28, 0, 0, 0, 0, 0,
  21, 90, 75, 0, 28, 0, 0, 0, 0, 0, 0,
  38, 54, 49, 0, 0, 0, 0, 20, 0, 0, 0,
  24, 74, 68, 0, 0, 0, 20, 0, 0, 0, 0,
  26, 87, 79, 0, 0, 0, 0, 0, 0, 0, 0,
  26, 100, 89, 0, 0, 0, 0, 0, 0, 0, 0,
  24, 97, 91, 0, 0, 0, 0, 0, 0, 0, 0
]);

function validateSharedOptions(mode, temperature, numResults) {
  if (!MODES.has(mode)) throw new Error(`Unsupported Huemint mode: ${mode}`);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2.4) {
    throw new Error('Temperature must be between 0 and 2.4');
  }
  const resultLimit = mode === 'diffusion' ? 5 : 50;
  if (!Number.isInteger(numResults) || numResults < 1 || numResults > resultLimit) {
    throw new Error(`numResults must be between 1 and ${resultLimit} for ${mode}`);
  }
}

export function createWebsiteMagazineRequest({
  mode = 'transformer',
  preset = 'default',
  temperature = 1.3,
  numResults = 10
} = {}) {
  validateSharedOptions(mode, temperature, numResults);
  if (!(preset in WEBSITE_MAGAZINE_MATRICES)) throw new Error(`Unsupported Website Magazine preset: ${preset}`);

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

export function createIllustrationRequest({
  mode = 'transformer',
  preset = 'default',
  temperature = 1.3,
  numResults = 10
} = {}) {
  validateSharedOptions(mode, temperature, numResults);
  if (preset !== 'default') throw new Error(`Unsupported Illustration 1 preset: ${preset}`);
  return {
    num_colors: 6,
    temperature: String(temperature),
    num_results: numResults,
    adjacency: ILLUSTRATION_1_DEFAULT_MATRIX.map(String),
    palette: ['-', '-', '-', '-', '-', '-'],
    mode,
    page: 'illustration-1',
    preset
  };
}

export function createIllustration3Request({
  mode = 'transformer',
  preset = 'default',
  temperature = 1.3,
  numResults = 10
} = {}) {
  validateSharedOptions(mode, temperature, numResults);
  if (preset !== 'default') throw new Error(`Unsupported Illustration 3 preset: ${preset}`);
  return {
    num_colors: 11,
    temperature: String(temperature),
    num_results: numResults,
    adjacency: ILLUSTRATION_3_DEFAULT_MATRIX.map(String),
    palette: Array(11).fill('-'),
    mode,
    page: 'illustration-3',
    preset
  };
}

export function createHuemintRequest({ template = 'website-magazine', ...options } = {}) {
  if (template === 'website-magazine') return createWebsiteMagazineRequest(options);
  if (template === 'illustration-1') return createIllustrationRequest(options);
  if (template === 'illustration-3') return createIllustration3Request(options);
  throw new Error(`Unsupported Huemint template: ${template}`);
}
