$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
  $encoded = [Console]::In.ReadToEnd().Trim()
  $inputData = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded)) | ConvertFrom-Json
  $result = @{ ok = $true }
  if ($inputData.op -in @('foreground','shortcut')) {
    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class JeffyWindow { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid); [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'
  }
  switch ($inputData.op) {
    'foreground' {
      $handle = [JeffyWindow]::GetForegroundWindow()
      $foregroundProcessId = [uint32]0
      [void][JeffyWindow]::GetWindowThreadProcessId($handle,[ref]$foregroundProcessId)
      $processName = (Get-Process -Id $foregroundProcessId -ErrorAction SilentlyContinue).ProcessName
      $result = @{ handle=$handle.ToInt64().ToString(); process=$processName }
    }
    'capabilities' {
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $voices = @($synth.GetInstalledVoices() | ForEach-Object { @{ name=$_.VoiceInfo.Name; culture=$_.VoiceInfo.Culture.Name } })
      $recognizers = @([System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | ForEach-Object { @{ id=$_.Id; culture=$_.Culture.Name } })
      $synth.Dispose()
      $result = @{ voices=$voices; recognizers=$recognizers }
    }
    'protect' {
      Add-Type -AssemblyName System.Security
      $bytes = [Text.Encoding]::UTF8.GetBytes([string]$inputData.value)
      $result = @{ value=[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)) }
    }
    'unprotect' {
      Add-Type -AssemblyName System.Security
      $bytes = [Convert]::FromBase64String([string]$inputData.value)
      $result = @{ value=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)) }
    }
    'app' {
      $customPath = [string]$inputData.value
      if ($customPath -match '^[A-Za-z]:\\' -and [IO.Path]::GetExtension($customPath).ToLowerInvariant() -in @('.exe','.lnk')) {
        if (!(Test-Path -LiteralPath $customPath -PathType Leaf)) { throw 'Выбранное приложение или ярлык не найдено. Проверьте путь в команде.' }
        Start-Process -FilePath $customPath
        break
      }
      switch ($inputData.value) {
        'notepad' { Start-Process notepad.exe }
        'calculator' { Start-Process calc.exe }
        'explorer' { Start-Process explorer.exe }
        'telegram' {
          $appPath = Join-Path $env:APPDATA 'Telegram Desktop\Telegram.exe'
          if (!(Test-Path -LiteralPath $appPath)) { $appPath = Join-Path $env:LOCALAPPDATA 'Telegram Desktop\Telegram.exe' }
          if (Test-Path -LiteralPath $appPath) { Start-Process -FilePath $appPath }
          else {
            $storeApp = Get-StartApps | Where-Object { $_.AppID -like 'TelegramMessengerLLP.TelegramDesktop_*!*' } | Select-Object -First 1
            if (!$storeApp) { throw 'Telegram не найден. Выберите его EXE или ярлык в редакторе команды.' }
            Start-Process explorer.exe -ArgumentList ('shell:AppsFolder\' + $storeApp.AppID)
          }
        }
        'discord' {
          $appPath = Join-Path $env:LOCALAPPDATA 'Discord\Update.exe'
          if (!(Test-Path -LiteralPath $appPath)) { throw 'Discord не найден.' }
          Start-Process -FilePath $appPath -ArgumentList '--processStart Discord.exe'
        }
        'steam' {
          $appPath = (Get-ItemProperty -LiteralPath 'HKCU:\Software\Valve\Steam' -ErrorAction SilentlyContinue).SteamExe
          if (!$appPath -or !(Test-Path -LiteralPath $appPath)) { throw 'Steam не найден.' }
          Start-Process -FilePath $appPath
        }
        'vscode' {
          $appPath = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'
          if (!(Test-Path -LiteralPath $appPath)) { $appPath = Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe' }
          if (!(Test-Path -LiteralPath $appPath)) { throw 'VS Code не найден.' }
          Start-Process -FilePath $appPath
        }
        default { throw 'Неизвестное приложение.' }
      }
    }
    'url' {
      $uri = [uri][string]$inputData.value
      if ($uri.Scheme -notin @('http','https') -or $uri.UserInfo) { throw 'Недопустимый адрес.' }
      Start-Process -FilePath $uri.AbsoluteUri
    }
    'shortcut' {
      if ($inputData.value -eq 'desktop') { (New-Object -ComObject Shell.Application).ToggleDesktop() }
      else {
        $keys = @{ playpause=179; next=176; previous=177; louder=175; quieter=174; mute=173 }
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class JeffyKeys { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo); }'
        if ($keys.ContainsKey([string]$inputData.value)) { $sequence = @([byte]$keys[[string]$inputData.value]) }
        else {
          $keyMap = @{ CTRL=17; CONTROL=17; ALT=18; SHIFT=16; WIN=91; ESC=27; ENTER=13; TAB=9; SPACE=32; BACKSPACE=8; DELETE=46; INSERT=45; HOME=36; END=35; PAGEUP=33; PAGEDOWN=34; UP=38; DOWN=40; LEFT=37; RIGHT=39; PRINTSCREEN=44; PAUSE=19; CAPSLOCK=20; PLUS=187; MINUS=189; COMMA=188; PERIOD=190; SLASH=191; SEMICOLON=186; QUOTE=222; BACKQUOTE=192; BRACKETLEFT=219; BRACKETRIGHT=221; BACKSLASH=220 }
          $sequence = @()
          $tokens = ([string]$inputData.value).ToUpperInvariant().Split('+')
          if ($tokens.Count -gt 5) { throw 'Слишком длинное сочетание клавиш.' }
          foreach ($token in $tokens) {
            $token = $token.Trim()
            if ($keyMap.ContainsKey($token)) { $sequence += [byte]$keyMap[$token] }
            elseif ($token -match '^[A-Z0-9]$') { $sequence += [byte][char]$token }
            elseif ($token -match '^F([1-9]|1[0-9]|2[0-4])$') { $sequence += [byte](111 + [int]$Matches[1]) }
            else { throw 'Неизвестная клавиша в сочетании.' }
          }
          if ($inputData.target -and [string]$inputData.target -match '^\d+$') {
            $targetHandle = [IntPtr][long]$inputData.target
            if (![JeffyWindow]::IsWindow($targetHandle)) { throw 'Окно для сочетания клавиш закрыто. Выберите нужное окно и снова вызовите Джеффи.' }
            if (![JeffyWindow]::SetForegroundWindow($targetHandle)) { throw 'Windows не разрешила переключиться на нужное окно. Активируйте его вручную и повторите команду.' }
          }
        }
        $pressed = @()
        try { foreach ($key in $sequence) { [JeffyKeys]::keybd_event($key,0,0,[UIntPtr]::Zero); $pressed += $key } }
        finally { [array]::Reverse($pressed); foreach ($key in $pressed) { [JeffyKeys]::keybd_event($key,0,2,[UIntPtr]::Zero) } }
      }
    }
    'lock' { rundll32.exe user32.dll,LockWorkStation }
    'speak' {
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $voice = [string]$inputData.voice
      if ($voice) { $synth.SelectVoice($voice) }
      else {
        $ruVoice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'ru*' } | Select-Object -First 1
        if ($ruVoice) { $synth.SelectVoice($ruVoice.VoiceInfo.Name) }
      }
      $synth.Rate = [Math]::Max(-5,[Math]::Min(5,[int]$inputData.rate))
      $stream = New-Object IO.MemoryStream
      $synth.SetOutputToWaveStream($stream)
      $synth.Speak([string]$inputData.text)
      $result = @{ audio=[Convert]::ToBase64String($stream.ToArray()) }
      $synth.Dispose(); $stream.Dispose()
    }
    'play' {
      $stream = New-Object IO.MemoryStream(,[Convert]::FromBase64String([string]$inputData.audio))
      $player = New-Object System.Media.SoundPlayer($stream)
      $player.PlaySync()
      $player.Dispose(); $stream.Dispose()
    }
    'recognize' {
      Add-Type -AssemblyName System.Speech
      $info = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | Where-Object { $_.Culture.Name -eq 'ru-RU' } | Select-Object -First 1
      if (!$info) { throw 'Русский офлайн-распознаватель Windows не установлен. Выберите Groq или Gemini в настройках.' }
      $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine($info)
      $engine.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
      $stream = New-Object IO.MemoryStream(,[Convert]::FromBase64String([string]$inputData.audio))
      $engine.SetInputToWaveStream($stream)
      $recognized = $engine.Recognize([TimeSpan]::FromSeconds(15))
      $result = @{ text = $(if ($recognized) { $recognized.Text } else { '' }) }
      $engine.Dispose(); $stream.Dispose()
    }
    default { throw 'Неизвестная операция.' }
  }
  $result | ConvertTo-Json -Depth 6 -Compress
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
