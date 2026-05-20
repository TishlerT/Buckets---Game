# Buckets Game

A browser-based ball-catching game built with Vite + TypeScript.

## Project Structure

```
src/
  main.ts       - Entry point, game loop, event handlers
  game.ts       - Pure game logic (state, physics, collision detection)
  renderer.ts   - Canvas rendering
  game.test.ts  - Unit tests for game logic
  style.css     - Styles
index.html      - HTML entry point
```

## Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` (port 3000) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Tests | `npm run test` |
| Tests (watch) | `npm run test:watch` |

## Cursor Cloud specific instructions

- The dev server runs on port 3000 with `npm run dev`. It uses Vite with HMR.
- Game logic is in `src/game.ts` and is fully testable without a browser (pure functions, no DOM).
- The renderer in `src/renderer.ts` requires a canvas context and is best tested via the browser.
- Tests use Vitest and run in Node environment (no browser needed for unit tests).
- ESLint uses flat config (`eslint.config.js`) with typescript-eslint.
- After `npm install`, all tools (`vite`, `vitest`, `eslint`) are available via `npx` or `npm run` scripts.
