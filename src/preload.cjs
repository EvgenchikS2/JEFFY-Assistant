const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('jeffyDesktop',Object.freeze({
  pickApplication:()=>ipcRenderer.invoke('jeffy:pick-application')
}));
