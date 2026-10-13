const { app, BrowserWindow, globalShortcut, session, Menu, Tray, nativeImage, shell, dialog, ipcMain } = require('electron');
const path = require('node:path');
app.commandLine.appendSwitch('force-renderer-accessibility');
let window, tray, backend, quitting = false;
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{if(window){window.show();window.focus();}});
  app.whenReady().then(async()=>{
    const { createServer } = await import('./server.mjs');
    const { windows:runWindows } = await import('./windows.mjs');
    const dataDir = app.isPackaged ? path.join(process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('userData'),'data') : path.join(__dirname,'../data');
    const offlineDir = app.isPackaged ? path.join(process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('userData'),'offline') : path.join(__dirname,'../offline');
    backend = await createServer({dataDir,offlineDir});
    const captureTarget=async()=>{try{const target=await runWindows('foreground');if(target.handle&&!['electron','Jeffy Assistant'].includes(target.process))backend.setTargetWindow(target.handle);}catch{}};
    await captureTarget();
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details)=>callback(permission==='media' && contents.getURL().startsWith(backend.url+'/') && !(details.mediaTypes||[]).includes('video')));
    session.defaultSession.setPermissionCheckHandler((contents,permission)=>permission==='media' && !!contents && contents.getURL().startsWith(backend.url+'/'));
    window = new BrowserWindow({width:1380,height:900,minWidth:900,minHeight:650,title:'Jeffy Assistant',backgroundColor:'#081225',autoHideMenuBar:true,icon:path.join(__dirname,'../public/logo.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
    ipcMain.handle('jeffy:pick-application',async(event)=>{
      if(event.sender!==window.webContents||!event.sender.getURL().startsWith(backend.url+'/'))throw new Error('Invalid application picker request');
      const selected=await dialog.showOpenDialog(window,{title:'Выбери приложение или ярлык',properties:['openFile'],filters:[{name:'Приложения и ярлыки',extensions:['exe','lnk']}]});
      return selected.canceled?null:selected.filePaths[0];
    });
    let targetTimer;
    window.on('blur',()=>{clearTimeout(targetTimer);targetTimer=setTimeout(captureTarget,250);});
    window.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'};});
    window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(backend.url+'/')) event.preventDefault();});
    await window.loadURL(backend.url);
    const icon=nativeImage.createFromPath(path.join(__dirname,'../public/logo.png')).resize({width:32,height:32});
    tray = new Tray(icon);tray.setToolTip('Jeffy · Ctrl+Shift+Space');
    tray.setContextMenu(Menu.buildFromTemplate([{label:'Открыть Jeffy',click:()=>{window.show();window.focus();}},{label:'Завершить',click:()=>{quitting=true;app.quit();}}]));
    tray.on('double-click',()=>{window.show();window.focus();});
    window.on('close',e=>{if(!quitting){e.preventDefault();window.hide();}});
    const registered=globalShortcut.register('Control+Shift+Space',async()=>{await captureTarget();window.show();window.focus();window.webContents.executeJavaScript('window.jeffyToggleMicrophone?.()');});
    if(!registered) console.warn('Jeffy: Ctrl+Shift+Space занята другим приложением. Используйте кнопку микрофона.');
  }).catch(e=>{console.error(e);app.quit();});
  app.on('before-quit',()=>{quitting=true;globalShortcut.unregisterAll();backend?.server.close();tray?.destroy();});
}
