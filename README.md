# OPHare Studios Portal

A landing page and hosting hub for web applications, game engines, and utilities built by [Oliver Hare (Buggy-Virus)](https://buggy-virus.github.io).

## Project Overview

This repository is configured to host various interactive applications on GitHub Pages. The styling, backgrounds, and assets mirror the design language of `buggy-virus.github.io`.

### Hosted Applications
* **[Potluck](./potluck)** - Tactical isometric RPG built with Godot featuring procedural level generation.
* **[Daedalus](./daedalus)** - Virtual tabletop simulator built with Unity supporting custom scripting via dScript.
* **[Bridge Troll](./bridge_troll)** - Pathfinding and day/night simulation built using Godot C#.

## Development & Hosting

Interactive tools in `src/` are written in **TypeScript** and compiled using `tsc`.

### Building
```bash
# Install dev dependencies
npm install

# Compile TypeScript to pokemon/dist/
npm run build

# Watch mode during development
npm run watch
```

Deployments are managed via GitHub Pages. Commits pushed to the `main` branch publish directly to the live site.
