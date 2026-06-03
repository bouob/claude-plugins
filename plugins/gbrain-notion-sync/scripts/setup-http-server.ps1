# setup-http-server.ps1
# Sets up gbrain serve --http as the sole PGLite owner, enabling lock-free sync.
#
# BEFORE running this script:
#   1. Close Claude Code (stops the stdio gbrain MCP server)
#   2. Run this script from the notion-sync directory
#
# AFTER running this script:
#   1. Reconfigure Claude Code MCP to use HTTP (see Step 5 below)
#   2. Restart Claude Code
#   3. Future `bun run sync` calls use HTTP and are lock-free

param(
    [int]$Port = 7432,
    # Token TTL in seconds. Default 365 days; adjust as needed.
    [int]$TokenTTL = 31536000,
    [string]$ClientName = "notion-sync"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== gbrain HTTP Server Setup ===" -ForegroundColor Cyan
Write-Host "Port: $Port | Token TTL: $TokenTTL seconds" -ForegroundColor Gray
Write-Host ""

# Step 1: Verify gbrain is installed
Write-Host "[1/5] Checking gbrain..."
try {
    $version = & gbrain version 2>&1 | Select-String -Pattern "[\d.]+" | Select-Object -First 1
    Write-Host "      gbrain found: $version" -ForegroundColor Green
} catch {
    Write-Host "ERROR: gbrain not found. Run: bun link (from C:\Users\victo\dev\gbrain)" -ForegroundColor Red
    exit 1
}

# Step 2: Start HTTP server in background (capture bootstrap token)
Write-Host "[2/5] Starting HTTP server on port $Port ..."
Write-Host "      (bootstrap token will appear in server output)" -ForegroundColor Gray
Write-Host ""

$serverJob = Start-Job -ScriptBlock {
    param($port, $ttl)
    & gbrain serve --http --port $port --token-ttl $ttl 2>&1
} -ArgumentList $Port, $TokenTTL

# Wait for server to start (watch for token or error)
$bootstrapToken = $null
$waited = 0
while (-not $bootstrapToken -and $waited -lt 30) {
    Start-Sleep -Seconds 1
    $waited++
    $output = Receive-Job -Job $serverJob -Keep 2>&1
    $tokenLine = $output | Where-Object { $_ -match "bootstrap token|Admin bootstrap" } | Select-Object -Last 1
    if ($tokenLine -match "[A-Za-z0-9_\-]{20,}") {
        $bootstrapToken = $Matches[0]
    }
}

if (-not $bootstrapToken) {
    Write-Host ""
    Write-Host "Server output so far:" -ForegroundColor Yellow
    Receive-Job -Job $serverJob -Keep | Write-Host
    Write-Host ""
    Write-Host "ERROR: Could not detect bootstrap token within 30s." -ForegroundColor Red
    Write-Host "Manually open http://localhost:$Port/admin to retrieve it." -ForegroundColor Yellow
    Write-Host "Then run: gbrain auth register-client $ClientName --grant-types client_credentials --scopes `"read write`"" -ForegroundColor Yellow
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}

Write-Host "[3/5] Server started. Bootstrap token: $bootstrapToken" -ForegroundColor Green
Write-Host "      Dashboard: http://localhost:$Port/admin" -ForegroundColor Gray

# Step 3: Register a client_credentials client via CLI
Write-Host "[4/5] Registering OAuth client '$ClientName'..."
try {
    $regOutput = & gbrain auth register-client $ClientName --grant-types client_credentials --scopes "read write" 2>&1
    Write-Host "      $regOutput" -ForegroundColor Gray
} catch {
    Write-Host "WARNING: Could not auto-register client. Register manually at http://localhost:$Port/admin" -ForegroundColor Yellow
}

# Step 4: Get an access token via client credentials
# The token is obtained by POSTing to the OAuth endpoint.
# For now, instruct user to get it from the admin dashboard.
Write-Host ""
Write-Host "[5/5] Manual steps required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  A. Open http://localhost:$Port/admin" -ForegroundColor White
Write-Host "     Paste bootstrap token: $bootstrapToken" -ForegroundColor White
Write-Host ""
Write-Host "  B. Click 'Register client' > name='$ClientName' > client_credentials > scopes: read+write" -ForegroundColor White
Write-Host "     Copy the client_id and client_secret shown once." -ForegroundColor White
Write-Host ""
Write-Host "  C. Get an access token:" -ForegroundColor White
Write-Host "     curl -s -X POST http://localhost:$Port/oauth/token \\" -ForegroundColor Cyan
Write-Host "       -d 'grant_type=client_credentials&client_id=CLIENT_ID&client_secret=CLIENT_SECRET'" -ForegroundColor Cyan
Write-Host "     Copy the 'access_token' from the response." -ForegroundColor White
Write-Host ""
Write-Host "  D. Add to notion-sync/.env:" -ForegroundColor White
Write-Host "     GBRAIN_HTTP_URL=http://localhost:$Port" -ForegroundColor Cyan
Write-Host "     GBRAIN_HTTP_TOKEN=<access_token from step C>" -ForegroundColor Cyan
Write-Host ""
Write-Host "  E. Reconfigure Claude Code MCP to use HTTP instead of stdio:" -ForegroundColor White
Write-Host "     claude mcp remove gbrain" -ForegroundColor Cyan
Write-Host "     claude mcp add gbrain -t http http://localhost:$Port/mcp -H `"Authorization: Bearer <access_token>`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "  F. Restart Claude Code. Future syncs will be lock-free." -ForegroundColor White
Write-Host ""
Write-Host "NOTE: To run gbrain HTTP server at startup, add to Task Scheduler:" -ForegroundColor Gray
Write-Host "  schtasks /Create /TN `"gbrain-http`" /TR `"gbrain serve --http --port $Port --token-ttl $TokenTTL`" /SC ONLOGON /RL HIGHEST" -ForegroundColor Gray
Write-Host ""

# Keep the server running
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Green
Wait-Job $serverJob
