// Real renderer and server; cloud HTTP responses use explicit audio fixtures.
// This UI check does not prove access to a user's real cloud account.
const {app,BrowserWindow}=require('electron');
const {mkdtemp,rm,writeFile}=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
let server,win,dataDir;const requests=[];
const timer=setTimeout(()=>{console.error('Cloud voice UI verification timed out');app.exit(1);},45000);
app.whenReady().then(async()=>{
  dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-cloud-ui-'));
  const source=process.env.JEFFY_VERIFY_PACKAGED==='1'?path.resolve('dist/win-unpacked/resources/app.asar'):path.resolve('.');
  const {createServer}=await import(pathToFileURL(path.join(source,'src/server.mjs')).href);
  const {synthesizeCloud}=await import(pathToFileURL(path.join(source,'src/cloud-speech.mjs')).href);
  const pcm=Buffer.alloc(12000);for(let i=0;i<6000;i++)pcm.writeInt16LE(Math.round(Math.sin(i*.08)*1000),i*2);
  const fixture=()=>new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/L16;rate=24000',data:pcm.toString('base64')}}]}}]}));
  const wave=Buffer.from((await synthesizeCloud('fixture',{ttsProvider:'gemini'},{gemini:'test'},async()=>fixture())).audio,'base64');
  server=await createServer({dataDir,offlineDir:path.resolve('offline'),speechFetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return url.includes('api.groq.com')?new Response(wave):fixture();}});
  const bootstrap=await(await fetch(server.url+'/api/bootstrap')).json();
  for(const provider of ['gemini','groq']){const response=await fetch(server.url+'/api/key',{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':bootstrap.token},body:JSON.stringify({provider,key:'synthetic-ui-test-key',remember:false})});assert.equal(response.status,200);}
  win=new BrowserWindow({width:1380,height:950,show:false,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  await win.loadURL(server.url+'/#settings');
  const waitFor=async(expression)=>{for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('UI condition timed out: '+expression);};
  await waitFor("!!document.querySelector('#gemini-voice')");
  await win.webContents.executeJavaScript(`(()=>{
    const $=s=>document.querySelector(s);
    if($('#tts-provider').value!=='gemini'||$('#gemini-voice').options.length!==30)throw Error('Gemini voice catalog failed');
    if(!$('[data-tts-pane="groq"]').hidden||!$('[data-tts-pane="windows"]').hidden)throw Error('Wrong voice controls visible');
    $('#gemini-voice').value='Charon';$('#test-voice').click();
  })()`);
  await waitFor("!document.querySelector('#test-voice').disabled");assert.equal(requests.length,1);assert.equal(requests[0].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Charon');
  await win.webContents.executeJavaScript(`(()=>{const $=s=>document.querySelector(s);$('#tts-provider').value='groq';$('#tts-provider').dispatchEvent(new Event('change',{bubbles:true}));if($('#groq-voice').options.length!==6||!$('#rate').disabled||$('[data-tts-pane="groq"]').hidden)throw Error('Groq controls failed');$('#groq-voice').value='hannah';$('#test-voice').click();})()`);
  await waitFor("!document.querySelector('#test-voice').disabled");assert.equal(requests.length,2);assert.equal(requests[1].body.voice,'hannah');assert.match(requests[1].body.input,/Привет/);
  await win.webContents.executeJavaScript("document.querySelector('#tts-provider').value='gemini';document.querySelector('#tts-provider').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#input-language').value='en';document.querySelector('#reply-language').value='en';document.querySelector('#settings-form').requestSubmit(document.querySelector('#settings-form button[type=submit]'))");
  await waitFor("document.querySelector('#toast').textContent.includes('Настройки сохранены')");
  await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.webContents.reload();});await waitFor("!!document.querySelector('#gemini-voice')");
  const restored=await win.webContents.executeJavaScript("({provider:document.querySelector('#tts-provider').value,geminiVoice:document.querySelector('#gemini-voice').value,groqVoice:document.querySelector('#groq-voice').value,localHidden:document.querySelector('[data-tts-pane=windows]').hidden,inputLanguage:document.querySelector('#input-language').value,replyLanguage:document.querySelector('#reply-language').value})");
  assert.deepEqual(restored,{provider:'gemini',geminiVoice:'Charon',groqVoice:'hannah',localHidden:true,inputLanguage:'en',replyLanguage:'en'});
  assert.ok(await win.webContents.executeJavaScript("(()=>{const r=document.querySelector('#settings-form button[type=submit]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})()"));
  await new Promise(resolve=>setTimeout(resolve,850));
  await writeFile(path.resolve('docs/cloud-voice-1.2.2.png'),(await win.webContents.capturePage()).toPNG());
  await win.loadURL(server.url+'/#home');await waitFor("!!document.querySelector('#orb')&&!!window.JeffyMotion&&document.querySelector('#page-label').textContent==='Обзор'");
  assert.equal(await win.webContents.executeJavaScript("document.querySelectorAll('.motion-nav-marker').length"),1);
  await win.webContents.executeJavaScript("setVoice('processing')");
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('.voice-panel').dataset.state"),'processing');
  await new Promise(resolve=>setTimeout(resolve,850));
  await writeFile(path.resolve('docs/motion-home-1.2.2.png'),(await win.webContents.capturePage()).toPNG());
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await waitFor("matchMedia('(prefers-reduced-motion:reduce)').matches");
  await win.webContents.executeJavaScript("setVoice('speaking')");
  await new Promise(r=>setTimeout(r,100));
  const running=await win.webContents.executeJavaScript("document.getAnimations().filter(a=>a.playState==='running').map(a=>({type:a.constructor.name,name:a.animationName,target:a.effect?.target?.className,tag:a.effect?.target?.tagName}))");assert.deepEqual(running,[]);
  win.webContents.debugger.detach();
  console.log(JSON.stringify({cloudVoiceUI:true,packaged:process.env.JEFFY_VERIFY_PACKAGED==='1',audioSource:'HTTP fixtures',previews:requests.length,restored,motion:{springNavigation:true,voiceState:true,reducedMotion:true}}));
}).catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();if(server)await server.close();if(dataDir)await rm(dataDir,{recursive:true,force:true});app.exit(process.exitCode||0);});
