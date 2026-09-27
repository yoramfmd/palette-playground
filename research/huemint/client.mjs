import { HUEMINT_API_URL } from './config.mjs';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeHuemintResponse(value, expectedColors = 4) {
  if (!value || !Array.isArray(value.results)) throw new Error('Huemint response has no results array');

  return value.results.map((result, index) => {
    if (!result || !Array.isArray(result.palette) || result.palette.length !== expectedColors) {
      throw new Error(`Huemint result ${index} does not contain an expected ${expectedColors}-color palette`);
    }
    const colors = result.palette.map(color => String(color).toLowerCase());
    if (!colors.every(color => HEX_COLOR.test(color))) {
      throw new Error(`Huemint result ${index} contains an invalid color`);
    }
    return {
      colors,
      score: Number.isFinite(result.score) ? result.score : null
    };
  });
}

function retryDelay(attempt, retryAfter) {
  const retryAfterMs = Number.parseFloat(retryAfter) * 1000;
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.min(retryAfterMs, 30_000);
  return Math.min(2_000 * (2 ** attempt), 30_000);
}

export async function requestHuemintPalettes(payload, {
  fetchImpl = fetch,
  retries = 2,
  timeoutMs = 20_000,
  sleep = delay => new Promise(resolve => setTimeout(resolve, delay))
} = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(HUEMINT_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          accept: 'application/json, text/javascript, */*; q=0.01',
          origin: 'https://huemint.com',
          referer: `https://huemint.com/${payload.page}/`,
          'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (response.ok) return normalizeHuemintResponse(await response.json(), payload.num_colors);

      const message = `Huemint returned HTTP ${response.status}`;
      if (response.status !== 429 && response.status < 500) {
        const error = new Error(message);
        error.retryable = false;
        throw error;
      }
      lastError = new Error(message);
      if (attempt < retries) await sleep(retryDelay(attempt, response.headers.get('retry-after')));
    } catch (error) {
      lastError = error;
      if (error.retryable === false) throw error;
      if (attempt < retries) await sleep(retryDelay(attempt, null));
    }
  }

  throw lastError ?? new Error('Huemint request failed');
}
