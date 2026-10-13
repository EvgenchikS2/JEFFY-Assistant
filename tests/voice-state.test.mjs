import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceReadiness} from '../public/voice-state.mjs';
test('unavailable Russian Windows recognition falls back to installed Vosk',()=>{
  assert.deepEqual(voiceReadiness({engine:'windows'},{recognizers:[{culture:'en-US'}],offlineReady:true},{}),voiceReadiness({engine:'vosk'},{offlineReady:true},{}));
});
test('installed Russian Windows recognition stays selected',()=>{
  const result=voiceReadiness({engine:'windows'},{recognizers:[{culture:'ru-RU'}],offlineReady:true},{});
  assert.equal(result.engine,'windows');assert.equal(result.ready,true);
});
test('cloud selection is respected, and errors identify the selected service',()=>{
  const missing=voiceReadiness({engine:'groq'},{offlineReady:true},{});
  assert.equal(missing.engine,'groq');assert.equal(missing.ready,false);assert.match(missing.reason,/Groq/);
  assert.equal(voiceReadiness({engine:'groq'},{offlineReady:true},{groq:{configured:true}}).ready,true);
});
test('missing Vosk and unavailable Windows have distinct messages',()=>{
  assert.match(voiceReadiness({engine:'vosk'},{offlineReady:false},{}).reason,/Vosk не найден/);
  assert.match(voiceReadiness({engine:'windows'},{recognizers:[],offlineReady:false},{}).reason,/Windows не установлен/);
});
