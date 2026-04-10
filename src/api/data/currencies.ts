import { countries } from './countries';

const currencies: {
  value: string;
  text: string;
  icon: any;
}[] = countries.map(e => {
  return {
    value: e.currencyCode,
    text: e.currencyCode,
    icon: e.currencyIcon ?? null,
  };
});

// remove duplicates
const uniqueCurrencies = Array.from(new Set(currencies.map(e => e.value)))
  .map(value => {
    return currencies.find(e => e.value === value);
  })
  .filter(e => e !== undefined);

export { uniqueCurrencies as currencies };
