// Run with the unpacked Electron executable and ELECTRON_RUN_AS_NODE=1.
// Exercises packaged modules and unpacked native scripts, without opening UI.
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os');
const assert=require('node:assert/strict');
(async()=>{
  const resources=path.resolve('dist/win-unpacked/resources/app.asar');
  const {createServer}=await import(pathToFileURL(path.join(resources,'src/server.mjs')).href);
  const {windows}=await import(pathToFileURL(path.join(resources,'src/windows.mjs')).href);
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-packed-'));
  const app=await createServer({dataDir,offlineDir:path.resolve('offline')});
  try{
    const bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();
    assert.equal(bootstrap.commands.length,17);assert.ok(bootstrap.capabilities.offlineReady);
    assert.ok(bootstrap.capabilities.voices.some(v=>v.culture==='ru-RU'));
    const html=await(await fetch(app.url)).text();assert.ok(html.includes('Jeffy Assistant'));
    const wav=await windows('speak',{text:'Джеффи который час',rate:0});
    const post=async(endpoint,body)=>{const r=await fetch(app.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':bootstrap.token},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,200,d.error);return d;};
    const recognized=await post('transcribe',{audio:wav.audio});const result=await post('phrase',{text:recognized.text});assert.equal(result.kind,'command');
    const reply=await post('speak',{text:result.reply});assert.equal(Buffer.from(reply.audio,'base64').toString('ascii',0,4),'RIFF');
    console.log(JSON.stringify({packaged:true,html:true,offline:true,recognized:recognized.text,reply:result.reply,replyBytes:Buffer.from(reply.audio,'base64').length}));
  }finally{await app.close();await rm(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
