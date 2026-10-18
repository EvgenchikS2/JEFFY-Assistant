# Copy source only. Existing public copies receive a full source backup first.
$ErrorActionPreference = 'Stop'
$personalRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$projectsRoot = [IO.Path]::GetFullPath((Join-Path $personalRoot '..'))
$publicRoot = [IO.Path]::GetFullPath((Join-Path $projectsRoot 'jeffy-github'))
if ($publicRoot -eq $personalRoot -or !(($publicRoot + [IO.Path]::DirectorySeparatorChar).StartsWith($projectsRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase))) { throw 'Invalid public target.' }
$sourceItems = @('src','public','scripts','tests','docs','.github','package.json','package-lock.json','.gitignore','.gitattributes','README.md','LICENSE','THIRD-PARTY.md','DESIGN.md','START-JEFFY.cmd','START-BROWSER.cmd','INSTALL-OFFLINE.cmd')
$privateDocs = @('ASTRA-MOTION-1.2.2.md')
foreach ($item in $sourceItems) { if (!(Test-Path -LiteralPath (Join-Path $personalRoot $item))) { throw "Missing source item: $item" } }
if (Test-Path -LiteralPath $publicRoot) {
  $backupRoot = Join-Path $personalRoot ('public-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  foreach ($item in $sourceItems) {
    $existing = Join-Path $publicRoot $item
    if (Test-Path -LiteralPath $existing) { Copy-Item -LiteralPath $existing -Destination $backupRoot -Recurse -Force }
  }
}
New-Item -ItemType Directory -Path $publicRoot -Force | Out-Null
foreach ($item in $sourceItems) {
  if ($item -eq 'docs') {
    $publicDocs = Join-Path $publicRoot 'docs'
    New-Item -ItemType Directory -Path $publicDocs -Force | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $personalRoot 'docs') -Force |
      Where-Object { $_.Name -notin $privateDocs } |
      ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $publicDocs -Recurse -Force }
    foreach ($privateDoc in $privateDocs) {
      $staleDoc = Join-Path $publicDocs $privateDoc
      if (Test-Path -LiteralPath $staleDoc -PathType Leaf) { Remove-Item -LiteralPath $staleDoc -Force }
    }
  } else {
    Copy-Item -LiteralPath (Join-Path $personalRoot $item) -Destination $publicRoot -Recurse -Force
  }
}
Write-Output "Prepared source: $publicRoot"
Write-Output 'Runtime, API keys, user data, executable and models were not copied.'
