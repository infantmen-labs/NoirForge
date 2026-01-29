const cp = require('node:child_process');
const path = require('node:path');

const vscode = require('vscode');

const STATE_KEYS = {
  lastArtifactName: 'noirforge.lastArtifactName',
  lastOutDir: 'noirforge.lastOutDir',
  lastCircuitDir: 'noirforge.lastCircuitDir',
};

function getWorkspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return folders[0].uri.fsPath;
}

function createOutputChannel() {
  return vscode.window.createOutputChannel('NoirForge');
}

function spawnPnpm(args, { cwd, outputChannel }) {
  return new Promise((resolve, reject) => {
    outputChannel.appendLine(`$ pnpm ${args.join(' ')}`);

    const child = cp.spawn('pnpm', args, {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (d) => outputChannel.append(d.toString()));
    child.stderr.on('data', (d) => outputChannel.append(d.toString()));

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`command exited with code ${code}`));
    });
  });
}

async function pickFolder({ title, defaultUri }) {
  const res = await vscode.window.showOpenDialog({
    title,
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    defaultUri,
  });
  if (!res || res.length === 0) return null;
  return res[0].fsPath;
}

async function runWithProgress({ title, fn }) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async () => {
      await fn();
    },
  );
}

async function confirmOrPickFolder({ title, rootFsPath, lastFsPath }) {
  if (lastFsPath) {
    const choice = await vscode.window.showQuickPick([`Use last: ${lastFsPath}`, 'Pick a folder…'], {
      title,
      ignoreFocusOut: true,
    });
    if (!choice) return null;
    if (choice.startsWith('Use last: ')) return lastFsPath;
  }

  return pickFolder({ title, defaultUri: vscode.Uri.file(rootFsPath) });
}

async function getOrAskArtifactName({ defaultValue }) {
  const artifactName = await vscode.window.showInputBox({
    title: 'Artifact name',
    prompt: 'Name under artifacts/<artifact_name> (e.g. local_run)',
    value: defaultValue || '',
    ignoreFocusOut: true,
    validateInput: (v) => (v && v.trim() ? null : 'artifact name is required'),
  });
  return artifactName ? artifactName.trim() : null;
}

async function openFolderInOs(fsPath) {
  try {
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fsPath));
  } catch {
    await vscode.env.openExternal(vscode.Uri.file(fsPath));
  }
}

async function cmdInitTemplate({ outputChannel }) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const template = await vscode.window.showInputBox({
    title: 'NoirForge: Init Template',
    prompt: 'Template name (e.g. sum_a_b)',
    ignoreFocusOut: true,
    validateInput: (v) => (v && v.trim() ? null : 'template name is required'),
  });
  if (!template) return;

  const destDir = await pickFolder({
    title: 'Select destination folder (template will be created inside it)',
    defaultUri: vscode.Uri.file(root),
  });
  if (!destDir) return;

  const dest = path.join(destDir, template.trim());

  await runWithProgress({
    title: `NoirForge: init ${template.trim()}`,
    fn: async () => {
      await spawnPnpm(['noirforge', 'init', template.trim(), dest], { cwd: root, outputChannel });
    },
  });

  vscode.window.showInformationMessage(`Initialized template at ${dest}`);
}

async function cmdFlow({ outputChannel, context }) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const circuitDir = await pickFolder({
    title: 'Select circuit directory (project folder containing Noir circuit)',
    defaultUri: vscode.Uri.file(root),
  });
  if (!circuitDir) return;

  const artifactName = await getOrAskArtifactName({ defaultValue: path.basename(circuitDir) });
  if (!artifactName) return;

  const outDir = await pickFolder({
    title: 'Select output directory (where noirforge writes manifest + reports)',
    defaultUri: vscode.Uri.file(root),
  });
  if (!outDir) return;

  await runWithProgress({
    title: `NoirForge: flow (${artifactName})`,
    fn: async () => {
      await spawnPnpm(
        ['noirforge', 'flow', '--circuit-dir', circuitDir, '--artifact-name', artifactName, '--out-dir', outDir],
        { cwd: root, outputChannel },
      );
    },
  });

  if (context && context.globalState) {
    await context.globalState.update(STATE_KEYS.lastCircuitDir, circuitDir);
    await context.globalState.update(STATE_KEYS.lastArtifactName, artifactName);
    await context.globalState.update(STATE_KEYS.lastOutDir, outDir);
  }

  vscode.window.showInformationMessage('NoirForge flow completed.');
}

