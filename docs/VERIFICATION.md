# Verification — 13 October 2026

## Version 1.1 fixes

- 22 tests pass, including custom EXE/LNK paths, custom key combinations, Telegram spelling variants, small speech errors, polite wording, negations, competing matches and migration from unavailable Russian Windows recognition to installed Vosk.
- The user's Telegram installation was discovered as a Microsoft Store application. The active session executed `открой телеграмм` as a command; a Telegram window subsequently appeared in the Windows window inventory.
- On this computer Vosk is installed, but Russian Windows recognition is not. The selected engine was corrected to Vosk while the saved Groq key stayed connected.
- After internet connectivity was restored, the actual active Groq connection returned HTTP 200 and `готов` for a short test request. The API key was neither printed nor copied to public source.
- A custom absolute path `C:\Windows\System32\notepad.exe` passed validation and the real Windows launch operation returned successfully. This is launch-operation evidence; opening the target app's document surface was not verified.
- The editor includes the native EXE/LNK picker and keyboard recording, while predefined apps and media controls remain available as conveniences. Custom hotkeys can target the last active external window, or the newly launched application within a scenario.
- Automated tests validate hotkey parsing and execution payloads. Physical hotkey delivery and the native file-picker dialog were not completed in UI verification while the user was actively using the desktop.

## Completed

- Electron 44.7.0 launched a real `Jeffy Assistant` window on Windows. Main voice screen and settings were visually inspected.
- 11 automated tests passed on the Windows host: exact phrase matching (including Vosk's `джефи` spelling), disabled commands, action validation, duplicate detection, category preservation, provider request formats, quota errors, authenticated API, persistence, Origin protection and single-use confirmation.
- `npm run check` passed.
- Native Windows speech capabilities were read: Microsoft Irina Desktop (`ru-RU`) is installed. Russian Windows System.Speech recognition is not installed; only `en-US` is present.
- Windows SAPI produced actual WAV audio, not mocked data.
- Vosk 0.3.45 and `vosk-model-small-ru-0.22` were installed in the personal project's `offline` directory. The model archive was obtained from the Rhasspy mirror after the official server stalled. Its SHA256 matched `961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4`.
- Real offline recognition matched three Windows-generated phrases: `который час` → `time`, `открой блокнот` → `notepad`, `джеффи который час` → `time` (recognized as `джефи который час`).
- Complete backend voice flow passed: real WAV → Vosk → phrase API → time command → actual response WAV. The response was `Сейчас 20:17.`, and response audio was 164932 bytes. One command-history record was created in a disposable test directory.
- Windows DPAPI encrypted and decrypted a synthetic value successfully. No real API key was used in this test.
- Windows portable EXE was built with electron-builder. Script files required by PowerShell/Python are unpacked outside ASAR.
- Packaged runtime verification passed using the actual built Electron executable in Node mode: packaged HTML loaded, Windows voice helper ran from `app.asar.unpacked`, Vosk recognized `джефи который час`, the command returned `Сейчас 20:24.`, and generated response WAV was 179040 bytes. The portable wrapper was built; its graphical first-run flow was not separately tested.

## Limits of this verification

- No user's microphone recording was transmitted to a cloud provider. Human microphone accuracy and cloud account access still require a live user test.
- Groq, Gemini and OpenRouter requests were verified using mock responses. A successful response with a user's key has not been verified.
- Ollama's local API was not running on the host at the time of checking. Local model inference was not tested.
- A command reporting completion means the Windows operation returned successfully; it does not prove that every third-party app's internal action completed. Application installation paths and support for media keys can vary.
- Blocking the workstation was tested with a mocked Windows action so the user's desktop was not locked.

To repeat native backend verification, install offline speech and run `node scripts/verify_windows.mjs`. This synthesizes local test speech in memory; it does not read the microphone, open websites, launch applications or lock the workstation.

After `npm run dist`, repeat packaged runtime verification with `node scripts/run_packaged_smoke.mjs`.
