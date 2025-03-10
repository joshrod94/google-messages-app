const { app, BrowserWindow, session, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store').default;

app.setAppUserModelId('com.github.joshrod94.Google-Messages-App');

const store = new Store();
let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'icon_transparent.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
        }
    });

    // Load Google Messages
    mainWindow.loadURL('https://messages.google.com/web');

    // Persistent session
    const persistSession = session.fromPartition('persist:google-messages');

    // Flush cookies on close
    mainWindow.on('close', async () => {
        await persistSession.cookies.flushStore();
    });

    // Detect when the window is focused
    mainWindow.on('focus', () => {
        mainWindow.webContents.send('window-focus');
    });

    // Detect when the window is blurred (user switches apps)
    mainWindow.on('blur', () => {
        mainWindow.webContents.send('window-blur');
    });

    // Detect when the window is minimized
    mainWindow.on('minimize', () => {
        mainWindow.webContents.send('window-blur');
    });

    // Detect when the window is restored from minimize
    mainWindow.on('restore', () => {
        mainWindow.webContents.send('window-focus');
    });

    // Send initial theme and audio settings once page loads
    mainWindow.webContents.once('did-finish-load', () => {
        const savedTheme = store.get('theme', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
        nativeTheme.themeSource = savedTheme;

        mainWindow.webContents.send('theme-status', savedTheme);

        const sentAudioEnabled = store.get('sentAudioEnabled', true);
        mainWindow.webContents.send('sent-audio-setting', sentAudioEnabled);

        const sentAudioPath = `file://${path.join(__dirname, 'assets', 'sent.mp3')}`;
        mainWindow.webContents.send('set-sent-audio-path', sentAudioPath);
        //console.log("✅ Sent Audio path:", sentAudioPath);

        const bubbleAudioPath = `file://${path.join(__dirname, 'assets', 'bubble.mp3')}`;
        mainWindow.webContents.send('set-bubble-audio-path', bubbleAudioPath);
        //console.log("✅ Receive bubble audio path:", bubbleAudioPath);
    });

    // Theme toggle handler
    ipcMain.on('toggle-theme', () => {
        const newTheme = nativeTheme.themeSource === "dark" ? "light" : "dark";
        nativeTheme.themeSource = newTheme;
        store.set('theme', newTheme);
        mainWindow.webContents.send('theme-status', newTheme);
    });

    ipcMain.on('request-initial-theme', () => {
        mainWindow.webContents.send('theme-status', nativeTheme.themeSource);
    });

    // Sent Audio toggle handlers
    ipcMain.on('toggle-sent-audio', (_, enabled) => {
        store.set('sentAudioEnabled', enabled);
        mainWindow.webContents.send('sent-audio-setting', enabled);
    });

    ipcMain.on('request-sent-audio-setting', () => {
        const enabled = store.get('sentAudioEnabled', true);
        mainWindow.webContents.send('sent-audio-setting', enabled);
    });

    // Handle Bubble Audio Toggle
    ipcMain.on('toggle-bubble-audio', (_, enabled) => {
        store.set('bubble-audio-enabled', enabled);
        mainWindow.webContents.send('bubble-audio-setting', enabled);
    });
    
    ipcMain.on('request-bubble-audio-setting', () => {
        const bubbleAudioEnabled = store.get('bubble-audio-enabled', true);
        mainWindow.webContents.send('bubble-audio-setting', bubbleAudioEnabled);
    });

    // Uncomment below to debug with DevTools
     //mainWindow.webContents.openDevTools();
});
    // Make Sure App Quits on Close
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
});
