<#
.SYNOPSIS
  Runs the scripts' unit tests (*.Tests.ps1) and integration tests (*.Integration.Tests.ps1) with Pester, and
  writes what each kind ran to coverage\<kind>\cobertura-coverage.xml in this folder. Then writes the coverage
  table of every project to coverage\coverage-report.md here. CI runs it after pnpm coverage.

.EXAMPLE
  .\scripts\Measure-Coverage.ps1
#>

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

# Projects in the coverage table, from the repo folder.
$Projects = @('apps/dashboard', 'packages/valheim-log', 'scripts')

# Repo folder, one level above this script.
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Scripts whose lines count, which leaves out the tests and this script.
$measuredFiles = Get-ChildItem $PSScriptRoot -File -Include '*.ps1', '*.psm1' -Recurse |
  Where-Object { $_.Name -notlike '*.Tests.ps1' -and $_.FullName -ne $PSCommandPath } |
  ForEach-Object FullName

$integrationTests = Get-ChildItem $PSScriptRoot -Filter '*.Integration.Tests.ps1' | ForEach-Object FullName
$unitTests = Get-ChildItem $PSScriptRoot -Filter '*.Tests.ps1' |
  Where-Object { $_.FullName -notin $integrationTests } |
  ForEach-Object FullName

$failedCount = 0
foreach ($run in @(@{ Kind = 'unit'; Tests = $unitTests }, @{ Kind = 'integration'; Tests = $integrationTests })) {
  $outputFolder = Join-Path $PSScriptRoot "coverage/$($run.Kind)"
  New-Item -ItemType Directory -Force $outputFolder | Out-Null
  $config = New-PesterConfiguration
  $config.Run.Path = $run.Tests
  $config.Run.PassThru = $true
  $config.Output.Verbosity = 'Normal'
  $config.CodeCoverage.Enabled = $true
  $config.CodeCoverage.Path = $measuredFiles
  $config.CodeCoverage.OutputFormat = 'Cobertura'
  $config.CodeCoverage.OutputPath = Join-Path $outputFolder 'cobertura-coverage.xml'
  $failedCount += (Invoke-Pester -Configuration $config).FailedCount
}
if ($failedCount -gt 0) {
  throw "$failedCount script test(s) failed."
}

Push-Location $RepoRoot
try {
  Format-CoverageTable $Projects | Set-Content -NoNewline (Join-Path $PSScriptRoot 'coverage/coverage-report.md')
} finally {
  Pop-Location
}
