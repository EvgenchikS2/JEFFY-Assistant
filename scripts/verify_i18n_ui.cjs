const {app,BrowserWindow}=require('electron');
const {mkdtemp,rm,writeFile}=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
let server,win,dataDir;const errors=[];
const timer=setTimeout(()=>{console.error('Localization test timed out');app.exit(1);},45000);
app.whenReady().then(async()=>{
  dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-i18n-'));
  const source=process.env.JEFFY_VERIFY_PACKAGED==='1'?path.resolve('dist/win-unpacked/resources/app.asar'):path.resolve('.');
  const {createServer}=await import(pathToFileURL(path.join(source,'src/server.mjs')).href);
  server=await createServer({dataDir,offlineDir:path.resolve('offline')});
  const bootstrap=await(await fetch(server.url+'/api/bootstrap')).json();
  const post=async(endpoint,body)=>{const r=await fetch(server.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':bootstrap.token},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
  await post('commands/save',{id:'personal-i18n',name:'Настройки',phrases:['Все'],group:'Мои команды',actions:[{type:'speak',value:'Сохранить'}]});
  win=new BrowserWindow({width:1380,height:950,show:false,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',(_event,details)=>{if(details.level==='error')errors.push(details.message);});
  const js=code=>win.webContents.executeJavaScript(code);
  const wait=async(code)=>{for(let i=0;i<100;i++){if(await js(code))return;await new Promise(r=>setTimeout(r,60));}throw Error('UI condition failed: '+code);};
  const route=async page=>{await js(`location.hash=${JSON.stringify(page)}`);await wait(`document.querySelector('[data-nav="${page}"]').classList.contains('active')`);};
  await win.loadURL(server.url+'/#settings');await wait("!!document.querySelector('#model')");
  await js("document.querySelector('#model').value='unsaved-model';document.querySelector('#ui-language').value='en';document.querySelector('#ui-language').dispatchEvent(new Event('change',{bubbles:true}))");
  await wait("document.documentElement.lang==='en'&&!document.querySelector('#ui-language').disabled");
  assert.equal(await js("document.querySelector('h1').textContent"),'Settings');assert.equal(await js("document.querySelector('#model').value"),'unsaved-model');
  assert.equal(await js("document.querySelector('label[for=engine]').textContent"),'Speech recognition');
  const screens={};
  for(const page of ['home','commands','scenarios','history','connections','settings']){
    await route(page);await new Promise(r=>setTimeout(r,800));screens[page]=(await js("document.querySelector('#content').innerText")).replace(/\u00a0/g,' ');
    if(page==='commands'){
      assert.equal(await js("document.querySelectorAll('.command-card').length"),18);
      await js("document.querySelector('[data-filter=\"Мои команды\"]').click()");assert.equal(await js("document.querySelectorAll('.command-card').length"),1);
      assert.equal(await js("document.querySelector('.command-card h3').textContent"),'Настройки');
      await js("document.querySelector('[data-edit=personal-i18n]').click()");
      assert.equal(await js("document.querySelector('#modal-title').textContent"),'Edit command');assert.equal(await js("document.querySelector('#edit-name').value"),'Настройки');assert.equal(await js("document.querySelector('#edit-phrases').value"),'Все');assert.equal(await js("document.querySelector('.step-value').value"),'Сохранить');
      await js("document.querySelector('#cancel-editor').click()");
      await js("document.querySelector('[data-filter=\"Все\"]').click();document.querySelector('#command-search').value='Notepad';document.querySelector('#command-search').dispatchEvent(new Event('input',{bubbles:true}))");
      assert.equal(await js("document.querySelectorAll('.command-card').length"),1);assert.equal(await js("document.querySelector('.command-card h3').textContent"),'Open Notepad');
    }
    if(page==='settings')await writeFile(path.resolve('docs/interface-en-1.2.3.png'),(await win.webContents.capturePage()).toPNG());
  }
  await writeFile(path.resolve('fix-backups/i18n-en-audit.json'),JSON.stringify(screens,null,2));
  assert.match(screens.home,/Hi\. I am Jeffy/);assert.match(screens.commands,/Command library/);assert.match(screens.connections,/Get API key/);assert.match(screens.history,/Activity history/);
  await js("document.querySelector('#test-provider').click()");await wait("document.querySelector('#toast').textContent.includes('Add a Groq API key')");
  const persisted=await(await fetch(server.url+'/api/bootstrap')).json();assert.equal(persisted.settings.uiLanguage,'en');assert.equal(persisted.settings.inputLanguage,bootstrap.settings.inputLanguage);assert.equal(persisted.settings.replyLanguage,bootstrap.settings.replyLanguage);assert.equal(persisted.settings.model,bootstrap.settings.model);
  await server.close();server=await createServer({dataDir,offlineDir:path.resolve('offline')});await win.loadURL(server.url+'/#home');await wait("document.documentElement.lang==='en'&&!!document.querySelector('#orb')");
  await js("document.querySelector('#ui-language').value='ru';document.querySelector('#ui-language').dispatchEvent(new Event('change',{bubbles:true}))");await wait("document.documentElement.lang==='ru'&&!document.querySelector('#ui-language').disabled");assert.equal(await js("document.querySelector('h1').textContent.replace(/\\u00a0/g,' ')"),'Привет. Я Джеффи.');
  await route('settings');await new Promise(r=>setTimeout(r,800));await writeFile(path.resolve('docs/interface-ru-1.2.3.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);console.log(JSON.stringify({interfaceLanguages:['ru','en'],persistedAfterRestart:true,customContentUnchanged:true,unsavedSettingsPreserved:true,screens:Object.keys(screens),packaged:process.env.JEFFY_VERIFY_PACKAGED==='1'}));
}).catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();if(server)await server.close();if(dataDir)await rm(dataDir,{recursive:true,force:true});app.exit(process.exitCode||0);});
