param(
  [ValidateSet('doctor', 'start', 'sessions', 'logs')]
  [string]$Mode = 'doctor',
  [string]$Serial
)

$ErrorActionPreference = 'Stop'

function Find-AndroidSdk {
  $candidates = @(@(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) })

  if (-not $candidates) {
    throw 'Android SDK not found. Install Android Studio or set ANDROID_HOME.'
  }
  return $candidates[0]
}

function Get-AuthorizedDevices([string]$Adb) {
  $lines = & $Adb devices
  Write-Output -NoEnumerate @($lines | Select-Object -Skip 1 | Where-Object { $_ -match "^([^\s]+)\s+device$" } | ForEach-Object {
    ($_ -split '\s+')[0]
  })
}

$androidSdk = Find-AndroidSdk
$adb = Join-Path $androidSdk 'platform-tools\adb.exe'
$dhu = Join-Path $androidSdk 'extras\google\auto\desktop-head-unit.exe'

if (-not (Test-Path -LiteralPath $adb)) { throw "ADB not found at $adb" }
if (-not (Test-Path -LiteralPath $dhu)) {
  throw "Android Auto DHU not found at $dhu. Install 'Android Auto Desktop Head Unit Emulator' from Android Studio's SDK Tools tab."
}

$devices = Get-AuthorizedDevices $adb
if ($Serial) {
  if ($Serial -notin $devices) {
    throw "Device '$Serial' is not connected and authorized. Connected devices: $($devices -join ', ')"
  }
  $deviceArgs = @('-s', $Serial)
} elseif ($devices.Count -eq 1) {
  $Serial = $devices[0]
  $deviceArgs = @('-s', $Serial)
} elseif ($devices.Count -eq 0) {
  $deviceArgs = @()
} else {
  throw "Multiple phones are connected. Run again with -Serial. Connected devices: $($devices -join ', ')"
}

if ($Mode -eq 'doctor') {
  Write-Host "Android SDK: $androidSdk"
  Write-Host "DHU:         $dhu"
  if ($devices.Count -eq 0) {
    Write-Host 'Phone:       none (connect an unlocked phone with USB debugging enabled)'
  } else {
    Write-Host "Phone:       $Serial"
  }
  Write-Host ''
  Write-Host 'Phone prerequisites:'
  Write-Host '  1. Update Android Auto and sign in to the Play Store.'
  Write-Host '  2. Enable Android Auto developer mode.'
  Write-Host '  3. Android Auto developer settings > Start head unit server.'
  Write-Host '  4. Keep the phone unlocked for the first DHU connection.'
  exit 0
}

if ($devices.Count -eq 0) {
  throw 'No authorized Android phone found. Connect the phone, unlock it, and accept the USB debugging prompt.'
}

switch ($Mode) {
  'start' {
    & $adb @deviceArgs forward tcp:5277 tcp:5277
    if ($LASTEXITCODE -ne 0) { throw 'ADB port forwarding failed.' }
    Write-Host "ADB tunnel ready for $Serial on tcp:5277."
    Write-Host 'Starting the Android Auto Desktop Head Unit...'
    $dhuDirectory = Split-Path -Parent $dhu
    $dhuConfig = Join-Path $dhuDirectory 'config\default_720p.ini'
    $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $dhu
    $processInfo.Arguments = "--config=`"$dhuConfig`""
    $processInfo.WorkingDirectory = $dhuDirectory
    $processInfo.UseShellExecute = $true
    $process = [System.Diagnostics.Process]::Start($processInfo)
    Write-Host "DHU process started (PID $($process.Id))."
    Write-Host 'On the phone, accept any first-run Android Auto prompts.'
  }
  'sessions' {
    & $adb @deviceArgs shell dumpsys media_session
  }
  'logs' {
    Write-Host 'Streaming Android Auto and ManaTunes-related logs. Press Ctrl+C to stop.'
    & $adb @deviceArgs logcat -v time AndroidAuto:V MediaBrowserServiceCompat:V MediaSessionService:V ReactNativeJS:V '*:S'
  }
}
