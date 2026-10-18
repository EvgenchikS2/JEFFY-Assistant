import test from 'node:test';
import assert from 'node:assert/strict';
import {answer,transcribe} from '../src/providers.mjs';
import {synthesizeCloud} from '../src/cloud-speech.mjs';

test('Whisper autodetection does not force Russian and can explicitly request English',async()=>{
  const audio=Buffer.alloc(44);
  for(const language of ['auto','en','ru']){
    const text=await transcribe(audio,'groq',{groq:'test'},async(url,options)=>{
      assert.ok(url.endsWith('/audio/transcriptions'));assert.equal(options.body.get('language'),language==='auto'?null:language);assert.equal(options.body.get('response_format'),'json');return new Response(JSON.stringify({text:language==='ru'?'Привет':'Hello Jeffy'}));
    },language);
    assert.equal(text,language==='ru'?'Привет':'Hello Jeffy');
  }
});
test('Gemini transcription preserves the original language instead of translating to Russian',async()=>{
  await transcribe(Buffer.alloc(44),'gemini',{gemini:'test'},async(url,options)=>{
    const prompt=JSON.parse(options.body).contents[0].parts[0].text;assert.match(prompt,/исходном языке/);assert.match(prompt,/Не переводи/);assert.match(prompt,/английск/);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Hello Jeffy'}]}}]}));
  });
});
test('answers follow the question language and respect an explicit English preference',async()=>{
  for(const replyLanguage of ['auto','en','ru']){
    await answer('Hello Jeffy',{provider:'groq',replyLanguage},{groq:'test'},[],async(url,options)=>{
      const system=JSON.parse(options.body).messages[0].content;
      assert.match(system,replyLanguage==='auto'?/языке последней реплики/:replyLanguage==='en'?/Answer in English/:/Отвечай по-русски/);
      return new Response(JSON.stringify({choices:[{message:{content:'Hello'}}]}));
    });
  }
});
test('experimental Russian is sent unchanged to Groq TTS',async()=>{
  const pcm=Buffer.alloc(8);const wave=await synthesizeCloud('fixture',{ttsProvider:'gemini'},{gemini:'test'},async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/L16;rate=24000',data:pcm.toString('base64')}}]}}]})));
  await synthesizeCloud('Привет. Я Джеффи.',{ttsProvider:'groq'},{groq:'test'},async(url,options)=>{
    assert.equal(JSON.parse(options.body).input,'Привет. Я Джеффи.');return new Response(Buffer.from(wave.audio,'base64'));
  });
});
