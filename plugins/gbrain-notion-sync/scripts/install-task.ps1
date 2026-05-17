#requires -Version 5.1
<#
.SYNOPSIS
  Install, uninstall, or check the gbrain-notion-sync Windows Scheduled Task.

.DESCRIPTION
  Registers a Scheduled Task named "gbrain-notion-sync" that runs the
  notion-sync pull script on a fixed interval. The task runs as the current
  user with limited privileges (no admin rights required for the task itself,
  but Register-ScheduledTask in the user's task folder works without elevation).

.PARAMETER Interval
  How often to run the sync. Accepts "Nm" (minutes) or "Nh" (hours).
  Default: 15m. Examples: 5m, 30m, 1h, 2h.

.PARAMETER Uninstall
  Remove the existing task instead of installing.

.PARAMETER Status
  Show the task's next run time, last run time, and last result code.

.PARAMETER Force
  Overwrite an existing task on install.

.EXAMPLE
  .\install-task.ps1 -Interval 15m
  .\install-task.ps1 -Status
  .\install-task.ps1 -Uninstall
#>

[CmdletBinding(DefaultParameterSetName = 'Install')]
param(
    [Parameter(ParameterSetName = 'Install')]
    [string]$Interval = '15m',

    [Parameter(ParameterSetName = 'Install')]
    [switch]$Force,

    [Parameter(ParameterSetName = 'Uninstall', Mandatory)]
    [switch]$Uninstall,

    [Parameter(ParameterSetName = 'Status', Mandatory)]
    [switch]$Status
)

$ErrorActionPreference = 'Stop'
$TaskName = 'gbrain-notion-sync'

function Resolve-PluginRoot {
    if ($env:CLAUDE_PLUGIN_ROOT) { return (Resolve-Path $env:CLAUDE_PLUGIN_ROOT).Path }
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Parse-Interval {
    param([string]$Value)
    if ($Value -match '^(\d+)m$') { return New-TimeSpan -Minutes ([int]$Matches[1]) }
    if ($Value -match '^(\d+)h$') { return New-TimeSpan -Hours ([int]$Matches[1]) }
    throw "Invalid -Interval '$Value'. Use forms like '15m', '30m', '1h', '2h'."
}

function Test-BunInPath {
    $bun = Get-Command bun -ErrorAction SilentlyContinue
    if (-not $bun) {
        throw "bun is not in PATH. Install bun first: https://bun.sh/. The Scheduled Task will fail without it."
    }
    return $bun.Source
}

function Show-Status {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Output "Task '$TaskName' is not installed."
        return
    }
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Output "Task name      : $TaskName"
    Write-Output "State          : $($task.State)"
    Write-Output "Next run time  : $($info.NextRunTime)"
    Write-Output "Last run time  : $($info.LastRunTime)"
    Write-Output "Last result    : $($info.LastTaskResult) (0 = success)"
    Write-Output ""
    Write-Output "Manual trigger : schtasks /Run /TN $TaskName"
    Write-Output "Uninstall      : .\install-task.ps1 -Uninstall"
}

function Uninstall-Task {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Output "Task '$TaskName' is not installed. Nothing to remove."
        return
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Output "Removed Scheduled Task '$TaskName'."
}

function Install-Task {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing -and -not $Force) {
        throw "Task '$TaskName' already exists. Use -Force to overwrite, or -Uninstall first."
    }

    $pluginRoot = Resolve-PluginRoot
    if (-not (Test-Path (Join-Path $pluginRoot 'package.json'))) {
        throw "Could not find package.json at '$pluginRoot'. Set CLAUDE_PLUGIN_ROOT or run from inside the plugin's scripts/ directory."
    }
    Test-BunInPath | Out-Null

    $intervalSpan = Parse-Interval $Interval

    $action = New-ScheduledTaskAction `
        -Execute 'cmd.exe' `
        -Argument "/c `"cd /d `"$pluginRoot`" && bun run sync`"" `
        -WorkingDirectory $pluginRoot

    $trigger = New-ScheduledTaskTrigger `
        -Once `
        -At (Get-Date).AddMinutes(1) `
        -RepetitionInterval $intervalSpan

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
        -MultipleInstances IgnoreNew

    $principal = New-ScheduledTaskPrincipal `
        -UserId $env:USERNAME `
        -LogonType Interactive `
        -RunLevel Limited

    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Sync Notion PAI to gbrain every $Interval. Managed by gbrain-notion-sync plugin." | Out-Null

    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Output "Installed Scheduled Task '$TaskName'."
    Write-Output "  Interval     : $Interval"
    Write-Output "  Plugin root  : $pluginRoot"
    Write-Output "  Next run     : $($info.NextRunTime)"
    Write-Output ""
    Write-Output "Manual trigger : schtasks /Run /TN $TaskName"
    Write-Output "Check status   : .\install-task.ps1 -Status"
    Write-Output "Uninstall      : .\install-task.ps1 -Uninstall"
}

try {
    switch ($PSCmdlet.ParameterSetName) {
        'Status'    { Show-Status }
        'Uninstall' { Uninstall-Task }
        'Install'   { Install-Task }
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
