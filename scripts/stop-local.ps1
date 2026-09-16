$ErrorActionPreference = 'Stop'
$vfRoot = Split-Path -Parent $PSScriptRoot
$vfSnapshot = @(Get-CimInstance Win32_Process)
foreach ($vfName in @('backend','frontend')) {
    $vfPidFile = Join-Path $vfRoot ('.runtime\' + $vfName + '.pid')
    if (-not (Test-Path -LiteralPath $vfPidFile)) { continue }
    $vfPid = [int](Get-Content -LiteralPath $vfPidFile)
    $vfParent = $vfSnapshot | Where-Object { $_.ProcessId -eq $vfPid }
    $vfCommand = $vfParent.CommandLine
    if (-not ($vfCommand -and $vfCommand.Contains($vfRoot) -and ($vfCommand -match 'uvicorn.+backend.main:app|next.+(dev|start)'))) { continue }
    # A verified checkout-owned parent establishes ownership of its process tree.
    $vfIds = [System.Collections.Generic.List[int]]::new()
    $vfIds.Add($vfPid)
    for ($vfIndex = 0; $vfIndex -lt $vfIds.Count; $vfIndex++) {
        foreach ($vfChild in $vfSnapshot | Where-Object { $_.ParentProcessId -eq $vfIds[$vfIndex] }) {
            if (-not $vfIds.Contains([int]$vfChild.ProcessId)) { $vfIds.Add([int]$vfChild.ProcessId) }
        }
    }
    foreach ($vfId in $vfIds) {
        $vfCurrent = Get-CimInstance Win32_Process -Filter "ProcessId = $vfId"
        $vfOriginal = $vfSnapshot | Where-Object { $_.ProcessId -eq $vfId }
        if ($vfCurrent -and $vfCurrent.CreationDate -eq $vfOriginal.CreationDate) {
            Stop-Process -Id $vfId -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $vfPidFile
}
Write-Output 'Stopped matching VeriForge processes from this checkout.'

