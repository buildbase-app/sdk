/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  prefix: 'saas-os-',
  important: true,
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--saas-os-border))',
        input: 'hsl(var(--saas-os-input))',
        ring: 'hsl(var(--saas-os-ring))',
        background: 'hsl(var(--saas-os-background))',
        foreground: 'hsl(var(--saas-os-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--saas-os-primary))',
          foreground: 'hsl(var(--saas-os-primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--saas-os-secondary))',
          foreground: 'hsl(var(--saas-os-secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--saas-os-destructive))',
          foreground: 'hsl(var(--saas-os-destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--saas-os-muted))',
          foreground: 'hsl(var(--saas-os-muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--saas-os-accent))',
          foreground: 'hsl(var(--saas-os-accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--saas-os-popover))',
          foreground: 'hsl(var(--saas-os-popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--saas-os-card))',
          foreground: 'hsl(var(--saas-os-card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--saas-os-radius)',
        md: 'calc(var(--saas-os-radius) - 2px)',
        sm: 'calc(var(--saas-os-radius) - 4px)'
      }
    }
  },
  plugins: []
}
