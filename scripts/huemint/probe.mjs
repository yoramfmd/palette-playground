import { createWebsiteMagazineRequest } from '../../research/huemint/config.mjs';
import { requestHuemintPalettes } from '../../research/huemint/client.mjs';

const payload = createWebsiteMagazineRequest({ numResults: 1 });
const results = await requestHuemintPalettes(payload, { retries: 1 });

console.log(JSON.stringify({
  ok: true,
  requestedResults: payload.num_results,
  receivedResults: results.length,
  first: results[0]
}, null, 2));
