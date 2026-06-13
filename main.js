const { app, BrowserWindow, globalShortcut, Menu, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let stateFile;
const presetsFile = path.join(app.getPath('userData'), 'presets.json');

function loadWindowState() {
    if (!stateFile) return null;
    try {
        const data = fs.readFileSync(stateFile, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function saveWindowState() {
    if (!mainWindow || !stateFile) return;
    try {
        const bounds = mainWindow.getBounds();
        const maximized = mainWindow.isMaximized();
        fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, maximized }));
    } catch {}
}

function loadPresets() {
    try {
        return JSON.parse(fs.readFileSync(presetsFile, 'utf8'));
    } catch {
        return [];
    }
}

function savePresets(presets) {
    fs.writeFileSync(presetsFile, JSON.stringify(presets, null, 2));
}

ipcMain.handle('load-presets', () => loadPresets());
ipcMain.handle('save-presets', (_, presets) => { savePresets(presets); });
ipcMain.handle('read-clipboard', () => clipboard.readText());
ipcMain.handle('write-clipboard', (_, text) => { clipboard.writeText(text); });

function applyPresetByIndex(idx) {
    const presets = loadPresets();
    if (idx < 0 || idx >= presets.length) return;
    const originalClip = clipboard.readText();
    const text = presets[idx].content.replace(/{clipboard}/g, originalClip);
    clipboard.writeText(text);
    if (!mainWindow) {
        try { clipboard.writeText(originalClip); } catch(e) {}
        return;
    }
    mainWindow.webContents.focus();
    mainWindow.webContents.executeJavaScript(
        'var tas=document.querySelectorAll("textarea");var ta=null;' +
        'for(var i=0;i<tas.length;i++){if(tas[i].placeholder&&tas[i].placeholder.indexOf("DeepSeek")>=0){ta=tas[i];break}}' +
        'if(!ta)for(var i=0;i<tas.length;i++){if(tas[i].name==="search"){ta=tas[i];break}}' +
        'if(ta){ta.focus();ta.select();}'
    ).catch(function() {}).then(function() {
        setTimeout(function() {
            try { mainWindow.webContents.paste(); } catch(e) {}
            setTimeout(function() {
                try { clipboard.writeText(originalClip); } catch(e) {}
            }, 300);
        }, 200);
    });
}

function createMainWindow() {
    stateFile = path.join(app.getPath('userData'), 'window-state.json');

    const defaults = { width: 1280, height: 800 };
    const saved = loadWindowState() || defaults;
    const { maximized, ...windowBounds } = saved;

    mainWindow = new BrowserWindow({
        ...windowBounds,
        minHeight: 600,
        minWidth: 800,
        icon: path.join(__dirname, 'deepseek-logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        autoHideMenuBar: false,
    });

    // Use a proper, up-to-date Chrome browser user-agent
    const platform = process.platform;
    const chromeVersion = '135.0.0.0';
    let ua;
    if (platform === 'win32') {
        ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0`;
    } else if (platform === 'darwin') {
        ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    } else {
        ua = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }
    mainWindow.webContents.session.setUserAgent(ua);

    mainWindow.loadURL('https://chat.deepseek.com/');

    mainWindow.webContents.on('did-finish-load', () => {
        injectPresetUI();
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'Alt' && input.type === 'keyDown') {
            event.preventDefault();
        }
    });

    if (saved.maximized) {
        mainWindow.maximize();
    }

    mainWindow.on('resize', saveWindowState);
    mainWindow.on('move', saveWindowState);
    mainWindow.on('maximize', saveWindowState);
    mainWindow.on('unmaximize', saveWindowState);

    mainWindow.on('focus', () => {
        mainWindow.webContents.executeJavaScript(`
            (function(){
                var tas = document.querySelectorAll('textarea');
                for (var i = 0; i < tas.length; i++) {
                    var rect = tas[i].getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        tas[i].focus();
                        return;
                    }
                }
            })();
        `).catch(function(){});
    });

    mainWindow.on('close', (event) => {
        saveWindowState();
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.minimize();
        }
    });

    globalShortcut.register('Alt+C', () => {
        if (!mainWindow) return;

        if (mainWindow.isFocused()) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    for (let i = 1; i <= 9; i++) {
        const idx = i - 1;
        globalShortcut.register('Alt+' + i, () => applyPresetByIndex(idx));
    }
}

function injectPresetUI() {
    const code = fs.readFileSync(path.join(__dirname, 'preset-ui.js'), 'utf8');
    mainWindow.webContents.executeJavaScript(code).catch(function() {});
}

const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Exit',
                accelerator: 'Alt+F4',
                click: () => {
                    app.isQuiting = true;
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            {
                label: 'Toggle Window    Alt+C',
                enabled: false
            },
            { type: 'separator' },
            { role: 'close' }
        ]
    },
    {
        label: 'Presets',
        submenu: (() => {
            const items = [];
            const presets = loadPresets();
            for (let i = 0; i < 9; i++) {
                const name = i < presets.length ? presets[i].name : '(empty)';
                items.push({
                    label: `Alt+${i + 1}    ${name}`,
                    enabled: i < presets.length
                });
            }
            return items;
        })()
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About DeepSeek Desktop',
                click: () => {
                    const { dialog } = require('electron');
                    dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'About DeepSeek Desktop',
                        message: 'DeepSeek Desktop v1.0.0',
                        detail: 'A desktop version of DeepSeek.'
                    });
                }
            }
        ]
    }
];

app.on('ready', () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
    createMainWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow) {
        mainWindow.show();
    } else {
        createMainWindow();
    }
});

app.on('before-quit', () => {
    app.isQuiting = true;
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
