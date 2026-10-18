// One validation path for saved preferences, previews, replies and scenario steps.
export function speechOptions(input, fallback = {}) {
  const voice = input.voice ?? fallback.voice ?? '';
  const rate = +(input.rate ?? fallback.rate ?? 0);
  const pitch = input.pitch ?? fallback.pitch ?? 'medium';
  const volume = +(input.volume ?? fallback.volume ?? 100);
  if (typeof voice !== 'string') throw new Error('Недопустимый голос.');
  if (!Number.isInteger(rate) || rate < -5 || rate > 5) throw new Error('Недопустимая скорость речи.');
  if (!['low','medium','high'].includes(pitch)) throw new Error('Недопустимая высота голоса.');
  if (!Number.isInteger(volume) || volume < 10 || volume > 100) throw new Error('Громкость: от 10 до 100.');
  return { voice, rate, pitch, volume };
}
