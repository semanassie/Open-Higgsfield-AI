param(
    [Parameter(Mandatory = $true)]
    [int]$Port
)

try {
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect('127.0.0.1', $Port)
    $client.Close()
    exit 0
} catch {
    exit 1
}
