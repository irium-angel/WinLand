# What is playing, from any music app (media-main.cjs). Windows keeps one "media session" per app that plays
# something (Spotify, Apple Music, Deezer, TIDAL, a browser tab with YouTube Music or Deezer web...): the same one
# that shows in the volume flyout. We read it and press its buttons. No account, no API key.
# Answers one line at a time on stdin:
#   <id> state                  -> <id> {json}: app, title, artist, playing, position, duration (+ cover once per song)
#   <id> play|pause|toggle|next|previous
#   <id> seek <ms>
# Every answer starts with the same <id>, so answers never get mixed up. Stops when WinLand closes stdin.
# Between questions it watches the player 4 times a second and prints "push {json}" as soon as the song, the app or
# play/pause changes (and again when a cover arrives late), so the island changes at once, without waiting to ask.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false # titles with accents (Beyoncé, 坂本龍一) arrive intact
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]

# WinRT async → .NET Task, and wait for it
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  [void]$task.Wait(3000)
  if (-not $task.IsCompleted) { throw 'timeout' }
  $task.Result
}

$asRead = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))

$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$Playing = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing

# The session to show: the one that is playing right now, otherwise the one Windows calls current.
function Pick() {
  $all = @($manager.GetSessions())
  foreach ($s in $all) { try { if ($s.GetPlaybackInfo().PlaybackStatus -eq $Playing) { return $s } } catch {} }
  $current = $manager.GetCurrentSession()
  if ($current) { return $current }
  if ($all.Count) { return $all[0] }
  return $null
}

$lastSong = ''; $coverMissing = $false; $coverTries = 0
function Cover($props) {
  if (-not $props.Thumbnail) { return '' }
  try {
    $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    # PowerShell cannot pick the overload for a WinRT stream itself: call it through reflection
    $net = $asRead.Invoke($null, @($stream))
    $memory = New-Object System.IO.MemoryStream
    $net.CopyTo($memory); $net.Dispose()
    if ($memory.Length -eq 0 -or $memory.Length -gt 2MB) { return '' }
    $bytes = $memory.ToArray()
    $type = if ($bytes[0] -eq 0x89) { 'image/png' } else { 'image/jpeg' } # the stream does not say: look at the first byte
    return 'data:' + $type + ';base64,' + [Convert]::ToBase64String($bytes)
  } catch { return '' }
}

function State() {
  $s = Pick
  if (-not $s) { return @{ ok = $true; active = $false } }
  $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $info = $s.GetPlaybackInfo(); $time = $s.GetTimelineProperties()
  $playing = $info.PlaybackStatus -eq $Playing
  $duration = [Math]::Max(0, ($time.EndTime - $time.StartTime).TotalMilliseconds)
  $position = ($time.Position - $time.StartTime).TotalMilliseconds
  # apps only update the position now and then: add the time since, while it plays
  if ($playing -and $time.LastUpdatedTime.Year -gt 2000) { $position += ([DateTimeOffset]::Now - $time.LastUpdatedTime).TotalMilliseconds }
  if ($duration -gt 0) { $position = [Math]::Min($position, $duration) }
  $artist = if ($props.Artist) { $props.Artist } else { $props.AlbumArtist }
  $album = $props.AlbumTitle
  # Apple Music puts "Artist — Album" in the artist field
  if (-not $album -and $artist -match ('^(.+?) ' + [char]0x2014 + ' (.+)$')) { $artist = $Matches[1]; $album = $Matches[2] }
  $song = $s.SourceAppUserModelId + '|' + $props.Title + '|' + $artist
  $out = @{ ok = $true; active = [bool]$props.Title; app = $s.SourceAppUserModelId; title = $props.Title; artist = $artist; album = $album
    playing = $playing; position = [Math]::Max(0, [Math]::Round($position)); duration = [Math]::Round($duration)
    canSeek = $info.Controls.IsPlaybackPositionEnabled; song = $song }
  if ($song -ne $lastSong) { # the picture only once per song...
    $out.cover = Cover $props; $script:lastSong = $song; $script:coverMissing = -not $out.cover; $script:coverTries = 0
  } elseif ($coverMissing -and $coverTries -lt 12) { # ...unless the app gives it a moment after the title (Spotify does): try again
    $script:coverTries++; $c = Cover $props; if ($c) { $out.cover = $c; $script:coverMissing = $false }
  }
  return $out
}

function Press($command, $arg) {
  $s = Pick
  if (-not $s) { return @{ ok = $false; error = 'nothing' } }
  $op = switch ($command) {
    'play' { $s.TryPlayAsync() } 'pause' { $s.TryPauseAsync() } 'toggle' { $s.TryTogglePlayPauseAsync() }
    'next' { $s.TrySkipNextAsync() } 'previous' { $s.TrySkipPreviousAsync() }
    'seek' { $s.TryChangePlaybackPositionAsync([long]([double]$arg * 10000)) } # ms → 100 ns ticks
  }
  return @{ ok = [bool](Await $op ([bool])) }
}

function Answer($line) {
  $parts = $line.Trim().Split(' ')
  if ($parts.Count -lt 2) { return }
  $id = $parts[0]; $command = $parts[1]; $arg = if ($parts.Count -gt 2) { $parts[2] } else { '' }
  try {
    if ($command -eq 'state') { $answer = State }
    elseif ($command -eq 'forget') { $script:lastSong = ''; $answer = @{ ok = $true } } # WinLand lost the cover: send it again
    elseif (@('play', 'pause', 'toggle', 'next', 'previous', 'seek') -contains $command) { $answer = Press $command $arg }
    else { $answer = @{ ok = $false; error = 'unknown' } }
  } catch { $answer = @{ ok = $false; error = $_.Exception.Message } }
  [Console]::Out.WriteLine($id + ' ' + (ConvertTo-Json $answer -Compress -Depth 3))
  [Console]::Out.Flush()
}

# What changes the picture: the app, the song, play/pause. (The position moves by itself: the island counts it.)
function Signature() {
  $s = Pick
  if (-not $s) { return 'none' }
  $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  return $s.SourceAppUserModelId + '|' + $props.Title + '|' + $props.Artist + '|' + $s.GetPlaybackInfo().PlaybackStatus
}

# stdin read without blocking, so the watch runs between questions
$in = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), (New-Object System.Text.UTF8Encoding $false))
$pending = $in.ReadLineAsync()
$lastSignature = ''
while ($true) {
  if ($pending.Wait(250)) {
    $line = $pending.Result
    if ($null -eq $line) { break } # WinLand closed
    Answer $line
    $pending = $in.ReadLineAsync()
    continue
  }
  try {
    $now = Signature
    if ($now -ne $lastSignature -or $coverMissing) {
      $hadCover = -not $coverMissing
      $state = if ($now -eq 'none') { @{ ok = $true; active = $false } } else { State }
      if ($now -ne $lastSignature -or ($hadCover -eq $false -and -not $coverMissing)) {
        $lastSignature = $now
        [Console]::Out.WriteLine('push ' + (ConvertTo-Json $state -Compress -Depth 3)); [Console]::Out.Flush()
      }
    }
  } catch {}
}
