$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($env:HINTIO_VERIFY_MSIX_FILE)
try {
    $manifestEntry = $zip.GetEntry('AppxManifest.xml')
    if (!$manifestEntry) { throw 'MSIX manifest missing' }
    $reader = [IO.StreamReader]::new($manifestEntry.Open())
    try { $manifest = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $asar = $zip.GetEntry('app/resources/app.asar')
    if (!$asar) { throw 'Packaged app archive missing' }
    $stream = $asar.Open()
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $asarHash = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose(); $stream.Dispose() }
    [pscustomobject]@{ entries = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\','/') }); manifest = $manifest; asarHash = $asarHash } | ConvertTo-Json -Depth 4 -Compress
} finally { $zip.Dispose() }
