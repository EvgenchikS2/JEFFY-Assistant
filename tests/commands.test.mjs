import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COMMANDS, matchCommand, validateCommand, checkConflicts } from '../src/commands.mjs';
test('Russian phrases, punctuation and wake word match exactly',()=>{
  assert.equal(matchCommand('Джеффи, открой ЮТУБ!',DEFAULT_COMMANDS).id,'youtube');
  assert.equal(matchCommand('ДЖЕФФИ, который час?',DEFAULT_COMMANDS).id,'time');
  assert.equal(matchCommand('джефи который час',DEFAULT_COMMANDS,'джеффи',true).id,'time');
  assert.equal(matchCommand('не открой ютуб',DEFAULT_COMMANDS),null);
  assert.equal(matchCommand('открой ютуб',DEFAULT_COMMANDS,'джеффи',true),null);
  assert.equal(matchCommand('джеффи, открой ютуб',DEFAULT_COMMANDS,'джеффи',true).id,'youtube');
});
test('disabled commands cannot match',()=>assert.equal(matchCommand('открой ютуб',[{...DEFAULT_COMMANDS[0],enabled:false}]),null));
test('common Telegram spellings run the command rather than reaching AI',()=>{
  for(const phrase of ['открой телеграмм','Джеффи открой телеграм','открой Telegram','запусти телеграмм'])assert.equal(matchCommand(phrase,DEFAULT_COMMANDS).id,'telegram');
  assert.equal(matchCommand('не открой телеграмм',DEFAULT_COMMANDS),null);
});
test('unsafe actions and URL protocols are rejected',()=>{
  const raw={name:'Test',phrases:['test'],actions:[{type:'url',value:'javascript:alert(1)'}]};
  assert.throws(()=>validateCommand(raw));
  assert.throws(()=>validateCommand({...raw,actions:[{type:'powershell',value:'anything'}]}));
  assert.throws(()=>validateCommand({...raw,actions:[{type:'app',value:'cmd'}]}));
  assert.throws(()=>validateCommand({...raw,actions:[{type:'url',value:'https://user:password@example.com'}]}));
  assert.throws(()=>validateCommand({...raw,actions:[{type:'wait',value:'NaN'}]}));
});
test('duplicates and excessively long scenarios are rejected',()=>{
  assert.throws(()=>checkConflicts([...DEFAULT_COMMANDS,{...DEFAULT_COMMANDS[0],id:'duplicate'}]));
  assert.throws(()=>checkConflicts([...DEFAULT_COMMANDS,DEFAULT_COMMANDS[0]]));
  assert.throws(()=>validateCommand({name:'Long',phrases:['long'],actions:Array.from({length:3},()=>({type:'wait',value:'15'}))}));
});
test('categories survive a reload',()=>assert.deepEqual(DEFAULT_COMMANDS.map(validateCommand).map(c=>c.group),DEFAULT_COMMANDS.map(c=>c.group)));
