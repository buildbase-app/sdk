# @saas-os/react

A React library with shadcn components, Tailwind CSS, and axios for building modern web applications.

## Installation

```bash
npm install @saas-os/react
```

## Development

### Local Development with Yalc

For local development and testing, this project uses [yalc](https://github.com/wclr/yalc) to simulate npm publishing locally.

#### Setup

1. Install yalc globally:
```bash
npm install -g yalc
```

2. Install dependencies:
```bash
npm install
```

#### Available Scripts

- `npm run build` - Build the library
- `npm run dev` - Build in watch mode (for development)
- `npm run push:sdk` - Build and push to yalc repository
- `npm run watch:push` - **NEW**: Watch for file changes and automatically build + push to yalc
- `npm run watch:push:light` - **NEW**: Lightweight alternative using chokidar-cli

#### Fast Development Workflow

For the fastest development experience, use the watch scripts:

```bash
# Start watching for changes and auto-push to yalc
npm run watch:push
```

This will:
1. Watch all files in the `src/` directory
2. Automatically rebuild when files change
3. Push the updated package to yalc
4. Allow you to test changes immediately in your consuming applications

#### Using in Other Projects

In your consuming project, add the local version:

```bash
yalc add @saas-os/react
```

Then update when changes are pushed:

```bash
yalc update @saas-os/react
```

## Features

- 🎨 **shadcn/ui Components** - Beautiful, accessible UI components
- 🎯 **Tailwind CSS** - Utility-first CSS framework
- 🔌 **Axios Integration** - HTTP client for API calls
- 📦 **TypeScript Support** - Full type safety
- 🚀 **Modern Build System** - Rollup for optimal bundling

## License

MIT
