import test from 'node:test';
import assert from 'node:assert/strict';
import { answer, transcribe } from '../src/providers.mjs';
test('keys remain in server headers; Groq sends real completion schema',async()=>{
  const result=await answer('test',{provider:'groq',model:'openai/gpt-oss-20b'},{groq:'test-only-key'},[],async(url,options)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer test-only-key');
    assert.equal(JSON.parse(options.body).messages.at(-1).content,'test');
    assert.ok(!options.body.includes('test-only-key'));
    return new Response(JSON.stringify({choices:[{message:{content:'Готов'}}]}));
  });assert.equal(result,'Готов');
});
test('Whisper receives Russian audio upload',async()=>{
  assert.equal(await transcribe(Buffer.from('RIFF-test'),'groq',{groq:'test'},async(url,o)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/audio/transcriptions');
    assert.equal(o.body.get('language'),null);assert.equal(o.body.get('model'),'whisper-large-v3-turbo');assert.equal(o.body.get('file').name,'voice.wav');
    return new Response(JSON.stringify({text:'Джеффи который час'}));
  }),'Джеффи который час');
});
test('Gemini uses multimodal WAV rather than a chat-only transcription',async()=>{
  assert.equal(await transcribe(Buffer.from('RIFF-test'),'gemini',{gemini:'test'},async(url,o)=>{
    assert.ok(url.endsWith(':generateContent'));const data=JSON.parse(o.body);assert.equal(data.contents[0].parts[1].inlineData.mimeType,'audio/wav');
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'привет'}]}}]}));
  }),'привет');
});
test('API quota failures have readable errors',async()=>{
  await assert.rejects(()=>answer('test',{provider:'groq'},{groq:'test'},[],async()=>new Response('{}',{status:429})),/Лимит/);
  await assert.rejects(()=>answer('test',{provider:'groq'},{},[],async()=>{throw new Error('Should not call')}),/Добавьте ключ/);
});
test('Ollama stays on loopback and needs no key',async()=>{
  assert.equal(await answer('test',{provider:'ollama',model:'qwen3:4b'},{},[],async(url,o)=>{assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');assert.equal(o.headers.Authorization,undefined);return new Response(JSON.stringify({choices:[{message:{content:'<think>reason</think>Готов'}}]}));}),'Готов');
});
