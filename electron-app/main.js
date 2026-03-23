const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn, exec, fork } = require('child_process');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

let mainWindow;
let providerProcess;
let nextProcess;

function startNextJsServer() {
  if (isDev) return Promise.resolve();
  return new Promise((resolve) => {
    const nextPath = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    console.log('Starting native Next.js server via:', nextPath);
    
    nextProcess = fork(nextPath, ['start', '-p', '4000'], {
      env: { ...process.env, PORT: '4000', NODE_ENV: 'production' },
      cwd: __dirname,
      stdio: 'pipe'
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`[NEXT] ${data}`);
      if (data.toString().includes('Listening on port') || data.toString().includes('Ready in')) {
        resolve();
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`[NEXT ERR] ${data}`);
    });

    // Fallback if the success string never matches
    setTimeout(() => resolve(), 3000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a'
  });

  mainWindow.loadURL('http://localhost:4000');
}

app.whenReady().then(async () => {
  await startNextJsServer();
  createWindow();
});

app.on('will-quit', () => {
  if (nextProcess && !nextProcess.killed) nextProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Provider Node Control ──────────────────

ipcMain.handle('check-ollama', async () => {
  return new Promise((resolve) => {
    exec('ollama --version', (err) => {
      resolve(!err);
    });
  });
});

ipcMain.handle('start-ollama', async () => {
  return new Promise((resolve) => {
    exec('ollama serve', (err) => {
      if (err) console.error('Ollama serve failed', err);
    });
    // Give it some time to start
    setTimeout(() => resolve(true), 2000);
  });
});

ipcMain.handle('start-provider', async (event, config) => {
  if (providerProcess) return { success: false, error: 'Already running' };

  // Write temporary config for the process to read
  const configPath = path.join(app.getPath('userData'), 'provider-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config));

  // In a real build, we'd bundle a specific script or binary
  // For now, we spawn a node process pointing to the hidden script
  const providerPath = path.join(__dirname, 'src/provider/node.js'); 
  
  providerProcess = fork(providerPath, [configPath], { 
    env: process.env,
    stdio: 'pipe'
  });

  providerProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('provider-log', data.toString());
  });

  providerProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('provider-log', `[ERR] ${data.toString()}`);
  });

  return { success: true };
});

ipcMain.handle('stop-provider', async () => {
  if (providerProcess) {
    providerProcess.kill();
    providerProcess = null;
    return { success: true };
  }
  return { success: false };
});
