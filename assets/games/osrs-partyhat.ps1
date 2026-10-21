# The Old School RuneScape game's emoji (ADR-0004): a blue party hat as 32 x 32 pixel art in the style of the RuneLite
# plugins' emoji - a black outline, light from the top left - scaled 4x with hard pixel edges to osrs-partyhat.png
# (128 x 128). Picked by Andrew on 2026-10-21 ("i like the blue party hat") over a scimitar, a fire rune and coins.
#
#   powershell -ExecutionPolicy Bypass -File assets/games/osrs-partyhat.ps1
Add-Type -AssemblyName System.Drawing
$out = Split-Path -Parent $MyInvocation.MyCommand.Path
$N = 32
function C($r, $g, $b) { [System.Drawing.Color]::FromArgb(255, $r, $g, $b) }

$bmp = New-Object System.Drawing.Bitmap $N, $N
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.Clear([System.Drawing.Color]::Transparent)
function Fill($color, $points) {
    $brush = New-Object System.Drawing.SolidBrush $color
    $g.FillPolygon($brush, [System.Drawing.Point[]]($points | ForEach-Object { New-Object System.Drawing.Point $_[0], $_[1] }))
    $brush.Dispose()
}

# four paper points over a band, the band's rim darker, a light line where they meet, a glint at each tip
Fill (C 40 88 220) @(@(3,27), @(28,27), @(28,18), @(27,7), @(23,16), @(19,5), @(16,15), @(12,5), @(8,16), @(4,7), @(3,18))
Fill (C 28 62 168) @(@(3,23), @(28,23), @(28,27), @(3,27))
for ($x = 4; $x -le 27; $x++) { $bmp.SetPixel($x, 22, (C 98 146 250)) }
foreach ($apex in @(@(4,8), @(12,6), @(19,6), @(27,8))) { $bmp.SetPixel($apex[0], $apex[1] + 1, (C 150 185 255)) }

# light from the top left on the edges, then a 1 px black outline
$opaque = { param($x, $y) $x -ge 0 -and $y -ge 0 -and $x -lt $N -and $y -lt $N -and $bmp.GetPixel($x, $y).A -gt 0 }
$shade = @{}
for ($y = 0; $y -lt $N; $y++) { for ($x = 0; $x -lt $N; $x++) {
    if (-not (& $opaque $x $y)) { continue }
    $c = $bmp.GetPixel($x, $y)
    $lit = (-not (& $opaque ($x - 1) $y)) -or (-not (& $opaque $x ($y - 1)))
    $dark = (-not (& $opaque ($x + 1) $y)) -or (-not (& $opaque $x ($y + 1)))
    if ($lit -and -not $dark) { $shade["$x,$y"] = C ([Math]::Min(255, $c.R + 60)) ([Math]::Min(255, $c.G + 60)) ([Math]::Min(255, $c.B + 60)) }
    elseif ($dark -and -not $lit) { $shade["$x,$y"] = C ([int]($c.R * 0.6)) ([int]($c.G * 0.6)) ([int]($c.B * 0.6)) }
} }
foreach ($k in $shade.Keys) { $xy = $k.Split(','); $bmp.SetPixel([int]$xy[0], [int]$xy[1], $shade[$k]) }
$line = @()
for ($y = 0; $y -lt $N; $y++) { for ($x = 0; $x -lt $N; $x++) {
    if (& $opaque $x $y) { continue }
    if ((& $opaque ($x - 1) $y) -or (& $opaque ($x + 1) $y) -or (& $opaque $x ($y - 1)) -or (& $opaque $x ($y + 1))) { $line += , @($x, $y) }
} }
foreach ($p in $line) { $bmp.SetPixel($p[0], $p[1], (C 13 13 13)) }

$big = New-Object System.Drawing.Bitmap 128, 128
$g2 = [System.Drawing.Graphics]::FromImage($big)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g2.DrawImage($bmp, 0, 0, 128, 128)
$big.Save((Join-Path $out 'osrs-partyhat.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose(); $big.Dispose(); $g.Dispose(); $bmp.Dispose()
Write-Host 'drawn: osrs-partyhat.png'
