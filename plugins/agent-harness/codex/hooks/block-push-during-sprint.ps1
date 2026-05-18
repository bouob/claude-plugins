$inputJson = [Console]::In.ReadToEnd()

try {
  $payload = $inputJson | ConvertFrom-Json
} catch {
  exit 0
}

$command = ""
if ($payload.tool_input -and $payload.tool_input.command) {
  $command = [string]$payload.tool_input.command
}

if ($command -notmatch '(^|\s)git\s+push(\s|$)') {
  exit 0
}

$sprintDir = Join-Path (Get-Location) ".sprint"
if (-not (Test-Path -LiteralPath $sprintDir)) {
  exit 0
}

$running = Get-ChildItem -LiteralPath $sprintDir -Filter "sprint-meta.json" -Recurse -ErrorAction SilentlyContinue |
  Where-Object {
    try {
      $meta = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
      $meta.status -eq "running"
    } catch {
      $false
    }
  } |
  Select-Object -First 1

if ($running) {
  $result = @{
    hookSpecificOutput = @{
      hookEventName = "PreToolUse"
      permissionDecision = "deny"
      permissionDecisionReason = "Sprint in progress. Complete the sprint evaluation before pushing."
    }
  }

  $result | ConvertTo-Json -Depth 5 -Compress
}
