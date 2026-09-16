param([switch]$Production)
$ErrorActionPreference = 'Stop'
$vfRoot = Split-Path -Parent $PSScriptRoot
$vfRuntime = Join-Path $vfRoot '.runtime'
New-Item -ItemType Directory -Force $vfRuntime | Out-Null
$vfNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$vfNode = if ($vfNodeCommand) { $vfNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $vfNode)) { throw 'Install Node.js 22 or later.' }
$vfNext = Join-Path $vfRoot 'frontend\node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $vfNext)) { throw 'Install frontend dependencies as described in README.md first.' }
if ($Production -and -not (Test-Path -LiteralPath (Join-Path $vfRoot 'frontend\.next\BUILD_ID'))) { throw 'Run pnpm build from frontend before starting production mode.' }
foreach ($vfPort in @(3000)) {
    $vfClient = [System.Net.Sockets.TcpClient]::new()
    try {
        $vfAttempt = $vfClient.ConnectAsync('127.0.0.1', $vfPort)
        try { $null = $vfAttempt.Wait(1000) } catch {}
        if ($vfClient.Connected) { throw "Port $vfPort is already in use. Stop the existing service before starting VeriForge." }
    } finally { $vfClient.Dispose() }
}
function Wait-VeriForgeServer([string]$Url, [string]$Name) {
    $vfTimer = [System.Diagnostics.Stopwatch]::StartNew()
    while ($vfTimer.Elapsed.TotalSeconds -lt 30) {
        try {
            $vfResponse = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($vfResponse.StatusCode -eq 200) { return }
        } catch {}
        Start-Sleep -Milliseconds 250
    }
    throw "$Name did not become ready. Inspect its error log in .runtime."
}
try {
    $vfMode = if ($Production) { 'start' } else { 'dev' }
    $vfFrontend = Start-Process -FilePath $vfNode -ArgumentList @(('"' + $vfNext + '"'),$vfMode,'--hostname','127.0.0.1') -WorkingDirectory (Join-Path $vfRoot 'frontend') -RedirectStandardOutput (Join-Path $vfRuntime 'frontend.log') -RedirectStandardError (Join-Path $vfRuntime 'frontend-error.log') -WindowStyle Hidden -PassThru
    $vfFrontend.Id | Set-Content -LiteralPath (Join-Path $vfRuntime 'frontend.pid')
    Wait-VeriForgeServer 'http://127.0.0.1:3000/dashboard' 'Frontend'
} catch {
    & (Join-Path $PSScriptRoot 'stop-local.ps1')
    throw
}
Write-Output 'VeriForge is ready at http://127.0.0.1:3000. No login or backend required.'

