# detect-host.ps1 — Windows counterpart of detect-host.sh (v0.5.0)
#
# Output format: one `key=value` line per detected fact, on stdout.
# Output contract identical to detect-host.sh — see that file's header for
# the full key list. Exits 0 unconditionally.
#
# v0.5.0 dropped Auggie support; auggie_* keys are no longer emitted.
#
# Tested against Windows PowerShell 5.1 (powershell.exe).

$ErrorActionPreference = 'SilentlyContinue'

function Emit($key, $value) { Write-Output ("{0}={1}" -f $key, $value) }

function Has-Command($name) {
    if (Get-Command $name -ErrorAction SilentlyContinue) { return 1 } else { return 0 }
}

# --- CLI installed ----------------------------------------------------------
Emit 'claude_installed' (Has-Command 'claude')
Emit 'codex_installed'  (Has-Command 'codex')

# --- Auth / configuration ---------------------------------------------------
$codexAuthed = if ([string]::IsNullOrEmpty($env:CODEX_API_KEY)) { 0 } else { 1 }
$codexConfig = if (Test-Path "$env:USERPROFILE\.codex\config.toml") { 1 } else { 0 }
Emit 'codex_authed'     $codexAuthed
Emit 'codex_configured' $codexConfig

# --- Parent process name (host inference heuristic) -------------------------
$parentProc = 'unknown'
try {
    $ppid = (Get-WmiObject Win32_Process -Filter "ProcessId=$PID" -ErrorAction SilentlyContinue).ParentProcessId
    if ($ppid) {
        $parent = Get-Process -Id $ppid -ErrorAction SilentlyContinue
        if ($parent) {
            $parentProc = $parent.ProcessName
        }
    }
} catch {}
Emit 'parent_proc' $parentProc

# --- Running host -----------------------------------------------------------
$runningHost = 'unknown'
if (-not [string]::IsNullOrEmpty($env:CLAUDE_PLUGIN_ROOT)) {
    $runningHost = 'claude-code'
} else {
    if ($parentProc -match 'codex')  { $runningHost = 'codex' }
    elseif ($parentProc -match 'claude') { $runningHost = 'claude-code' }
}
Emit 'running_host' $runningHost

$pluginRoot = if ([string]::IsNullOrEmpty($env:CLAUDE_PLUGIN_ROOT)) { '' } else { $env:CLAUDE_PLUGIN_ROOT }
Emit 'plugin_root' $pluginRoot

# --- OS classification ------------------------------------------------------
Emit 'os' 'win'

exit 0
