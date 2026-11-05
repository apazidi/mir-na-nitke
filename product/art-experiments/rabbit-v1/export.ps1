param([string]$Root = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$out = Join-Path $Root 'exports'
$review = Join-Path $Root 'review'
[void][IO.Directory]::CreateDirectory($out)
[void][IO.Directory]::CreateDirectory($review)
function Canvas([int]$w,[int]$h) { return [Drawing.Bitmap]::new($w,$h,[Drawing.Imaging.PixelFormat]::Format32bppArgb) }
function Graphics($im) {
  $g = [Drawing.Graphics]::FromImage($im)
  $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
  return $g
}
function Save($im,$path) { $im.Save($path,[Drawing.Imaging.ImageFormat]::Png) }
function Draw($g,$im,$x,$y,$w,$h) { $g.DrawImage($im,[Drawing.Rectangle]::new($x,$y,$w,$h)) }
$layout = Get-Content (Join-Path $Root 'source/master.json') -Raw | ConvertFrom-Json
$atlas = [Drawing.Bitmap]::new((Join-Path $Root 'source/parts.png'))
$parts = @{}
foreach ($p in $layout.parts) {
  $r = $p.crop
  $part = $atlas.Clone([Drawing.Rectangle]::new($r[0],$r[1],$r[2],$r[3]),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $parts[$p.id] = $part
}
$background = [Drawing.Bitmap]::new((Join-Path $Root 'source/workshop.png'))
$stages = @()
foreach ($stage in $layout.stages) {
  $sprite = Canvas 1024 1820
  $sg = Graphics $sprite
  foreach ($p in $layout.parts) {
    if ($stage.parts -contains $p.id) {
      $d = $p.destination
      Draw $sg $parts[$p.id] $d[0] $d[1] $d[2] $d[3]
    }
  }
  $sg.Dispose()
  $frame = Canvas 1024 1820
  $g = Graphics $frame
  Draw $g $background 0 0 1024 1820
  # Constant soft contact shadow; exported sprite has no baked tabletop.
  if ($stage.parts.Count -gt 0) {
    $shadowY = if ($stage.progress -eq 25) {1300} else {1470}
    for ($i=0; $i -lt 12; $i++) {
      $b = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(3,65,39,20))
      $g.FillEllipse($b,290-$i*3,$shadowY-$i,440+$i*6,45+$i*2)
      $b.Dispose()
    }
  }
  Draw $g $sprite 0 0 1024 1820
  $g.Dispose()
  Save $frame (Join-Path $out ('stage-{0:d3}.png' -f [int]$stage.progress))
  $stages += $frame
  if ($stage.progress -eq 100) { Save $sprite (Join-Path $out 'finished-sprite.png') }
  $sprite.Dispose()
}
Save $stages[-1] (Join-Path $out 'golden-frame.png')
foreach ($size in @(@(360,800),@(390,844),@(430,932))) {
  $sheet = Canvas ($size[0]*5) $size[1]
  $g = Graphics $sheet
  for ($i=0; $i -lt 5; $i++) {
    # Contain the complete logical artboard, letterbox to device aspect ratio.
    $g.FillRectangle([Drawing.Brushes]::Beige,$i*$size[0],0,$size[0],$size[1])
    $h = [int]($size[0]*1820/1024)
    Draw $g $stages[$i] ($i*$size[0]) ([int](($size[1]-$h)/2)) $size[0] $h
  }
  $g.Dispose()
  Save $sheet (Join-Path $review ('stages-{0}x{1}.png' -f $size[0],$size[1]))
  $sheet.Dispose()
}
$sheet = Canvas 1536 1024
$g = Graphics $sheet
$g.Clear([Drawing.Color]::FromArgb(244,235,217))
$font = [Drawing.Font]::new('Arial',18)
for ($i=0;$i -lt 5;$i++) {
  $x = ($i%3)*512
  $y = [int][Math]::Floor($i/3)*512
  Draw $g $stages[$i] ($x+126) ($y+30) 260 462
  $g.DrawString(('{0}%' -f $layout.stages[$i].progress),$font,[Drawing.Brushes]::Black,$x+12,$y+8)
}
$sprite = [Drawing.Bitmap]::new((Join-Path $out 'finished-sprite.png'))
for ($y=512;$y -lt 1024;$y+=24) { for ($x=1024;$x -lt 1536;$x+=24) {
  $brush = if ((($x-1024)/24+($y-512)/24)%2 -eq 0) {[Drawing.Brushes]::LightGray} else {[Drawing.Brushes]::White}
  $g.FillRectangle($brush,$x,$y,24,24)
} }
Draw $g $sprite 1150 542 260 462
$g.DrawString('ALPHA SPRITE',$font,[Drawing.Brushes]::Black,1036,520)
$g.Dispose(); $font.Dispose(); $sprite.Dispose()
Save $sheet (Join-Path $review 'contact-sheet.png'); $sheet.Dispose()
foreach ($name in @('meadow-day','meadow-evening')) {
  $path = Join-Path $Root ('source/'+$name+'.png')
  if (Test-Path $path) {
    $im = [Drawing.Bitmap]::new($path)
    $frame = Canvas 1024 1820; $g = Graphics $frame
    Draw $g $im 0 0 1024 1820; $g.Dispose()
    Save $frame (Join-Path $out ($name+'.png'))
    $frame.Dispose(); $im.Dispose()
  }
}
$report = @()
foreach ($file in Get-ChildItem $out -Filter '*.png') {
  $im = [Drawing.Bitmap]::new($file.FullName)
  if ($im.Width -ne 1024 -or $im.Height -ne 1820) { throw "Bad artboard: $($file.Name)" }
  $alphaSamples = 0
  if ($file.Name -eq 'finished-sprite.png') {
    for ($y=0;$y -lt $im.Height;$y+=8) { for ($x=0;$x -lt $im.Width;$x+=8) {
      if ($im.GetPixel($x,$y).A -lt 255) { $alphaSamples++ }
    } }
    if ($alphaSamples -lt 1000 -or $im.GetPixel(0,0).A -ne 0) { throw 'Sprite lacks real transparency' }
  }
  if ($file.Length -gt 12MB) { throw "Asset exceeds 12 MiB: $($file.Name)" }
  $report += [PSCustomObject]@{file=$file.Name;width=$im.Width;height=$im.Height;bytes=$file.Length;transparentSamples=$alphaSamples;sha256=(Get-FileHash $file.FullName -Algorithm SHA256).Hash}
  $im.Dispose()
}
$report | ConvertTo-Json | Set-Content (Join-Path $review 'asset-report.json') -Encoding utf8
$atlas.Dispose(); $background.Dispose()
foreach ($p in $parts.Values) {$p.Dispose()}
foreach ($s in $stages) {$s.Dispose()}
Write-Output ($report | Format-Table | Out-String)
