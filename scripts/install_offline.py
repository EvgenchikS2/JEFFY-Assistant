"""Install Vosk only inside this project; download the official Apache 2.0 model."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import urllib.request
import venv
import zipfile

sys.stdout.reconfigure(encoding='utf-8')
root = Path(__file__).resolve().parent.parent
directory = root / 'offline'
directory.mkdir(exist_ok=True)
venv_dir = directory / 'venv'
python = venv_dir / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if not python.exists():
    print('Создаю отдельное окружение Python для Jeffy…', flush=True)
    venv.create(venv_dir, with_pip=True)
subprocess.run([str(python), '-m', 'pip', 'install', 'vosk==0.3.45'], check=True)
model = directory / 'vosk-model-small-ru-0.22'
archive = directory / 'model-download.zip'
source = 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip'
expected_hash = '961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4'
mirror = 'https://huggingface.co/rhasspy/vosk-models/resolve/e7ac2109d134b5f2404ba95389b2fb51916d4cab/ru/vosk-model-small-ru-0.22.zip'
if not (model / 'am/final.mdl').exists():
    print('Скачиваю русскую модель Vosk (45 МБ) с alphacephei.com…', flush=True)
    valid_archive = archive.exists() and hashlib.sha256(archive.read_bytes()).hexdigest() == expected_hash
    if not valid_archive:
        for download_url in [source, mirror]:
            try:
                with urllib.request.urlopen(download_url, timeout=25) as response, archive.open('wb') as output:
                    while chunk := response.read(64 * 1024):
                        output.write(chunk)
                if hashlib.sha256(archive.read_bytes()).hexdigest() != expected_hash:
                    raise ValueError('Контрольная сумма модели не совпадает.')
                source = download_url
                break
            except Exception:
                if download_url == mirror:
                    raise
                print('Основной сервер не ответил. Пробую зеркало Rhasspy с проверкой SHA256…', flush=True)
    destination = directory.resolve()
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.infolist():
            target = (destination / member.filename).resolve()
            if not target.is_relative_to(destination):
                raise ValueError('Небезопасный путь в архиве.')
        zipped.extractall(destination)
    (directory / 'download-info.json').write_text(json.dumps({'source': source, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'license': 'Apache-2.0'}, indent=2), encoding='utf-8')
    archive.unlink()
subprocess.run([str(python), '-c', 'import vosk; print("Vosk готов")'], check=True)
print('Готово! В настройках Jeffy выбери «Vosk · офлайн, без ключа».', flush=True)
