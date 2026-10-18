import {readFile} from 'node:fs/promises';
import {windows} from '../src/windows.mjs';
import {transcribe,answer} from '../src/providers.mjs';
import {synthesizeCloud} from '../src/cloud-speech.mjs';
const encrypted=JSON.parse(await readFile(new URL('../data/keys.dpapi.json',import.meta.url),'utf8'));
const keys={groq:(await windows('unprotect',{value:encrypted.groq})).value};
const evidence={at:new Date().toISOString()};
try{
  const capabilities=await windows('capabilities');const voice=capabilities.voices.find(v=>v.culture==='en-US');
  if(!voice)throw Error('No English Windows test voice');
  const spoken=await windows('speak',{text:'What is two plus two?',voice:voice.name,rate:0});
  const recognized=await transcribe(Buffer.from(spoken.audio,'base64'),'groq',keys);
  if(!/[a-z]/i.test(recognized)||/[а-яё]/i.test(recognized))throw Error('English recognition did not preserve English');
  const reply=await answer(recognized,{provider:'groq',replyLanguage:'auto'},keys);
  if(!/[a-z]/i.test(reply)||/[а-яё]/i.test(reply))throw Error('Answer did not preserve English');
  evidence.english={recognized,reply};
  for(const [language,text] of [['en','Hello. I am Jeffy.'],['ru','Привет. Я Джеффи.']]){
    const result=await synthesizeCloud(text,{ttsProvider:'groq',groqVoice:'troy'},keys);const wav=Buffer.from(result.audio,'base64');
    if(wav.toString('ascii',0,4)!=='RIFF'||wav.length<1000)throw Error('No valid WAV');
    evidence[language+'Speech']={bytes:wav.length,sampleRate:wav.readUInt32LE(24),pronunciationQuality:'not rated'};
  }
  evidence.ok=true;
}catch(error){evidence.ok=false;evidence.error=error.message;process.exitCode=1;}
console.log(JSON.stringify(evidence,null,2));
