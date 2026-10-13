"""Persistent local WAV transcription; no microphone access and no network."""
import base64
import io
import json
import sys
import wave
from vosk import Model, KaldiRecognizer, SetLogLevel

SetLogLevel(-1)
sys.stdout.reconfigure(encoding='utf-8')
sys.stdin.reconfigure(encoding='utf-8')
model = Model(sys.argv[1])
for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        with wave.open(io.BytesIO(base64.b64decode(request['audio'])), 'rb') as audio:
            if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getcomptype() != 'NONE':
                raise ValueError('Нужна моно-запись WAV PCM 16-bit.')
            recognizer = KaldiRecognizer(model, audio.getframerate())
            results = []
            while data := audio.readframes(4000):
                if recognizer.AcceptWaveform(data):
                    results.append(json.loads(recognizer.Result()).get('text', ''))
            results.append(json.loads(recognizer.FinalResult()).get('text', ''))
        print(json.dumps({'id': request['id'], 'text': ' '.join(filter(None, results))}, ensure_ascii=False), flush=True)
    except Exception as error:
        print(json.dumps({'id': request.get('id'), 'error': str(error)}, ensure_ascii=False), flush=True)
