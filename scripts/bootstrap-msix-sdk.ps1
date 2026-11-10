$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$folder = Join-Path $root '.cache\msix-sdk'
$version = '10.0.28000.2957'
$base = "https://api.nuget.org/v3-flatcontainer/microsoft.windows.sdk.buildtools/$version/microsoft.windows.sdk.buildtools.$version.nupkg"
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$archive = Join-Path $folder 'sdk.nupkg'
if (!(Test-Path -LiteralPath $archive)) { Invoke-WebRequest -Uri $base -OutFile $archive }
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne 'B7163FC6F636172726D0985963E4F7F11C41AFE1C7FDFE78F8051877360ED696') { throw 'SDK package checksum mismatch' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName -match '^bin/10\.0\.28000\.0/x64/' -and $entry.Name) {
            $destination = [IO.Path]::GetFullPath((Join-Path $folder $entry.FullName))
            if (!$destination.StartsWith($folder + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid SDK archive path' }
            New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
        }
    }
} finally { $zip.Dispose() }
$tool = Join-Path $folder 'bin\10.0.28000.0\x64\makeappx.exe'
$signature = Get-AuthenticodeSignature -LiteralPath $tool
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') { throw 'Microsoft SDK signature verification failed' }
Write-Output "Verified Microsoft MSIX build tools: $tool"

