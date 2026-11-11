BeforeAll {
  $script:Updater = Join-Path $PSScriptRoot 'start-valheim.ps1'
  # Commits in the throwaway repos need an author.
  $env:GIT_AUTHOR_NAME = 'Test'
  $env:GIT_AUTHOR_EMAIL = 'test@example.com'
  $env:GIT_COMMITTER_NAME = 'Test'
  $env:GIT_COMMITTER_EMAIL = 'test@example.com'

  <#
  .SYNOPSIS
    Makes a throwaway origin with two commits on main, the second touching only the docs, and a checkout of it
    in [Folder]. Returns the two commit hashes, oldest first.
  #>
  function New-Checkout([string]$Folder) {
    $origin = Join-Path $Folder 'origin'
    $checkout = Join-Path $Folder 'checkout'
    git init --quiet --initial-branch main $origin
    Set-Content (Join-Path $origin 'README.md') 'Longhouse'
    git -C $origin add README.md
    git -C $origin commit --quiet -m 'First'
    New-Item -ItemType Directory (Join-Path $origin 'docs') | Out-Null
    Set-Content (Join-Path $origin 'docs/architecture.md') 'How it works'
    git -C $origin add docs
    git -C $origin commit --quiet -m 'Docs only'
    git clone --quiet $origin $checkout
    return @(git -C $origin rev-parse HEAD~1), @(git -C $origin rev-parse HEAD)
  }

  <#
  .SYNOPSIS
    Runs the updater once on the checkout in [Folder], with its log and state next to a logs.txt there.
  #>
  function Invoke-Updater([string]$Folder) {
    Push-Location
    try {
      & $Updater -Part UpdateOnce -RepoRoot (Join-Path $Folder 'checkout') -LogFile (Join-Path $Folder 'logs.txt')
    } finally {
      Pop-Location
    }
  }
}

Describe 'start-valheim.ps1 -Part UpdateOnce' {
  BeforeEach {
    $folder = Join-Path $TestDrive ([guid]::NewGuid())
    $first, $second = New-Checkout $folder
    $checkout = Join-Path $folder 'checkout'
    $updaterLog = Join-Path $folder 'updater.log'
    $stateFile = Join-Path $folder 'updater-state.json'
  }

  It 'skips a checkout on another branch' {
    # GIVEN a checkout on a feature branch
    git -C $checkout switch --quiet -c feature

    # WHEN the updater runs
    Invoke-Updater $folder

    # THEN it says why it did nothing
    (Get-Content $updaterLog) -replace '^\S+ \S+ ', '' | Should -Be 'Skipped: the checkout is on feature, not main.'
  }

  It 'skips a checkout with uncommitted changes' {
    # GIVEN a changed tracked file
    Set-Content (Join-Path $checkout 'README.md') 'Edited by hand'

    # WHEN the updater runs
    Invoke-Updater $folder

    # THEN it leaves the change alone
    (Get-Content $updaterLog) -replace '^\S+ \S+ ', '' | Should -Be 'Skipped: the checkout has uncommitted changes.'
  }

  It 'skips an origin URL with a token in it' {
    # GIVEN an origin URL with a token before the host
    git -C $checkout remote set-url origin 'https://ghp_example@github.com/cristiadu/valheim-dashboard.git'

    # WHEN the updater runs
    Invoke-Updater $folder

    # THEN it asks for the token to be removed and does not fetch
    (Get-Content $updaterLog) -replace '^\S+ \S+ ', '' |
      Should -Be 'Skipped: the origin URL has a user name or token in it. Remove it with: git remote set-url origin https://github.com/cristiadu/valheim-dashboard.git'
  }

  It 'takes a commit without plugin changes without building the plugin' {
    # GIVEN a built dashboard at the newest commit and a plugin installed from the commit before, which only the docs changed since
    Set-Content $stateFile (@{ dashboardCommit = $second; pluginCommit = $first } | ConvertTo-Json)

    # WHEN the updater runs
    Invoke-Updater $folder

    # THEN it notes the plugin as current without logging anything
    (Get-Content $stateFile -Raw | ConvertFrom-Json).pluginCommit | Should -Be $second
    Test-Path $updaterLog | Should -BeFalse
  }
}
