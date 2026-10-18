import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {synthesizeCloud,cloudOptions} from '../src/cloud-speech.mjs';
import {createServer} from '../src/server.mjs';

const pcm=Buffer.from([0x10,0x27,0xf0,0xd8]);
const geminiResponse=()=>new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/L16;codec=pcm;rate=24000',data:pcm.toString('base64')}}]}}]}));
const geminiSettings={ttsProvider:'gemini',geminiVoice:'Charon',ttsModel:'gemini-2.5-flash-preview-tts',volume:50};
test('Gemini requests selected TTS voice and converts PCM to playable WAV with volume',async()=>{
  const reply=await synthesizeCloud('Привет!',geminiSettings,{gemini:'test-key'},async(url,options)=>{
    assert.ok(url.endsWith('/gemini-2.5-flash-preview-tts:generateContent'));assert.equal(options.headers['x-goog-api-key'],'test-key');
    const body=JSON.parse(options.body);assert.deepEqual(body.generationConfig.responseModalities,['AUDIO']);assert.equal(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Charon');assert.match(body.contents[0].parts[0].text,/Привет!/);assert.ok(!options.body.includes('test-key'));
    return geminiResponse();
  });
  const wav=Buffer.from(reply.audio,'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt32LE(40),4);assert.equal(wav.readInt16LE(44),5000);assert.equal(wav.readInt16LE(46),-5000);
});
test('Groq long replies split at 200 characters, preserve text and concatenate audio',async()=>{
  const wave=Buffer.from((await synthesizeCloud('test',{...geminiSettings,volume:100},{gemini:'test'},async()=>geminiResponse())).audio,'base64');
  const inputs=[];const text='Hello from Jeffy. '.repeat(32);
  const reply=await synthesizeCloud(text,{ttsProvider:'groq',groqVoice:'hannah',volume:100},{groq:'test'},async(url,options)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/audio/speech');assert.equal(options.headers.Authorization,'Bearer test');const body=JSON.parse(options.body);assert.equal(body.model,'canopylabs/orpheus-v1-english');assert.equal(body.voice,'hannah');assert.equal(body.response_format,'wav');assert.ok(body.input.length<=200);inputs.push(body.input);return new Response(wave);
  });assert.equal(inputs.join(' ').replace(/\s+/g,' ').trim(),text.trim());assert.equal(Buffer.from(reply.audio,'base64').readUInt32LE(40),inputs.length*pcm.length);
});
test('missing keys, unsupported language, quotas, missing audio and bad formats have safe errors',async()=>{
  const unused=()=>{throw Error('Unexpected request');};
  await assert.rejects(()=>synthesizeCloud('Привет',geminiSettings,{},unused),/Добавьте ключ Gemini/);

  await assert.rejects(()=>synthesizeCloud('Hello',geminiSettings,{gemini:'test'},async()=>new Response(JSON.stringify({error:{message:'SECRET'}}),{status:429})),e=>/Лимит/.test(e.message)&&!e.message.includes('SECRET'));
  await assert.rejects(()=>synthesizeCloud('Hello',geminiSettings,{gemini:'test'},async()=>new Response('{}')),/не вернул аудио/);
  await assert.rejects(()=>synthesizeCloud('Hello',{ttsProvider:'groq'},{groq:'test'},async()=>new Response('bad audio')),/неподдерживаемом формате/);
  await assert.rejects(()=>synthesizeCloud('Hello',{ttsProvider:'groq'},{groq:'test'},async()=>new Response(JSON.stringify({error:{code:'model_terms_required'}}),{status:400})),/Примите условия/);
  assert.throws(()=>cloudOptions({geminiVoice:'invalid'}),/голос/);assert.throws(()=>cloudOptions({ttsModel:'other'}),/модель/);
});
test('Groq streaming WAV with unknown RIFF/data lengths becomes a standard browser WAV',async()=>{
  const wave=Buffer.from((await synthesizeCloud('test',{...geminiSettings,volume:100},{gemini:'test'},async()=>geminiResponse())).audio,'base64');
  wave.writeUInt32LE(0xffffffff,4);wave.writeUInt32LE(0xffffffff,40);
  const result=await synthesizeCloud('Hello',{ttsProvider:'groq',volume:100},{groq:'test'},async()=>new Response(wave));
  const restored=Buffer.from(result.audio,'base64');assert.equal(restored.readUInt32LE(4),restored.length-8);assert.equal(restored.readUInt32LE(40),pcm.length);assert.deepEqual(restored.subarray(44),pcm);
});
test('Gemini WAV replies and multipart PCM do not acquire duplicate headers',async()=>{
  const wave=Buffer.from((await synthesizeCloud('test',geminiSettings,{gemini:'test'},async()=>geminiResponse())).audio,'base64');
  const reply=await synthesizeCloud('test',{...geminiSettings,volume:100},{gemini:'test'},async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/wav',data:wave.toString('base64')}},{inlineData:{mimeType:'audio/wav',data:wave.toString('base64')}}]}}]})));
  const wav=Buffer.from(reply.audio,'base64');assert.equal(wav.length,44+8);assert.equal(wav.readUInt32LE(40),8);
});
test('local API keeps keys private, restores cloud voice, previews and scenarios use same service',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-cloud-'));const calls=[],native=[];
  const options={dataDir,runWindows:async(op,payload)=>{native.push({op,payload});return {voices:[],recognizers:[]};},speechFetch:async(url,request)=>{calls.push({url,body:JSON.parse(request.body)});return geminiResponse();}};
  let app=await createServer(options),bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();
  const post=async(endpoint,body)=>{const response=await fetch(app.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':bootstrap.token},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
  try{
    assert.equal(bootstrap.settings.ttsProvider,'gemini');assert.equal(bootstrap.speechProviders.gemini.voices.length,30);
    const missing=await post('speak',{text:'Привет'});assert.equal(missing.status,400);assert.match(missing.data.error,/Добавьте ключ Gemini/);assert.equal(calls.length,0);
    await post('key',{provider:'gemini',key:'synthetic-test-key',remember:false});
    const settings={...bootstrap.settings,...geminiSettings};assert.equal((await post('settings',settings)).status,200);
    assert.equal((await post('speak',{text:'Проверка',geminiVoice:'Puck'})).status,200);assert.equal(calls.at(-1).body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Puck');
    assert.equal((await(await fetch(app.url+'/api/bootstrap')).json()).settings.geminiVoice,'Charon');
    await post('commands/save',{id:'cloud-steps',name:'Облачные реплики',phrases:['облачные реплики'],actions:[{type:'speak',value:'Первая реплика'},{type:'speak',value:'Вторая реплика'}]});
    const result=await post('commands/run',{id:'cloud-steps'});assert.equal(result.status,200);assert.equal(result.data.reply,'Вторая реплика');assert.equal(calls.at(-1).body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Charon');assert.ok(native.some(c=>c.op==='play'));assert.ok(!native.some(c=>c.op==='speak'));
    const exposed=JSON.stringify(await(await fetch(app.url+'/api/bootstrap')).json());assert.ok(!exposed.includes('synthetic-test-key'));
    await app.close();app=await createServer(options);bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();assert.equal(bootstrap.settings.geminiVoice,'Charon');assert.equal(bootstrap.settings.ttsProvider,'gemini');
    assert.equal((await post('settings',{...bootstrap.settings,ttsProvider:'bad'})).status,400);
  }finally{await app.close();await rm(dataDir,{recursive:true,force:true});}
});
