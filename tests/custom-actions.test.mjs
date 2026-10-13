import test from 'node:test';
import assert from 'node:assert/strict';
import {matchCommand,findCommand,DEFAULT_COMMANDS,validateCommand,validateApplication} from '../src/commands.mjs';
import {normalizeShortcut} from '../src/shortcuts.mjs';
test('own applications and shortcuts survive command validation',()=>{
  const command=validateCommand({name:'Моя программа',phrases:['начни работу'],actions:[{type:'app',value:'C:\\Program Files\\Example\\editor.exe'},{type:'shortcut',value:'shift + control + s'}]});
  assert.equal(command.actions[0].value,'C:\\Program Files\\Example\\editor.exe');assert.equal(command.actions[1].value,'Ctrl+Shift+S');
  assert.equal(validateApplication('D:\\Games\\Game.lnk'),'D:\\Games\\Game.lnk');
});
test('application values do not permit a command line or script',()=>{
  for(const value of ['notepad.exe','C:\\file.cmd','C:\\file.ps1','C:\\file.exe -anything','"C:\\file.exe"','C:\\file.exe\n'])assert.throws(()=>validateApplication(value));
});
test('custom key combinations cover modifiers, function keys and symbols',()=>{
  assert.equal(normalizeShortcut('Win+d'),'Win+D');assert.equal(normalizeShortcut('Ctrl+Alt+F12'),'Ctrl+Alt+F12');assert.equal(normalizeShortcut('Ctrl++'),'Ctrl+Plus');assert.equal(normalizeShortcut('Escape'),'Esc');
  for(const value of ['Ctrl','Ctrl+Ctrl+S','Ctrl+S+A','Ctrl+F25','Ctrl+; script','Ctrl+'])assert.throws(()=>normalizeShortcut(value));
});
test('small pronunciation errors and polite wording still find a command',()=>{
  for(const phrase of ['джефи открои телеграмм','открой пожалуйста телеграмм','запусти пожалуйста блокнот','открой блкнот'])assert.ok(['telegram','notepad'].includes(matchCommand(phrase,DEFAULT_COMMANDS)?.id),phrase);
  assert.equal(findCommand('открой блкнот',DEFAULT_COMMANDS).fuzzy,true);
  assert.equal(matchCommand('паузу',DEFAULT_COMMANDS).id,'pause');
  assert.equal(matchCommand('громчи',DEFAULT_COMMANDS).id,'louder');
});
test('negation, opposite actions and close competing commands never auto-execute',()=>{
  for(const phrase of ['не открой блокнот','закрой блокнот','разблокируй компьютер','отмени открытие блокнота'])assert.equal(matchCommand(phrase,DEFAULT_COMMANDS),null,phrase);
  const make=(id,phrase)=>({id,name:id,enabled:true,phrases:[phrase],actions:[{type:'time'}]});
  assert.throws(()=>matchCommand('открой фурму',[make('ферма','открой ферму'),make('форма','открой форму')]),/несколько команд/);
});
