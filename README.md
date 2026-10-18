# Jeffy Assistant

**[Русский](#русский) · [English](#english)**

## Русский

Jeffy — голосовой помощник для Windows 10/11 с тёмно-синим интерфейсом, голосовыми командами, ответами ИИ и сценариями. Текстового чата нет. Проект вдохновлён идеей голосового управления ПК и не связан с разработчиками Luxify.

### Быстрый запуск

- Запустите **Jeffy-1.2.3-Windows.exe**. Node.js для переносимого EXE не требуется.
- Для полного выхода выберите **Завершить** в меню значка в трее. Закрытие окна сворачивает Jeffy в трей.
- Для запуска из исходников установите Node.js 22+ и выполните:

```powershell
npm.cmd ci
npm.cmd start
```

Также доступны `START-JEFFY.cmd` и браузерный режим `START-BROWSER.cmd`. Браузерный адрес: `http://127.0.0.1:47831`. Трей и глобальная горячая клавиша работают в приложении Windows.

### Язык интерфейса

Выберите **Русский** или **English** в правой части верхней панели. Выбор применяется сразу и сохраняется после перезапуска. Переведены навигация, настройки, редактор команд, подсказки и сообщения приложения. Язык интерфейса задаётся отдельно от языка распознавания и ответов ИИ.

Пользовательские названия, голосовые фразы и тексты сценариев не переводятся и не перезаписываются. Названия встроенных команд отображаются на выбранном языке; сами команды и их фразы сохраняются. Встроенные фразы в примерах остаются русскими, чтобы соответствовать библиотеке. Собственные фразы можно задавать на английском при использовании облачного распознавания.

### Распознавание, ответы и голос

В **Подключениях** добавьте свой ключ нужного провайдера. Включите **Запомнить на этом ПК**, чтобы сохранить его после выхода.

В **Настройках** отдельно выбираются:

- Распознавание: **Groq Whisper**, **Gemini**, **Vosk** или **Windows**.
- Язык распознавания: **Автоматически**, **Русский** или **English**.
- Язык ответов ИИ: **Как в вопросе**, **Всегда русский** или **Always English**.
- Сервис озвучки и голос: **Gemini**, **Groq Orpheus** или **Windows**.

Для русского и английского разговора выберите облачное распознавание, язык **Автоматически** и ответы **Как в вопросе**. Можно распознавать речь через Groq, получать ответы от Groq и озвучивать их Gemini. Для каждого используемого облачного провайдера нужен его ключ.

**Gemini** предлагает 30 голосов в приложении и отдельный выбор TTS-модели. **Groq Orpheus** предлагает 6 голосов; русский текст разрешён экспериментально, возможны акцент и искажения. **Windows** использует установленные совместимые SAPI-голоса локально.

Проверьте свой текст кнопкой **Послушать этот голос**, затем нажмите **Сохранить настройки**. Предпрослушивание не сохраняет изменения. Громкость работает для обоих облачных сервисов; высота и скорость в Gemini передаются как пожелания к звучанию. В Groq эти два регулятора отключены.

Для локального ИИ доступна **Ollama**: установите Ollama, загрузите модель, например `ollama pull qwen3:4b`, и выберите её в настройках. OpenRouter также доступен для ответов; для распознавания и озвучки выберите соответствующие отдельные сервисы.

### Офлайн-режим

Установите Python 3.10+ с добавлением в PATH и запустите `INSTALL-OFFLINE.cmd`. Установщик подготовит отдельное окружение Vosk и русскую модель. Затем перезапустите Jeffy и выберите Vosk для распознавания. Для полностью локальной озвучки выберите Windows.

Установленная модель Vosk и обнаруживаемый офлайн-модуль Windows рассчитаны на русский. Для английской речи выберите Groq Whisper или Gemini. При переносе EXE оставьте каталог `offline` рядом с ним; на другом ПК подготовьте офлайн-окружение заново. Каталог содержит виртуальное Python-окружение, поэтому его простой перенос не гарантирует работоспособность.

### Команды и сценарии

Микрофон включается кнопкой или `Ctrl+Shift+Space`. Запись заканчивается вручную, после паузы или по ограничению длительности. Поиск команд учитывает небольшие ошибки произношения и слова вежливости. Отрицания и противоположные действия не исправляются автоматически; неоднозначная фраза требует уточнения.

В комплекте 17 команд. В редакторе можно выбрать собственный **EXE/LNK**, сайт HTTP/HTTPS, своё сочетание клавиш, паузу, голосовую реплику, текущее время или блокировку ПК. Сценарий содержит до 20 действий. Блокировка требует подтверждения. Шаги выполняются последовательно; при ошибке выполнение останавливается. Тест фразы показывает совпадение без запуска действий. Кнопка ▶ выполняет настоящую команду.

Можно импортировать и экспортировать JSON команд. Экспорт не включает ключи и историю; проверьте личные пути и ссылки перед публикацией. Для своих английских команд добавьте соответствующие голосовые фразы в библиотеку.

### Данные и доступ к облаку

Настройки, команды и история хранятся в `data/`. Переносимый EXE использует `data` рядом с файлом; обычный собранный запуск — каталог пользователя Electron. До 100 записей истории хранятся локально. Аудиозаписи микрофона не сохраняются на диск.

Ключи по умолчанию остаются в памяти до выхода. Сохранённые ключи шифруются Windows DPAPI для текущей учётной записи. Не публикуйте `data/` и `keys.dpapi.json`. Облачное распознавание получает отправленную запись; ИИ получает вопрос и контекст сессии; сервис озвучки получает текст ответа. Доступ и бесплатные квоты зависят от аккаунта, модели и региона. [Сервисы и ограничения](docs/FREE-API.md).

### Проверка, сборка и публикация

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run dist
```

Сборка создаёт `dist/Jeffy-1.2.3-Windows.exe`. В папке для GitHub находятся исходники; EXE прикрепляйте к **GitHub Releases**. `data/`, `offline/`, `node_modules/`, `dist/`, EXE и локальные `.env` исключены из Git. В приложении нет телеметрии или настройки автозапуска Windows.

Автоматические тесты провайдеров используют тестовые ответы и сами по себе не подтверждают доступ к облаку с вашим ключом. Проверяйте подключение и предпрослушивание в приложении. Анимации учитывают системную настройку уменьшения движения; 120 FPS не заявляются как гарантированный результат.

Код распространяется по MIT. Зависимости и модель имеют собственные лицензии: [THIRD-PARTY.md](THIRD-PARTY.md).

---

## English

Jeffy is a voice-first assistant for Windows 10/11 with a dark navy interface, voice commands, AI answers and multi-step scenarios. There is no text chat. This is an independent project inspired by desktop voice control and is not affiliated with Luxify.

### Quick start

- Run **Jeffy-1.2.3-Windows.exe**. The portable executable does not require Node.js.
- Closing the window minimizes Jeffy to the tray. Choose **Quit** from the tray menu to exit completely.
- To run from source, install Node.js 22+ and use:

```powershell
npm.cmd ci
npm.cmd start
```

You can also use `START-JEFFY.cmd`. For browser mode, run `START-BROWSER.cmd` and open `http://127.0.0.1:47831`. The tray and global keyboard shortcut are available in the Windows application.

### Interface language

Select **Russian** or **English** in the top-right language selector. The choice applies immediately and survives a restart. Navigation, settings, the command editor, hints and application messages are translated. Interface language is independent of speech recognition and AI answer language.

Your command names, voice phrases and scenario text are preserved without translation or rewriting. Built-in command names are displayed in the selected language; their saved commands and phrases stay intact. Built-in phrase examples remain in Russian to match the command library. You can create English phrases when using cloud recognition.

### Recognition, answers and voice

Add your own provider keys in **Connections**. Select **Remember on this PC** to retain a key after exiting.

In **Settings**, choose each component separately:

- Recognition: **Groq Whisper**, **Gemini**, **Vosk** or **Windows**.
- Recognition language: **Automatic**, **Russian** or **English**.
- AI answer language: **Match the question**, **Always Russian** or **Always English**.
- Voice service and voice: **Gemini**, **Groq Orpheus** or **Windows**.

For Russian and English conversations, select cloud recognition, **Automatic** recognition language and **Match the question** for AI answers. You can recognize speech with Groq, get answers from Groq and synthesize speech with Gemini. Each cloud provider you use needs its own key.

**Gemini** has 30 selectable voices in the app and a separate TTS model selector. **Groq Orpheus** has 6 voices; Russian text is allowed experimentally and may have an accent or distorted pronunciation. **Windows** uses compatible installed SAPI voices locally.

Enter your own preview text, click **Preview this voice**, then **Save settings** to apply the choice. Previewing does not save changes. Volume works with both cloud services. Gemini receives pitch and pace preferences; Groq keeps its original pitch and speed, so those two controls are disabled.

For local AI answers, install **Ollama**, download a model such as `ollama pull qwen3:4b` and select it in Settings. OpenRouter is also available for AI answers; select separate supported services for speech recognition and voice output.

### Offline mode

Install Python 3.10+ with PATH integration and run `INSTALL-OFFLINE.cmd`. The installer creates a dedicated Vosk environment and downloads a Russian model. Restart Jeffy and select Vosk for recognition. Select Windows for fully local speech output.

The installed Vosk model and detected Windows offline recognizer are intended for Russian. Use Groq Whisper or Gemini for English recognition. Keep the `offline` directory next to the portable EXE. Set up the offline environment again on another PC: copying a Python virtual environment alone may not work.

### Commands and scenarios

Start the microphone with its button or `Ctrl+Shift+Space`. Recording ends manually, after a pause or at its duration limit. Matching handles small recognition errors and polite wording. Negation and opposing actions are not automatically corrected; ambiguous phrases require clarification.

There are 17 bundled commands. Add your own **EXE/LNK**, HTTP/HTTPS website, keyboard shortcut, pause, spoken text, current time or PC lock action. Scenarios support up to 20 ordered actions. Locking requires confirmation. Execution stops when an action fails. Phrase preview finds a match without executing actions; the ▶ button runs a real command.

Commands can be imported and exported as JSON. Exports exclude keys and history; review personal paths and URLs before publishing. Add English voice phrases to your own commands if needed.

### Data and cloud access

Settings, commands and history are stored in `data/`. The portable EXE uses the `data` folder beside it; a regular packaged launch uses Electron's user data directory. Up to 100 history entries stay local. Microphone recordings are not saved to disk.

Keys stay in memory by default until exit. Remembered keys use Windows DPAPI encryption for the current Windows account. Never publish `data/` or `keys.dpapi.json`. Cloud recognition receives the submitted recording; the AI receives the question and session context; the speech service receives reply text. Availability and free quotas depend on your account, model and region. [Provider links and limitations](docs/FREE-API.md) (Russian).

### Checks, packaging and releases

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run dist
```

Packaging produces `dist/Jeffy-1.2.3-Windows.exe`. Keep source code in the GitHub project and attach the EXE to **GitHub Releases**. Runtime data, offline models, dependencies, build output, EXEs and local `.env` files are excluded from Git. The app includes no telemetry or Windows startup configuration.

Provider unit tests use simulated responses and do not prove that a real account can access a cloud model. Test your connection and voice preview inside the app. Motion respects the system reduced-motion preference; 120 FPS is not a guaranteed result.

Source code is MIT-licensed. Dependencies and the speech model have their own licenses: [THIRD-PARTY.md](THIRD-PARTY.md).
