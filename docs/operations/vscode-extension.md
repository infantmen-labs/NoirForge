# VS Code extension

NoirForge includes a minimal VS Code extension under `packages/vscode-extension/`.

The extension is intended for developer ergonomics:

- run common NoirForge commands from the Command Palette
- stream logs into a dedicated output channel
- reuse the last `artifactName` / `outDir` between commands

## Commands

- `NoirForge: Init Template`
- `NoirForge: Flow`
- `NoirForge: Sizes`
- `NoirForge: Compute Analyze`
- `NoirForge: Open Artifacts Dir`
- `NoirForge: Open Out Dir`

## Run locally (Extension Development Host)

1) Open the extension folder in VS Code:

- `packages/vscode-extension/`

2) Create a local launch config (not committed; `.vscode/` is gitignored):

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

3) Run **Run Extension** from **Run and Debug**.

4) In the Extension Development Host window:

- open the NoirForge repo as a workspace
- run commands via the Command Palette

## Notes

- The extension runs `pnpm noirforge ...` from the workspace root.
- For `flow` and related commands, your machine still needs the pinned toolchain (`nargo`, `sunspot`) on `PATH`.
