const modifiers={CTRL:'Ctrl',CONTROL:'Ctrl',ALT:'Alt',SHIFT:'Shift',WIN:'Win',WINDOWS:'Win',META:'Win'};
const named={ESC:'Esc',ESCAPE:'Esc',ENTER:'Enter',RETURN:'Enter',TAB:'Tab',SPACE:'Space',BACKSPACE:'Backspace',DELETE:'Delete',DEL:'Delete',INSERT:'Insert',HOME:'Home',END:'End',PAGEUP:'PageUp',PAGEDOWN:'PageDown',UP:'Up',DOWN:'Down',LEFT:'Left',RIGHT:'Right',PRINTSCREEN:'PrintScreen',PAUSE:'Pause',CAPSLOCK:'CapsLock',PLUS:'Plus',MINUS:'Minus',COMMA:'Comma',PERIOD:'Period',SLASH:'Slash',SEMICOLON:'Semicolon',QUOTE:'Quote',BACKQUOTE:'Backquote',BRACKETLEFT:'BracketLeft',BRACKETRIGHT:'BracketRight',BACKSLASH:'Backslash'};
export function normalizeShortcut(value){
  if(typeof value!=='string'||value.length>100)throw new Error('Введите сочетание клавиш, например Ctrl+Shift+S.');
  const tokens=value.replace(/\+\+$/,'+Plus').split('+').map(t=>t.trim().toUpperCase());
  if(tokens.length<1||tokens.length>5||tokens.some(t=>!t))throw new Error('Сочетание должно содержать клавишу и необязательные Ctrl, Alt, Shift, Win.');
  const mods=[];let key;
  for(const token of tokens){if(modifiers[token]){if(mods.includes(modifiers[token]))throw new Error('Модификатор повторяется.');mods.push(modifiers[token]);}else{if(key)throw new Error('Используйте одну основную клавишу в сочетании.');key=named[token]||(/^[A-Z0-9]$/.test(token)||/^F([1-9]|1[0-9]|2[0-4])$/.test(token)?token:null);if(!key)throw new Error(`Неизвестная клавиша «${token}». Пример: Ctrl+Shift+S.`);}}
  if(!key)throw new Error('Добавьте основную клавишу, например S, Enter или F5.');
  return [...['Ctrl','Alt','Shift','Win'].filter(m=>mods.includes(m)),key].join('+');
}
