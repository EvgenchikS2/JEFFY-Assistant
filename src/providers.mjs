export const PROVIDERS = {
  groq: { name:'Groq', model:'openai/gpt-oss-20b', url:'https://console.groq.com/keys', description:'Вопросы, Whisper и озвучка Orpheus (русский экспериментально) одним ключом. Доступ и лимиты зависят от модели.' },
  gemini: { name:'Google Gemini', model:'gemini-2.5-flash', url:'https://aistudio.google.com/apikey', description:'Русская облачная озвучка с выбором голосов, распознавание и ответы одним ключом. Free tier зависит от модели и региона.' },
  openrouter: { name:'OpenRouter', model:'openrouter/free', url:'https://openrouter.ai/settings/keys', description:'Бесплатные модели для ответов. Для распознавания выберите Vosk или Groq.' },
  ollama: { name:'Ollama', model:'qwen3:4b', url:'https://ollama.com/download', description:'Локальные ответы без ключа. Нужен установленный Ollama и скачанная модель.' }
};
async function remote(url, options, fetcher) {
  let response;
  try { response = await fetcher(url,{...options, signal:AbortSignal.timeout(45000)}); }
  catch { throw new Error('Нет связи с провайдером. Проверьте интернет и доступность сервиса в вашем регионе.'); }
  if(!response.ok) {
    if(response.status === 401 || response.status === 403) throw new Error('Провайдер отклонил запрос. Проверьте ключ и доступность сервиса в вашем регионе.');
    if(response.status === 429) throw new Error('Лимит бесплатного API исчерпан. Подождите или выберите другого провайдера.');
    if(response.status === 404) throw new Error('Модель не найдена. Обновите её название в настройках.');
    throw new Error(`Провайдер вернул ошибку ${response.status}. Попробуйте позже.`);
  }
  return response.json();
}
export async function answer(text, settings, keys, context = [], fetcher = fetch) {
  const p = settings.provider, model = settings.model || PROVIDERS[p].model;
  if(p !== 'ollama' && !keys[p]) throw new Error(`Добавьте ключ ${PROVIDERS[p].name} в разделе «Подключения».`);
  const language=settings.replyLanguage==='ru'?'Отвечай по-русски.':settings.replyLanguage==='en'?'Answer in English.':'Отвечай на языке последней реплики пользователя: на английскую речь отвечай по-английски, на русскую — по-русски. Если пользователь просит другой язык, используй его. Не переводи вопрос вместо ответа.';
  const system = 'Ты Джеффи, голосовой помощник. '+language+' Отвечай кратко, без markdown, максимум 4 предложения. Не утверждай, что выполнил действия на компьютере: у тебя нет инструментов. Ты отвечаешь только на вопросы. Если просят запустить что-то, предложи добавить голосовую команду в библиотеку.';
  if(p === 'gemini') {
    const data = await remote(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':keys[p]},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[...context.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),{role:'user',parts:[{text}]}],generationConfig:{maxOutputTokens:700}})},fetcher);
    const result = data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('');
    if(!result) throw new Error('Gemini не вернул ответ. Попробуйте другую формулировку.');
    return result;
  }
  const base = {groq:'https://api.groq.com/openai/v1',openrouter:'https://openrouter.ai/api/v1',ollama:'http://127.0.0.1:11434/v1'}[p];
  const data = await remote(base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',...(p !== 'ollama' ? {Authorization:`Bearer ${keys[p]}`} : {})},body:JSON.stringify({model,messages:[{role:'system',content:system},...context,{role:'user',content:text}],max_tokens:600,stream:false})},fetcher);
  const result = data.choices?.[0]?.message?.content;
  if(!result) throw new Error('Провайдер не вернул ответ.');
  return result.replace(/<think>[\s\S]*?<\/think>/g,'').trim();
}
export async function transcribe(audio, engine, keys, fetcher = fetch, language = 'auto') {
  if(!['auto','ru','en'].includes(language))throw Error('Неизвестный язык распознавания.');
  if(!keys[engine]) throw new Error(`Добавьте ключ ${PROVIDERS[engine]?.name || engine} для распознавания голоса.`);
  if(engine === 'groq') {
    const body = new FormData(); body.append('file',new Blob([audio],{type:'audio/wav'}),'voice.wav'); body.append('model','whisper-large-v3-turbo'); if(language!=='auto')body.append('language',language); body.append('response_format','json');
    const data = await remote('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${keys.groq}`},body},fetcher);
    return data.text?.trim() || '';
  }
  if(engine === 'gemini') {
    const prompt='Дословно расшифруй речь на исходном языке. Не переводи. '+(language==='auto'?'Автоматически определи язык, включая русский и английский.':language==='en'?'Ожидается английская речь.':'Ожидается русская речь.')+' Верни только произнесённые слова, без комментариев. Если речи нет, верни пустую строку.';
    const data = await remote('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':keys.gemini},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:'audio/wav',data:audio.toString('base64')}}]}]})},fetcher);
    return data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim() || '';
  }
  throw new Error('Неизвестный сервис распознавания.');
}
