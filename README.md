# @saas-os/react

A React library with shadcn components, Tailwind CSS, and axios for building modern web applications.

## Features

- 🎨 **Scoped CSS**: All styles are prefixed with `saas-os-` to prevent conflicts with existing styles
- 🧩 **Custom Components**: Built with shadcn/ui design system
- 🌐 **API Client**: Axios-based HTTP client with interceptors and error handling
- 📦 **Tree Shaking**: Only import what you need
- 🎯 **TypeScript**: Full TypeScript support
- 🚀 **Platform Agnostic**: Works with any React setup

## Installation

```bash
npm install @saas-os/react
```

## Usage

To use the components with proper styles, **import the CSS file in your app's root file** (e.g., `src/app/layout.tsx`, `src/app/globals.css`, or `pages/_app.tsx` for Next.js):

```js
import '@saas-os/react/dist/saas-os.css';
```

This ensures all SaaS OS component styles are applied.

### Basic Setup

```tsx
import { Button, Card, DataCard } from '@saas-os/react';

function App() {
  return (
    <div>
      <Button>Click me</Button>
      <Card>
        <CardHeader>
          <CardTitle>Hello World</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
```

### API Client Usage

```tsx
import { ApiClient, defaultApiClient } from '@saas-os/react';

// Use the default client
const data = await defaultApiClient.get('/api/users');

// Or create a custom client
const customClient = new ApiClient({
  baseURL: 'https://api.myapp.com',
  timeout: 5000,
});

const users = await customClient.get('/users');
```

### DataCard Component

The `DataCard` component is a ready-to-use component that fetches and displays data:

```tsx
import { DataCard } from '@saas-os/react';

function MyComponent() {
  return (
    <DataCard
      title="User List"
      description="Displaying users from API"
      apiEndpoint="/api/users"
      onDataLoad={(data) => console.log('Data loaded:', data)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

## Available Components

### UI Components

- `Button` - Button component with multiple variants
- `Card` - Card container with header, content, and footer
- `Input` - Input field component

### Custom Components

- `DataCard` - Data fetching and display component

### Utilities

- `cn()` - Class name utility for merging Tailwind classes
- `getCSSVariables()` - Get CSS custom properties for theming

## CSS Scoping

All styles are scoped with the `saas-os-` prefix to prevent conflicts:

```css
.saas-os-bg-primary { /* ... */ }
.saas-os-text-foreground { /* ... */ }
```

## API Client Features

- Automatic authentication token handling
- Request/response interceptors
- Error handling
- Configurable base URL and headers
- TypeScript support

## Development

### Local Development with Yalc

1. Install dependencies:
```bash
npm install
```

2. Build the library:
```bash
npm run build
```

3. Push to yalc:
```bash
npm run yalc:push
```

4. In your test project, add the package:
```bash
yalc add @saas-os/react
```

### Build Commands

- `npm run build` - Build the library
- `npm run dev` - Watch mode for development
- `npm run clean` - Clean build directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT 