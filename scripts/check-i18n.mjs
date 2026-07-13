// Guards against untranslated locale values: any non-English locale value that
// is byte-identical to the English source is flagged unless allowlisted below.
// TypeScript enforces key parity across locales, but it cannot catch English
// text pasted into a non-English file — this script can. Run via `npm run lint:i18n`.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const MESSAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/messages');
const LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'hi', 'ja', 'zh'];

// Keys whose values are intentionally locale-independent (examples, URLs).
const GLOBAL_ALLOW = new Set([
  'users.emailPlaceholder',
  'general.imageUrlPlaceholder',
  'workspace.imageUrlPlaceholder',
]);

// Genuine cognates: the correct translation happens to match the English text.
const PER_LOCALE_ALLOW = {
  de: new Set([
    'subscription.plan',
    'subscription.seats.limit',
    'subscription.items.limits',
    'subscription.versionLabel',
    'profile.name',
    'general.name',
    'beta.logoAlt',
    'beta.nameLabel',
    'security.passkeysTitle',
  ]),
  es: new Set(['settings.common.error', 'subscription.plan']),
  fr: new Set([
    'subscription.plan',
    'settings.titles.notifications',
    'settings.titles.permissions',
    'settings.sidebar.notifications',
    'settings.sidebar.permissions',
    'subscription.versionLabel',
    'beta.logoAlt',
    'permissions.title',
    // Feminine form for "clé d'accès" — matches English by coincidence.
    'security.inactive',
  ]),
};

// Values this short/technical are usually shared terms (OK, API, URL, …).
const IGNORE_VALUE = /^(?:[A-Z]{2,5}|OK|\W*|\d[\d\s.,%]*)$/;

const loadLocale = locale => {
  let src = readFileSync(join(MESSAGES_DIR, `${locale}.ts`), 'utf8');
  src = src.replace(/^import[^;]+;/m, '');
  src = src.replace(new RegExp(`export const ${locale}\\s*:\\s*SDKMessages\\s*=`), 'globalThis.__m ='); // eslint-disable-line
  eval(src);
  return globalThis.__m;
};

const flatten = (obj, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') flatten(value, `${prefix}${key}.`, out);
    else out[`${prefix}${key}`] = value;
  }
  return out;
};

const en = flatten(loadLocale('en'));
let failures = 0;
for (const locale of LOCALES.slice(1)) {
  const messages = flatten(loadLocale(locale));
  const allow = PER_LOCALE_ALLOW[locale] ?? new Set();
  const offenders = Object.keys(messages).filter(
    key =>
      messages[key] === en[key] &&
      typeof messages[key] === 'string' &&
      !IGNORE_VALUE.test(messages[key]) &&
      !GLOBAL_ALLOW.has(key) &&
      !allow.has(key)
  );
  if (offenders.length) {
    failures += offenders.length;
    console.error(`\n${locale}.ts has ${offenders.length} value(s) identical to en.ts:`);
    for (const key of offenders) console.error(`  ${key}: ${JSON.stringify(messages[key])}`);
  }
}

if (failures) {
  console.error(
    `\n${failures} untranslated value(s) found. Translate them, or add genuine cognates to the allowlist in scripts/check-i18n.mjs.`
  );
  process.exit(1);
}
console.log('lint:i18n — all locale values translated (or allowlisted cognates).');
