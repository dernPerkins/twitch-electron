const electron = require('electron');
const path = require('path');
const app = electron.app;
const Menu = electron.Menu;
const Tray = electron.Tray;
const BrowserWindow = electron.BrowserWindow;
//const countdown = require('.');
const ipc = electron.ipcMain;
const DOMAIN = 'http://localhost/LowTwitch';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({ 
        width: 1200, 
        height: 800, 
        backgroundColor: '#6441a5',
        frame: false,
        fullscreenable: true,
        resizable: true
    });

    // and load the index.html of the app.
    win.loadFile('index.html');

    // Open the DevTools.
    win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', _ => {
    const tray = new Tray(path.join('images', 'Glitch_Purple_RGB.png'));
    const trayMenu = Menu.buildFromTemplate([
        {
            label: 'Quit',
            click: function() {
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(trayMenu);
    tray.setToolTip('Twitch Electron');

    createWindow();

    const template  = [{
        label: electron.app.getName(),
        submenu: [{
            label: 'Quit',
            click: function() {
                app.quit();
            },
            accelerator: 'Ctrl+Shift+Q'
        }]
    }]
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.

  // ipc event example
// ipc.on('countdown-start', function() {
//     countdown(count => {
//         console.log('count', count);
//         win.webContents.send('countdown', count);
//     });
// });

// Quit application IPC Event
ipc.on('quit-application', function () {
    app.quit();
});

ipc.on('user-login', function () {
    let loginWin = new BrowserWindow({
        width: 1000, //should be 400 but for testing it's 1000
        height: 800, 
        resizable: false
    });

    // and load the index.html of the app.
    loginWin.loadURL('https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=jp0gvzo6nccw4x9scrpsj44t5xti9o&redirect_uri=http://localhost/LowTwitch/&scope=user_read');

    // Open the DevTools.
    loginWin.webContents.openDevTools();

    // Emitted when the window is closed.
    loginWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        loginWin = null;
    });

    loginWin.on('page-title-updated', function () {
        // when the title changes we've arrived at our authentication page
        // pull the authentication token and pass it back to the index renderer.
        var loginUrl = loginWin.webContents.getURL();
        // if the login is not the domain of the authentication server then just skip, it's probably the twitch login
        if (loginUrl.indexOf(DOMAIN) == 0) {
            var access_token = null;
            try {
                var access_token = loginUrl.match(/\#(?:access_token)\=([\S\s]*?)\&/)[1];
            } catch (error) {
                console.log('Error: ' + error.responseText);
            }
            if (access_token != null) {
                // if the access token is recieved we'll send it to the renderer
                win.webContents.send('user-login-completed', { access_token: access_token });
            }
            // if not we'll just close the window
            loginWin.close();
        }
    });
});