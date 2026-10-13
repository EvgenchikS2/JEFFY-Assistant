export function voiceReadiness(settings, capabilities, keys) {
  let engine = settings.engine;
  const russianWindows = (capabilities.recognizers || []).some(r => r.culture === 'ru-RU');
  if (engine === 'windows' && !russianWindows && capabilities.offlineReady) engine = 'vosk';
  if (engine === 'vosk') return {engine,ready:!!capabilities.offlineReady,reason:'Офлайн-голос Vosk не найден. Запусти INSTALL-OFFLINE.cmd рядом с приложением, затем попробуй снова.'};
  if (engine === 'windows') return {engine,ready:russianWindows,reason:'Русский распознаватель Windows не установлен. Выбери Vosk в настройках или подключи Groq.'};
  if (engine === 'groq' || engine === 'gemini') return {engine,ready:!!keys[engine]?.configured,reason:`Для распознавания ${engine === 'groq' ? 'Groq' : 'Gemini'} нужен ключ. Добавь его в «Подключениях» или выбери Vosk в настройках.`};
  return {engine,ready:false,reason:'Выбери движок распознавания речи в настройках.'};
}
