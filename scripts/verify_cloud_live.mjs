// Uses only keys already saved by the user in this project's DPAPI store.
// Never prints keys, encrypted values, request headers or raw provider errors.
import {readFile} from 'node:fs/promises';
import {windows} from '../src/windows.mjs';
import {synthesizeCloud} from '../src/cloud-speech.mjs';
const encrypted=JSON.parse(await readFile(new URL('../data/keys.dpapi.json',import.meta.url),'utf8').catch(()=>'{}'));
const evidence={at:new Date().toISOString(),services:{}};
for(const provider of ['groq','gemini']){
  if(!encrypted[provider]){evidence.services[provider]={tested:false,reason:'No saved key'};continue;}
  try{
    const key=(await windows('unprotect',{value:encrypted[provider]})).value;
    const result=await synthesizeCloud(provider==='gemini'?'Привет. Я Джеффи. Проверка голоса.':'Hello. I am Jeffy. This is a voice test.',{ttsProvider:provider,volume:80},{[provider]:key});
    const wav=Buffer.from(result.audio,'base64');evidence.services[provider]={tested:true,ok:true,wavBytes:wav.length,format:wav.toString('ascii',0,4),sampleRate:wav.readUInt32LE(24)};
  }catch(error){evidence.services[provider]={tested:true,ok:false,error:error.message};}
}
console.log(JSON.stringify(evidence,null,2));
