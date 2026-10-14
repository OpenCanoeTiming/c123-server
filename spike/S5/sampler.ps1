# S5 — CPU/memory sampler for the S1 process (BRIEFS S5 step 3).
#
# No extra tooling: built-in PowerShell only (Get-Process), Windows 10/11. Takes one snapshot per
# invocation so the runbook can call it at start, after one hour of 10x replay, and at the end, or
# loop it for a continuous CSV trail across the hour.
#
# Usage (one snapshot, printed to the console — copy the line into S5-RESULTS.md):
#   powershell -File sampler.ps1 -ProcessId <PID>
#
# Usage (continuous CSV, Ctrl+C to stop — run in its own window for the full hour):
#   powershell -File sampler.ps1 -ProcessId <PID> -Loop -IntervalSeconds 60 -Csv sampler.csv

param(
  [Parameter(Mandatory = $true)][int]$ProcessId,
  [switch]$Loop,
  [int]$IntervalSeconds = 60,
  [string]$Csv = $null
)

function Get-Sample {
  param([int]$Id)
  $p = Get-Process -Id $Id -ErrorAction SilentlyContinue
  if (-not $p) {
    return [PSCustomObject]@{ Time = (Get-Date -Format o); ProcessId = $Id; Found = $false }
  }
  [PSCustomObject]@{
    Time         = (Get-Date -Format o)
    ProcessId    = $Id
    Found        = $true
    CpuSeconds   = [math]::Round($p.CPU, 1)                               # total CPU time since process start (s)
    WorkingSetMB = [math]::Round($p.WorkingSet64 / 1MB, 1)                # resident memory
    PrivateMB    = [math]::Round($p.PrivateMemorySize64 / 1MB, 1)
    Threads      = $p.Threads.Count
  }
}

if ($Loop) {
  while ($true) {
    $s = Get-Sample -Id $ProcessId
    $s | Format-Table -HideTableHeaders | Out-String | Write-Host
    if ($Csv) { $s | Export-Csv -Path $Csv -Append -NoTypeInformation }
    Start-Sleep -Seconds $IntervalSeconds
  }
} else {
  $s = Get-Sample -Id $ProcessId
  $s | Format-List
  if ($Csv) { $s | Export-Csv -Path $Csv -Append -NoTypeInformation }
}
