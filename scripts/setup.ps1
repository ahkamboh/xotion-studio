# One-time Windows setup for the Xotion engine. Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
# or: npm run setup
$ErrorActionPreference = "Stop"
Write-Host "== xotion-studio setup (Windows) =="

function Assert-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "!! $name required. $hint"
    exit 1
  }
}

Assert-Command "node" "Install Node.js 22+ from https://nodejs.org"
$nodeMajor = [int]((node -v).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
  Write-Host "!! Node >= 22 required (found $(node -v))"
  exit 1
}
Assert-Command "ffmpeg" "winget install Gyan.FFmpeg   or   choco install ffmpeg"
Write-Host "ok: node $(node -v), ffmpeg present"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$bin = Join-Path $Root "scripts\bin"
$env:Path = "$bin;$env:Path"

Write-Host "-- installing HyperFrames (local, from package-lock.json) --"
if (Test-Path "package-lock.json") {
  try { npm ci } catch { npm install }
} else {
  npm install
}
Write-Host "ok: hyperframes installed locally"

Write-Host "-- fetching render browser (one-time) --"
$hf = Join-Path $Root "node_modules\.bin\hyperframes.cmd"
if (Test-Path $hf) {
  & $hf browser 2>$null
  if ($LASTEXITCODE -ne 0) { & $hf doctor 2>$null }
} else {
  Write-Host "  (browser will auto-download on first render)"
}

Write-Host "-- installing python deps (whisper, soundfile) --"
$pyExe = $null
$pyArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) { $pyExe = "py"; $pyArgs = @("-3") }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $pyExe = "python" }
if ($pyExe) {
  & $pyExe @pyArgs -m pip install --user openai-whisper soundfile
} else {
  Write-Host "  (python not found — install Python 3.11+ from https://python.org and re-run)"
}

Write-Host "-- installing bundled Whisper model --"
$src = Join-Path $Root "models\small.pt"
$cache = Join-Path $HOME ".cache\whisper"
$expected = "9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794"
New-Item -ItemType Directory -Force -Path $cache | Out-Null
if ((Test-Path $src) -and ((Get-Item $src).Length -gt 100000000)) {
  $sha = (Get-FileHash -Algorithm SHA256 $src).Hash.ToLower()
  if ($sha -eq $expected) {
    Copy-Item -Force $src (Join-Path $cache "small.pt")
    Write-Host "ok: Whisper small model installed from repo -> $cache\small.pt"
  } else {
    Write-Host "!! models\small.pt SHA mismatch — run 'git lfs pull' then re-run setup."
  }
} else {
  Write-Host "!! models\small.pt missing or is an LFS pointer."
  Write-Host "   Run: git lfs install; git lfs pull   then re-run scripts\setup.ps1"
}

Write-Host ""
Write-Host "== done =="
Write-Host "Next: node scripts\doctor.js"
Write-Host "Or open the Windows desktop app in desktop\ (npm start)."
Write-Host "Add this folder to PATH for python3 shims: $bin"
