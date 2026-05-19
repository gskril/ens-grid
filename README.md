# ENS Grid

An infinite, draggable grid of ENS avatars. Pan around to explore names, and click any avatar to open a profile card with their description, links, and socials pulled from ENS records.

Built with Vite + TypeScript, deployed as static assets via Cloudflare Workers. Profile and avatar data comes from [ens-api.gregskril.com](https://ens-api.gregskril.com).

## Local development

```sh
bun install
bun run dev
```

Then open the URL printed by Vite (usually `http://localhost:5173`).

## Build

```sh
bun run build      # type-check + build to ./dist
bun run preview    # preview the production build locally
```

The list of names rendered on the grid lives in `src/names.ts`.
