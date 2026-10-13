// Uses the real Windows speech synthesizer and installed Vosk model.
// Microphone access and cloud requests are deliberately not part of this check.
import { windows } from '../src/windows.mjs';
import { createServer } from '../src/server.mjs';
import { createOffline } from '../src/offline.mjs';
import { matchCommand, DEFAULT_COMMANDS } from '../src/commands.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const offlineDir=path.resolve('offline'), offline=createOffline(offlineDir);
const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-windows-'));
const app=await createServer({dataDir,offlineDir});
const evidence={checkedAt:new Date().toISOString(),capabilities:await windows('capabilities'),recognition:[]};
try {
  const bootstrap=await (await fetch(app.url+'/api/bootstrap')).json();
  const post=async(endpoint,body)=>{
    const response=await fetch(app.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':bootstrap.token},body:JSON.stringify(body)});
    const result=await response.json();assert.equal(response.status,200,result.error);return result;
  };
  for(const [phrase,expected] of [['который час','time'],['открой блокнот','notepad'],['джеффи который час','time']]) {
    const wav=await windows('speak',{text:phrase,rate:0});
    const audio=Buffer.from(wav.audio,'base64');assert.equal(audio.toString('ascii',0,4),'RIFF');
    const recognized=await offline.recognize(audio);
    assert.equal(matchCommand(recognized,DEFAULT_COMMANDS)?.id,expected);
    evidence.recognition.push({phrase,recognized,matched:expected,wavBytes:audio.length});
  }
  const wav=await windows('speak',{text:'Джеффи который час',rate:0});
  const recognized=await post('transcribe',{audio:wav.audio});
  const result=await post('phrase',{text:recognized.text});assert.equal(result.kind,'command');assert.match(result.reply,/Сейчас/);
  const reply=await post('speak',{text:result.reply});assert.ok(Buffer.from(reply.audio,'base64').length>1000);
  evidence.voicePipeline={recognized:recognized.text,reply:result.reply,replyWavBytes:Buffer.from(reply.audio,'base64').length,historyEntries:result.history.length};
  // Confirm DPAPI encryption and decryption without writing any real API key.
  const sample='synthetic-test-value';const encrypted=await windows('protect',{value:sample});assert.notEqual(encrypted.value,sample);assert.equal((await windows('unprotect',{value:encrypted.value})).value,sample);evidence.dpapi='roundtrip passed';
  console.log(JSON.stringify(evidence,null,2));
} finally {offline.close();await app.close();await rm(dataDir,{recursive:true,force:true});}
