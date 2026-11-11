param([string]$ComfyRoot = '', [string]$SwarmRoot = '', [string]$PythonExe = '', [ValidateSet('EN','HU','DE','FR','ES','IT','PT','PL')][string]$Language = 'EN')
$ErrorActionPreference = 'Stop'
$env:PYTHONDONTWRITEBYTECODE = '1'
function File-Digest([string]$Path) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($Path)
    try { return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','') }
    finally { $stream.Dispose(); $sha.Dispose() }
}
Write-Host 'Prophetero Scene Planner 0.2.0-beta.1 - public beta installer'
if ($SwarmRoot) {
    $swarm = (Resolve-Path -LiteralPath $SwarmRoot).Path
    $config = Join-Path $swarm 'Data\Backends.fds'
    if (-not (Test-Path -LiteralPath $config -PathType Leaf)) { throw 'SwarmUI backend configuration not found.' }
    $roots = @()
    foreach ($line in Get-Content -LiteralPath $config) {
        if ($line -match '^\s*StartScript:\s*(.+?)\s*$') {
            $script = $Matches[1].Trim().Trim('"').Trim("'")
            if (-not [IO.Path]::IsPathRooted($script)) { $script = Join-Path $swarm $script }
            if ((Split-Path -Leaf $script) -eq 'main.py' -and (Test-Path -LiteralPath $script -PathType Leaf)) { $roots += Split-Path -Parent (Resolve-Path -LiteralPath $script).Path }
        }
    }
    $roots = @($roots | Sort-Object -Unique)
    if ($roots.Count -ne 1) { throw 'The SwarmUI backend is ambiguous. No files changed.' }
    $ComfyRoot = $roots[0]
}
if (-not $ComfyRoot) {
    Add-Type -AssemblyName System.Windows.Forms
    $picker = New-Object System.Windows.Forms.FolderBrowserDialog
    $picker.Description = 'Select the ComfyUI backend folder containing main.py.'
    if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { throw 'Cancelled.' }
    $ComfyRoot = $picker.SelectedPath
    $picker.Dispose()
}
$root = (Resolve-Path -LiteralPath $ComfyRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $root 'main.py') -PathType Leaf)) { throw 'This is not a ComfyUI backend folder.' }
if (-not $PythonExe) {
    foreach ($relative in @('venv\Scripts\python.exe','.venv\Scripts\python.exe','..\python_embeded\python.exe','..\python_embedded\python.exe')) {
        $candidate = Join-Path $root $relative
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { $PythonExe = $candidate; break }
    }
}
if (-not $PythonExe) { throw 'Pass the PythonExe used by this ComfyUI. Nothing was installed.' }
$python = (Resolve-Path -LiteralPath $PythonExe).Path
& $python -c 'import sys; assert sys.version_info >= (3,10); import aiohttp; from PIL import Image'
if ($LASTEXITCODE -ne 0) { throw 'Python 3.10+, aiohttp and Pillow are required. No packages were installed or upgraded.' }
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
$source = Join-Path $PSScriptRoot 'prophetero-scene-planner'
$target = Join-Path $root 'custom_nodes\prophetero-scene-planner'
$workflow = Join-Path $root 'user\default\workflows\Prophetero_Scene_Planner_GLOBAL.json'
$backup = Join-Path $root ('user\prophetero-backups\ScenePlanner-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
$items = @()
foreach ($entry in $manifest.files) {
    $relative = [string]$entry.path
    if ($relative -match '(^|[\\/])\.\.([\\/]|$)' -or [IO.Path]::IsPathRooted($relative)) { throw 'Invalid package path.' }
    $src = Join-Path $source $relative
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Missing package file: $relative" }
    if ((File-Digest $src) -ne $entry.sha256) { throw "Package verification failed: $relative" }
    $dst = [IO.Path]::GetFullPath((Join-Path $target $relative))
    if (-not $dst.StartsWith(([IO.Path]::GetFullPath($target) + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination outside plugin folder.' }
    $items += [PSCustomObject]@{Source=$src;Target=$dst;Relative=$relative;Hash=$entry.sha256}
}
$launcher = Join-Path $PSScriptRoot 'Prophetero_Scene_Planner_GLOBAL.json'
if ((File-Digest $launcher) -ne $manifest.workflow_sha256) { throw 'Launcher workflow verification failed.' }
Write-Host "Backend: $root"
Write-Host 'No generation models, Python packages or existing generation workflows will be changed.'
foreach ($item in $items) {
    if (Test-Path -LiteralPath $item.Target -PathType Leaf) {
        $old = Join-Path $backup $item.Relative
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $old) | Out-Null
        Copy-Item -LiteralPath $item.Target -Destination $old
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $item.Target) | Out-Null
    Copy-Item -LiteralPath $item.Source -Destination $item.Target -Force
    if ((File-Digest $item.Target) -ne $item.Hash) { throw "Copy verification failed: $($item.Relative). Backups: $backup" }
    Write-Host ("OK: " + $item.Relative)
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $workflow) | Out-Null
if (Test-Path -LiteralPath $workflow -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    Copy-Item -LiteralPath $workflow -Destination (Join-Path $backup 'Prophetero_Scene_Planner_GLOBAL.json')
}
$graph = Get-Content -LiteralPath $launcher -Raw | ConvertFrom-Json
foreach ($node in $graph.nodes) { if ($node.type -eq 'PropheteroScenePlanner') { $node.widgets_values[0] = $Language } }
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($workflow, ($graph | ConvertTo-Json -Depth 60), $utf8)
Write-Host ''
Write-Host 'DONE. Fully restart SwarmUI / ComfyUI, then refresh its browser page.'
Write-Host 'Open Prophetero_Scene_Planner_GLOBAL, then click Open Scene Planner.'
Write-Host 'Or use the new Open Scene Planner button on your MiniMaxH3ImageToVideo node.'
Write-Host "Launcher: $workflow"
Write-Host "Backups if needed: $backup"
