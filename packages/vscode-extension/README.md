# NoirForge VS Code Extension

This is a minimal VS Code extension for running NoirForge commands from within VS Code.

## Commands

- **NoirForge: Init Template**
- **NoirForge: Flow**
- **NoirForge: Sizes**
- **NoirForge: Compute Analyze**
- **NoirForge: Open Artifacts Dir**
- **NoirForge: Open Out Dir**

## Development (run locally)

### Prerequisites

- Node + pnpm (see repo root `tool-versions`)
- NoirForge toolchain on PATH (`nargo`, `sunspot`) if you plan to run `flow`

### Run in Extension Development Host

1. Open this folder in VS Code:

- `packages/vscode-extension/`

2. Go to **Run and Debug** and run **Run Extension**.

If you don't already have an extension launch config, create it locally (it is intentionally not committed because `.vscode/` is gitignored):

Create `packages/vscode-extension/.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

3. In the Extension Development Host window:

- open a workspace containing the NoirForge repo
- open the Command Palette and run `NoirForge: Flow`

## Notes

- The extension executes `pnpm noirforge ...` from the workspace root and streams output to a dedicated output channel named `NoirForge`.
- It remembers the last `artifactName` and `outDir` you used to reduce re-prompting.
