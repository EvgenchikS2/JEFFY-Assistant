// Real Electron renderer and local server with isolated test preferences.
// No microphone, personal data, API keys or external service requests.
const {app,BrowserWindow}=require('electron');
const {mkdtemp,rm,writeFile}=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
let server,win,dataDir;
const timer=setTimeout(()=>{console.error('Voice UI verification timed out');app.exit(1);},45000);
app.whenReady().then(async()=>{
  dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-ui-'));
  const source=process.env.JEFFY_VERIFY_PACKAGED==='1'?path.resolve('dist/win-unpacked/resources/app.asar'):path.resolve('.');
  const {createServer}=await import(pathToFileURL(path.join(source,'src/server.mjs')).href);
  server=await createServer({dataDir,offlineDir:path.resolve('offline')});
  win=new BrowserWindow({width:1380,height:900,show:false,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
  win.webContents.on('console-message',(_event,details)=>{if(details.level==='error')console.error('Renderer: '+details.message);});
  await win.loadURL(server.url+'/#settings');
  const waitFor=async(expression)=>{for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('UI condition timed out: '+expression);};
  await waitFor("!!document.querySelector('#pitch')");
  const result=await win.webContents.executeJavaScript(`(async()=>{
    const $=s=>document.querySelector(s);
    $('#tts-provider').value='windows';$('#tts-provider').dispatchEvent(new Event('change',{bubbles:true}));
    const voices=Array.from($('#voice').options).map(o=>o.value).filter(Boolean);
    if(!voices.length)throw Error('No installed voices');
    $('#voice').value=voices.find(v=>v.includes('Irina'))||voices[0];
    $('[data-pitch="low"]').click();
    $('#rate').value='-1';$('#rate').dispatchEvent(new Event('input',{bubbles:true}));
    $('#volume').value='70';$('#volume').dispatchEvent(new Event('input',{bubbles:true}));
    if($('#rate-value').textContent!=='-1'||$('#volume-value').textContent!=='70%')throw Error('Slider labels failed');
    if($('[data-pitch="low"]').getAttribute('aria-pressed')!=='true')throw Error('Pitch selection failed');
    // Observe the actual preview request, allowing it to reach the real synthesizer.
    const originalFetch=window.fetch;window.__preview=null;
    window.fetch=async(...args)=>{const response=await originalFetch(...args);if(String(args[0]).endsWith('/api/speak'))window.__preview={request:JSON.parse(args[1].body),status:response.status,data:await response.clone().json()};return response;};
    $('#voice-preview').value='Привет. Проверка выбранного голоса.';$('#test-voice').click();
    return {voice:$('#voice').value,rate:-1,pitch:'low',volume:70};
  })()`);
  await waitFor('!!window.__preview');
  const preview=await win.webContents.executeJavaScript('window.__preview');
  assert.equal(preview.status,200,preview.data.error);assert.ok(Buffer.from(preview.data.audio,'base64').length>1000);
  for(const [key,value] of Object.entries(result))assert.equal(preview.request[key],value);
  const before=await(await fetch(server.url+'/api/bootstrap')).json();assert.equal(before.settings.pitch,'medium');
  await win.webContents.executeJavaScript("document.querySelector('#settings-form').requestSubmit(document.querySelector('#settings-form button[type=submit]'))");
  await waitFor("document.querySelector('#toast').textContent.includes('Настройки сохранены')");
  await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.webContents.reload();});
  await waitFor("!!document.querySelector('#pitch')");
  const restored=await win.webContents.executeJavaScript("Object.fromEntries(['voice','rate','pitch','volume'].map(k=>[k,document.getElementById(k).value]))");
  for(const [key,value] of Object.entries(result))assert.equal(restored[key],String(value));
  assert.ok(await win.webContents.executeJavaScript("(()=>{const r=document.querySelector('#settings-form button[type=submit]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})()"),'Save button must be visible without horizontal overflow');
  await writeFile(path.resolve('docs/voice-settings-1.2.png'),(await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({voiceUI:true,packaged:process.env.JEFFY_VERIFY_PACKAGED==='1',previewWavBytes:Buffer.from(preview.data.audio,'base64').length,persistedAfterReload:restored,screenshot:'docs/voice-settings-1.2.png'}));
}).catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{
  clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();if(server)await server.close();if(dataDir)await rm(dataDir,{recursive:true,force:true});app.exit(process.exitCode||0);
});
