# Creates "Open Higgsfield AI.lnk" on the Windows desktop.
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LauncherVbs = Join-Path $ProjectRoot 'launch-higgsfield.vbs'
$AssetsDir = Join-Path $ProjectRoot 'assets'
$IconPath = Join-Path $AssetsDir 'app-icon.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'Open Higgsfield AI.lnk'

if (-not (Test-Path $LauncherVbs)) {
    Write-Error "Launcher not found: $LauncherVbs"
}

if (-not (Test-Path $AssetsDir)) {
    New-Item -ItemType Directory -Path $AssetsDir | Out-Null
}

if (-not (Test-Path $IconPath)) {
    Add-Type -AssemblyName System.Drawing
    $size = 256
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 13, 13, 13))

    $white = [System.Drawing.Brushes]::White
    $pointsTop = @(
        [System.Drawing.Point]::new(128, 48),
        [System.Drawing.Point]::new(72, 88),
        [System.Drawing.Point]::new(128, 128),
        [System.Drawing.Point]::new(184, 88)
    )
    $g.FillPolygon($white, $pointsTop)

    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 14
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 72, 168, 128, 198)
    $g.DrawLine($pen, 128, 198, 184, 168)
    $g.DrawLine($pen, 72, 138, 128, 168)
    $g.DrawLine($pen, 128, 168, 184, 138)

    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = [System.IO.File]::OpenWrite($IconPath)
    $icon.Save($fs)
    $fs.Close()
    $g.Dispose()
    $bmp.Dispose()
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = 'wscript.exe'
$shortcut.Arguments = "`"$LauncherVbs`""
$shortcut.WorkingDirectory = $ProjectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Launch Open Higgsfield AI (local dev server + browser)'
$shortcut.IconLocation = "$IconPath,0"
$shortcut.Save()

Write-Host ""
Write-Host "  Desktop shortcut created:" -ForegroundColor Green
Write-Host "  $ShortcutPath"
Write-Host ""
Write-Host "  Double-click to launch. Browser opens when the server is ready."
Write-Host "  Server runs minimized in the taskbar. Close that window to stop."
Write-Host ""
