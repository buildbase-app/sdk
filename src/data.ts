/**
 * @buildbase/sdk/data
 *
 * Reference data: countries, currencies, languages, timezones, beta form schema.
 * Separated from the main entry to keep the server bundle small (~30KB vs ~120KB).
 *
 * @example
 * ```ts
 * import { countries, currencies, timezones, languages } from '@buildbase/sdk/data'
 * import { betaFormSchema } from '@buildbase/sdk/data'
 * ```
 */

// ─── Reference Data ────────────────────────────────────────────────────────────
export { countries } from './api/data/countries';
export { currencies } from './api/data/currencies';
export { languages } from './api/data/languages';
export { timezones } from './api/data/timezones';

// ─── Beta Form Schema (Zod) ───────────────────────────────────────────────────
export { formSchema as betaFormSchema } from './api/beta/schema';
export type { formValuesType as BetaFormValues } from './api/beta/schema';
