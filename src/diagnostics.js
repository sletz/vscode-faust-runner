const { execFile } = require('child_process');
const path = require('path');
const vscode = require('vscode');

function getConfig() {
  const c = vscode.workspace.getConfiguration('faust');
  return {
    binary: c.get('binary'),
    libPath: c.get('libraryPath')
  };
}

function runFaust(args, opts = {}) {
  const { binary } = getConfig();
  return new Promise((resolve) => {
    execFile(binary, args, { timeout: 8000, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code ?? 1) : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function validate(document) {
  const { libPath } = getConfig();
  const filePath = document.uri.fsPath;
  const res = await runFaust(['-I', libPath, '-lang', 'cpp', filePath, '-o', '/dev/null']);
  const diags = [];

  if (res.code !== 0) {
    const lines = (res.stderr || res.stdout).split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^(.*?):(\d+)\s*:\s*(?:(\d+)\s*:\s*)?ERROR\s*:\s*(.*)$/);
      if (m) {
        const file = m[1];
        const lineNum = parseInt(m[2], 10) - 1;
        const col = m[3] ? parseInt(m[3], 10) - 1 : 0;
        if (path.resolve(file) === path.resolve(filePath)) {
          const range = new vscode.Range(lineNum, col, lineNum, Math.max(col + 1, 200));
          diags.push(new vscode.Diagnostic(range, m[4], vscode.DiagnosticSeverity.Error));
        }
      } else {
        const w = line.match(/^WARNING\s*:\s*(.*)$/);
        if (w) {
          diags.push(new vscode.Diagnostic(new vscode.Range(0,0,0,1), w[1], vscode.DiagnosticSeverity.Warning));
        }
      }
    }
    if (diags.length === 0 && (res.stderr || res.stdout).trim()) {
      diags.push(new vscode.Diagnostic(new vscode.Range(0,0,0,1), (res.stderr || res.stdout).trim().slice(0, 400), vscode.DiagnosticSeverity.Error));
    }
  }
  return diags;
}

async function compileSVG(filePath, outDir) {
  const { libPath } = getConfig();
  return runFaust(['-I', libPath, '-svg', filePath, '-O', outDir]);
}

module.exports = { validate, runFaust, compileSVG, getConfig };
