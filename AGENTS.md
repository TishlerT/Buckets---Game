# Agents

## Cursor Cloud specific instructions

- **Project state**: This repository (`Buckets---Game`) is in early scaffolding stage. As of now, there is no application code, `package.json`, or dependencies. The `.gitignore` is configured for a Node.js project.
- **Update script**: The update script guards `npm install` behind a `package.json` existence check (`test -f package.json && npm install || true`). Once application code and a `package.json` are added, the update script will automatically start installing dependencies. Update it if the project adopts a different package manager (yarn, pnpm, bun).
- **Node.js**: Node.js v22 and npm v10 are available in the environment by default.
- **No lint/test/build**: There are currently no lint, test, or build commands to run. These should be configured once the project is initialized with application code.