async function cmdSizes({ outputChannel, context }) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const lastArtifactName = context && context.globalState ? context.globalState.get(STATE_KEYS.lastArtifactName) : null;
  const lastOutDir = context && context.globalState ? context.globalState.get(STATE_KEYS.lastOutDir) : null;

  const artifactName = await getOrAskArtifactName({ defaultValue: lastArtifactName || '' });
  if (!artifactName) return;

  const outDir = await confirmOrPickFolder({
    title: 'Select artifact output dir (contains noirforge.json + .proof/.pw)',
    rootFsPath: root,
    lastFsPath: typeof lastOutDir === 'string' ? lastOutDir : null,
  });
  if (!outDir) return;

  await runWithProgress({
    title: `NoirForge: sizes (${artifactName})`,
    fn: async () => {
      await spawnPnpm(['noirforge', 'sizes', '--artifact-name', artifactName, '--out-dir', outDir], { cwd: root, outputChannel });
    },
  });

  if (context && context.globalState) {
    await context.globalState.update(STATE_KEYS.lastArtifactName, artifactName);
    await context.globalState.update(STATE_KEYS.lastOutDir, outDir);
  }
}

async function cmdComputeAnalyze({ outputChannel, context }) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const lastArtifactName = context && context.globalState ? context.globalState.get(STATE_KEYS.lastArtifactName) : null;
  const lastOutDir = context && context.globalState ? context.globalState.get(STATE_KEYS.lastOutDir) : null;

  const artifactName = await getOrAskArtifactName({ defaultValue: lastArtifactName || '' });
  if (!artifactName) return;

  const outDir = await confirmOrPickFolder({
    title: 'Select artifact output dir (contains noirforge.json + .proof/.pw)',
    rootFsPath: root,
    lastFsPath: typeof lastOutDir === 'string' ? lastOutDir : null,
  });
  if (!outDir) return;

  await runWithProgress({
    title: `NoirForge: compute-analyze (${artifactName})`,
    fn: async () => {
      await spawnPnpm(
        ['noirforge', 'compute-analyze', '--artifact-name', artifactName, '--out-dir', outDir, '--print-logs', '0'],
        { cwd: root, outputChannel },
      );
    },
  });

  if (context && context.globalState) {
    await context.globalState.update(STATE_KEYS.lastArtifactName, artifactName);
    await context.globalState.update(STATE_KEYS.lastOutDir, outDir);
  }
}

async function cmdOpenArtifactsDir({ context }) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const lastArtifactName = context && context.globalState ? context.globalState.get(STATE_KEYS.lastArtifactName) : null;
  const artifactName = await getOrAskArtifactName({ defaultValue: lastArtifactName || '' });
  if (!artifactName) return;

  if (context && context.globalState) {
    await context.globalState.update(STATE_KEYS.lastArtifactName, artifactName);
  }

  const dir = path.join(root, 'artifacts', artifactName, 'local');
  await openFolderInOs(dir);
}

async function cmdOpenOutDir({ context }) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const lastOutDir = context && context.globalState ? context.globalState.get(STATE_KEYS.lastOutDir) : null;
  const outDir = await confirmOrPickFolder({
    title: 'Select output directory (out-dir)',
    rootFsPath: root,
    lastFsPath: typeof lastOutDir === 'string' ? lastOutDir : null,
  });
  if (!outDir) return;

  if (context && context.globalState) {
    await context.globalState.update(STATE_KEYS.lastOutDir, outDir);
  }

  await openFolderInOs(outDir);
}

function activate(context) {
  const outputChannel = createOutputChannel();

  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand('noirforge.initTemplate', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('---');
      try {
        await cmdInitTemplate({ outputChannel });
      } catch (e) {
        outputChannel.appendLine(String(e && e.stack ? e.stack : e));
        vscode.window.showErrorMessage(`NoirForge init failed: ${e && e.message ? e.message : String(e)}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('noirforge.flow', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('---');
      try {
        await cmdFlow({ outputChannel, context });
      } catch (e) {
        outputChannel.appendLine(String(e && e.stack ? e.stack : e));
        vscode.window.showErrorMessage(`NoirForge flow failed: ${e && e.message ? e.message : String(e)}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('noirforge.sizes', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('---');
      try {
        await cmdSizes({ outputChannel, context });
      } catch (e) {
        outputChannel.appendLine(String(e && e.stack ? e.stack : e));
        vscode.window.showErrorMessage(`NoirForge sizes failed: ${e && e.message ? e.message : String(e)}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('noirforge.computeAnalyze', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('---');
      try {
        await cmdComputeAnalyze({ outputChannel, context });
      } catch (e) {
        outputChannel.appendLine(String(e && e.stack ? e.stack : e));
        vscode.window.showErrorMessage(`NoirForge compute-analyze failed: ${e && e.message ? e.message : String(e)}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('noirforge.openArtifactsDir', async () => {
      try {
        await cmdOpenArtifactsDir({ context });
      } catch (e) {
        vscode.window.showErrorMessage(`NoirForge open artifacts dir failed: ${e && e.message ? e.message : String(e)}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('noirforge.openOutDir', async () => {
      try {
        await cmdOpenOutDir({ context });
      } catch (e) {
        vscode.window.showErrorMessage(`NoirForge open out dir failed: ${e && e.message ? e.message : String(e)}`);
      }
    }),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
