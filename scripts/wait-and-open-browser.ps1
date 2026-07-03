param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$MaxAttempts = 45,
    [int]$DelayMs = 800
)

for ($i = 0; $i -lt $MaxAttempts; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1
        if ($response.StatusCode -ge 200) {
            Start-Process $Url
            exit 0
        }
    } catch {
        # Server not ready yet
    }
    Start-Sleep -Milliseconds $DelayMs
}

Start-Process $Url
exit 0
