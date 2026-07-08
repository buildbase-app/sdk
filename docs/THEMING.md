# Theming the SDK UI

All SDK components — settings screens, dialogs, banners, empty states, sidebar — are styled exclusively through CSS custom properties. To match your brand, override the variables; no component forks or `!important` hacks needed.

## How it works

The SDK stylesheet (`@buildbase/sdk/css/styles.css`) defines a default light theme on `:root` and a dark theme on `.dark`. Every color in the UI resolves from these variables, so overriding them re-skins everything at once.

Values are **HSL triplets without the `hsl()` wrapper** (shadcn/ui convention), which lets the SDK derive tints — e.g. success banners use `hsl(var(--success) / 0.1)` for their background automatically.

## Override example

Load your overrides after the SDK stylesheet:

```css
:root {
  /* Brand */
  --primary: 262 83% 58%; /* your brand color — buttons, active nav, focus */
  --primary-foreground: 0 0% 100%;
  --radius: 0.75rem; /* corner rounding across all components */

  /* Surfaces & text */
  --background: 0 0% 100%;
  --foreground: 240 10% 4%;
  --muted: 240 5% 96%; /* subtle fills: loading bars, table headers */
  --muted-foreground: 240 4% 46%; /* secondary text, hints, labels */
  --border: 240 6% 90%;

  /* Status colors — banners, badges, progress bars */
  --destructive: 0 84% 60%; /* errors, danger zone, overage */
  --success: 142 72% 29%; /* success banners, paid badges, checkmarks */
  --warning: 26 90% 37%; /* warnings, expiring credits, near-limit */
  --info: 224 76% 48%; /* info notices, selected plans, usage bars */
}
```

## Full variable reference

| Variable                                     | Used for                                        |
| -------------------------------------------- | ----------------------------------------------- |
| `--background` / `--foreground`              | Page surface and main text                      |
| `--card` / `--card-foreground`               | Card surfaces                                   |
| `--popover` / `--popover-foreground`         | Dropdowns, popovers                             |
| `--primary` / `--primary-foreground`         | Buttons, active sidebar item, selected states   |
| `--secondary` / `--secondary-foreground`     | Secondary buttons                               |
| `--muted` / `--muted-foreground`             | Subtle fills, secondary text, disabled states   |
| `--accent` / `--accent-foreground`           | Hover highlights                                |
| `--destructive` / `--destructive-foreground` | Errors, delete actions, overage indicators      |
| `--success` / `--success-foreground`         | Success banners, active/paid badges             |
| `--warning` / `--warning-foreground`         | Warnings, permission notices, near-limit states |
| `--info` / `--info-foreground`               | Info notices, plan highlights, usage bars       |
| `--border` / `--input` / `--ring`            | Borders, input outlines, focus rings            |
| `--radius`                                   | Border radius scale (lg/md/sm derive from it)   |

## Dark mode

Add the `.dark` class to a root element and override the same variables under `.dark { … }`. The SDK ships dark defaults for every variable.

## Components that work without the stylesheet

`FullScreenLoader` and the `ErrorBoundary` fallback use inline styles so they render correctly before/without CSS loading. They still read the variables (with hard-coded fallbacks), so brand overrides apply to them too once your CSS is present.

## Rules for SDK contributors

- Never use Tailwind palette classes (`gray-*`, `blue-*`, `red-*`, `green-*`, `amber-*`, `slate-*`, `bg-white`, `text-white`) in components — they bypass theming. Use the semantic tokens above.
- Soft status fills are alpha tints of the token: `bg-success/10` (background), `border-success/20` (border), `text-success` (text).
- CI-check locally: `grep -rE '(bg|text|border|divide)-[a-z]+-[0-9]{2,3}|bg-white|text-white|#[0-9a-fA-F]{3,6}' src/components src/providers --include='*.tsx'` should return nothing (the pattern catches every Tailwind palette shade and raw hex).
