export const SPEECH_PROVIDERS={
  gemini:{name:'Gemini · русский и другие языки',voices:['Kore','Puck','Charon','Fenrir','Aoede','Leda','Orus','Zephyr','Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina','Erinome','Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux','Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager','Sulafat'],models:['gemini-2.5-flash-preview-tts','gemini-3.1-flash-tts-preview','gemini-2.5-pro-preview-tts']},
  groq:{name:'Groq Orpheus · русский экспериментально',voices:['troy','austin','daniel','autumn','diana','hannah'],model:'canopylabs/orpheus-v1-english'}
};
export function cloudOptions(input,fallback={}){
  const result={ttsProvider:input.ttsProvider??fallback.ttsProvider??'gemini',geminiVoice:input.geminiVoice??fallback.geminiVoice??'Kore',groqVoice:input.groqVoice??fallback.groqVoice??'troy',ttsModel:input.ttsModel??fallback.ttsModel??SPEECH_PROVIDERS.gemini.models[0]};
  if(!['windows','gemini','groq'].includes(result.ttsProvider))throw Error('Неизвестный сервис озвучки.');
  if(!SPEECH_PROVIDERS.gemini.voices.includes(result.geminiVoice)||!SPEECH_PROVIDERS.groq.voices.includes(result.groqVoice))throw Error('Неизвестный облачный голос.');
  if(!SPEECH_PROVIDERS.gemini.models.includes(result.ttsModel))throw Error('Неизвестная модель озвучки Gemini.');
  return result;
}
function pcmWave(pcm,rate=24000){
  if(!pcm.length||pcm.length%2)throw Error('Провайдер вернул повреждённое аудио.');
  const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);
}
function waveData(wav){
  if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('Провайдер вернул аудио в неподдерживаемом формате.');
  let format,data;
  for(let pos=12;pos+8<=wav.length;){const tag=wav.toString('ascii',pos,pos+4),declared=wav.readUInt32LE(pos+4),start=pos+8;
    // Groq returns streaming RIFF: 0xffffffff means data continues until EOF.
    const size=tag==='data'&&declared===0xffffffff?wav.length-start:declared,end=start+size;
    if(end>wav.length)throw Error('Провайдер вернул неполное аудио.');if(tag==='fmt '){if(size<16)throw Error('Повреждённый формат WAV.');format=wav.subarray(start,end);}if(tag==='data')data=wav.subarray(start,end);pos=end+(size%2);}
  if(!format||!data?.length||format.readUInt16LE(0)!==1||format.readUInt16LE(14)!==16||data.length%2)throw Error('Ожидалось PCM-аудио 16 бит.');
  return {format,data};
}
function combineWaves(waves,volume){
  const chunks=waves.map(waveData),format=chunks[0].format;
  if(chunks.some(c=>!c.format.equals(format)))throw Error('Провайдер вернул несовместимые части аудио.');
  const data=Buffer.concat(chunks.map(c=>c.data));
  if(volume!==100)for(let i=0;i<data.length;i+=2)data.writeInt16LE(Math.round(data.readInt16LE(i)*volume/100),i);
  const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);format.copy(h,20,0,16);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);
}
function splitText(text,limit){
  const result=[];let remaining=text.trim();
  while(remaining.length){let end=Math.min(limit,remaining.length);if(end<remaining.length){const space=remaining.lastIndexOf(' ',end);if(space>limit/2)end=space;const code=remaining.charCodeAt(end-1);if(code>=0xd800&&code<=0xdbff)end--;}
    result.push(remaining.slice(0,end));remaining=remaining.slice(end).trimStart();}
  return result;
}
async function request(url,options,fetcher){
  let response;try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(60000)});}catch{throw Error('Нет связи с сервисом озвучки. Проверьте интернет и доступность провайдера.');}
  if(!response.ok){
    // Raw service errors may contain request data. Only expose a safe diagnosis.
    const error=await response.json().catch(()=>({}));const code=error.error?.code;
    if(response.status===429)throw Error('Лимит озвучки исчерпан. Подождите или смените сервис в настройках голоса.');
    if(code==='model_terms_required')throw Error('Примите условия модели Orpheus в консоли Groq и повторите предпрослушивание.');
    if([401,403].includes(response.status))throw Error('Ключ озвучки отклонён. Проверьте ключ, доступ к модели и регион в разделе «Подключения».');
    if(response.status===404)throw Error('Модель озвучки недоступна. Выберите другую модель Gemini в настройках.');
    throw Error(`Сервис озвучки вернул ошибку ${response.status}. Проверьте доступ к TTS-модели в консоли провайдера.`);
  }return response;
}
export async function synthesizeCloud(text,settings,keys,fetcher=fetch){
  const s=cloudOptions(settings),provider=s.ttsProvider;
  if(!SPEECH_PROVIDERS[provider])throw Error('Неизвестный облачный сервис озвучки.');
  if(!keys[provider])throw Error(`Добавьте ключ ${provider==='gemini'?'Gemini':'Groq'} в разделе «Подключения», чтобы включить облачный голос.`);
  const chunks=splitText(text,provider==='groq'?200:1800),waves=[];
  for(const chunk of chunks){
    if(provider==='groq'){
      const response=await request('https://api.groq.com/openai/v1/audio/speech',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${keys.groq}`},body:JSON.stringify({model:SPEECH_PROVIDERS.groq.model,input:chunk,voice:s.groqVoice,response_format:'wav'})},fetcher);
      const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>24*1024*1024)throw Error('Слишком большой ответ озвучки.');waves.push(bytes);
    }else{
      const speed=settings.rate<0?'Speak slowly.':settings.rate>0?'Speak briskly.':'Speak at a natural pace.';
      const tone=settings.pitch==='low'?'Use a lower tone.':settings.pitch==='high'?'Use a higher tone.':'';
      const response=await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.ttsModel)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':keys.gemini},body:JSON.stringify({contents:[{role:'user',parts:[{text:`Read aloud the following text verbatim in its original language. ${speed} ${tone} Do not answer questions or add words.\n\n${chunk}`}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:s.geminiVoice}}}}})},fetcher);
      const data=await response.json();const parts=data.candidates?.[0]?.content?.parts?.filter(p=>p.inlineData?.mimeType?.startsWith('audio/')).map(p=>p.inlineData)||[];
      if(!parts.length)throw Error('Gemini не вернул аудио. Попробуйте другой текст, голос или модель озвучки.');
      for(const part of parts){if(typeof part.data!=='string'||part.data.length>32*1024*1024)throw Error('Повреждённый ответ озвучки Gemini.');const bytes=Buffer.from(part.data,'base64'),mime=part.mimeType.toLowerCase();
        if(['audio/wav','audio/x-wav'].includes(mime))waves.push(bytes);
        else if(mime.startsWith('audio/l16')||mime.startsWith('audio/pcm')){const rate=+(mime.match(/rate=(\d+)/)?.[1]||24000);if(rate<8000||rate>96000)throw Error('Неизвестная частота аудио Gemini.');waves.push(pcmWave(bytes,rate));}
        else throw Error('Gemini вернул неподдерживаемый формат аудио.');}
    }
  }
  return {audio:combineWaves(waves,settings.volume??100).toString('base64')};
}
