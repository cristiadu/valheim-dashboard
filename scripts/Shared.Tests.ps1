BeforeAll {
  Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force
}

Describe 'Test-PluginChanged' {
  It 'is true when a file in the plugin folder changed' {
    # GIVEN a commit range that touched the dashboard and the plugin
    $changedFiles = @('apps/dashboard/src/routes/+page.svelte', 'plugins/event-log/ChatTracker.cs')

    # WHEN checking it
    $isPluginChanged = Test-PluginChanged $changedFiles

    # THEN the plugin needs installing
    $isPluginChanged | Should -BeTrue
  }

  It 'is false when only other files changed' {
    # GIVEN a commit range that touched the docs and a file whose name only starts like the plugin folder
    $changedFiles = @('docs/architecture.md', 'plugins/event-log.md')

    # WHEN checking it
    $isPluginChanged = Test-PluginChanged $changedFiles

    # THEN the plugin stays as it is
    $isPluginChanged | Should -BeFalse
  }
}

Describe 'Get-OnlinePlayerCount' {
  It 'counts only the sessions that have not ended' {
    # GIVEN a snapshot with one ended session and two open ones
    $snapshot = '{"sessions":[
      {"character":"Yan","startUtc":"2026-10-31T00:53:37.000Z","endUtc":"2026-10-31T03:08:34.000Z"},
      {"character":"Ragnar","startUtc":"2026-10-31T09:43:13.000Z"},
      {"character":"Inge Dragonchow","startUtc":"2026-10-31T10:01:02.000Z","endUtc":null}
    ]}' | ConvertFrom-Json

    # WHEN counting
    $onlineCount = Get-OnlinePlayerCount $snapshot

    # THEN Ragnar and Inge Dragonchow are online
    $onlineCount | Should -Be 2
  }

  It 'is 0 when nobody has played' {
    # GIVEN a snapshot with no sessions
    $snapshot = '{"sessions":[]}' | ConvertFrom-Json

    # WHEN counting
    $onlineCount = Get-OnlinePlayerCount $snapshot

    # THEN nobody is online
    $onlineCount | Should -Be 0
  }
}

Describe 'Invoke-Checked' {
  It 'returns the output of a command that succeeds' {
    # GIVEN git, which every PC running these scripts has

    # WHEN asking its version
    $output = Invoke-Checked 'git' @('--version')

    # THEN the output is returned
    $output | Should -BeLike 'git version *'
  }

  It 'throws with the exit code and output when the command fails' {
    # GIVEN a git command that does not exist

    # WHEN running it, THEN it throws with git's exit code and message
    { Invoke-Checked 'git' @('not-a-command') } |
      Should -Throw -ExpectedMessage "git not-a-command failed with exit code 1*'not-a-command' is not a git command*"
  }
}

Describe 'Test-CommitHash' {
  It 'is true for a full commit hash' {
    # GIVEN a commit hash as git rev-parse prints it
    $commit = '008e24f3565169dd09f93004564944ffcddb4646'

    # WHEN checking it
    $isCommitHash = Test-CommitHash $commit

    # THEN it can go to git
    $isCommitHash | Should -BeTrue
  }

  It 'is false for an option that git would run' {
    # GIVEN a state file value that is a git option, not a commit
    $value = '--output=C:\Windows\Temp\x.txt'

    # WHEN checking it
    $isCommitHash = Test-CommitHash $value

    # THEN it must not go to git
    $isCommitHash | Should -BeFalse
  }

  It 'is false for a short or uppercase hash' {
    # GIVEN hashes git rev-parse never prints
    $values = @('008e24f', '008E24F3565169DD09F93004564944FFCDDB4646')

    # WHEN checking them
    $results = $values | ForEach-Object { Test-CommitHash $_ }

    # THEN neither is accepted
    $results | Should -Be @($false, $false)
  }
}

Describe 'Test-UrlHasCredentials' {
  It 'is true when a token is in the URL' {
    # GIVEN a remote URL with a token before the host
    $url = 'https://ghp_example123@github.com/cristiadu/valheim-dashboard.git'

    # WHEN checking it
    $hasCredentials = Test-UrlHasCredentials $url

    # THEN the updater stops before git can print it
    $hasCredentials | Should -BeTrue
  }

  It 'is false for a plain URL' {
    # GIVEN the remote URL GitHub shows for cloning
    $url = 'https://github.com/cristiadu/valheim-dashboard.git'

    # WHEN checking it
    $hasCredentials = Test-UrlHasCredentials $url

    # THEN the updater goes on
    $hasCredentials | Should -BeFalse
  }
}

Describe 'Test-CiPassed' {
  It 'is true when the ci job passed' {
    # GIVEN check runs where ci passed
    $checkRuns = '{"check_runs":[{"name":"ci","status":"completed","conclusion":"success"}]}' | ConvertFrom-Json

    # WHEN checking them
    $isPassed = Test-CiPassed $checkRuns

    # THEN the commit can run here
    $isPassed | Should -BeTrue
  }

  It 'is false while ci runs or after it failed' {
    # GIVEN check runs where ci is still going, and others where it failed
    $running = '{"check_runs":[{"name":"ci","status":"in_progress","conclusion":null}]}' | ConvertFrom-Json
    $failed = '{"check_runs":[{"name":"ci","status":"completed","conclusion":"failure"}]}' | ConvertFrom-Json

    # WHEN checking them
    $results = @((Test-CiPassed $running), (Test-CiPassed $failed))

    # THEN the commit waits
    $results | Should -Be @($false, $false)
  }

  It 'is false when only another check passed' {
    # GIVEN check runs with no ci job
    $checkRuns = '{"check_runs":[{"name":"Dependabot","status":"completed","conclusion":"success"}]}' | ConvertFrom-Json

    # WHEN checking them
    $isPassed = Test-CiPassed $checkRuns

    # THEN the commit waits
    $isPassed | Should -BeFalse
  }
}

Describe 'Get-PnpmVersion' {
  It 'reads the version from packageManager' {
    # GIVEN a repo whose package.json asks for pnpm 12.16.1
    Set-Content (Join-Path $TestDrive 'package.json') '{"name":"valheim-dashboard","packageManager":"pnpm@12.16.1"}'

    # WHEN reading it
    $version = Get-PnpmVersion $TestDrive

    # THEN only the version is left
    $version | Should -Be '12.16.1'
  }
}

Describe 'Get-GameServerPassword' {
  It 'reads a quoted password from the start file' {
    # GIVEN a start file like the one Valheim ships
    Set-Content -Path (Join-Path $TestDrive 'start_headless_server.bat') -Value @(
      'set SteamAppId=892970',
      'valheim_server -nographics -batchmode -name "Cotil" -port 2456 -world "Cotil" -password "skol 123" -crossplay'
    )

    # WHEN reading the password
    $password = Get-GameServerPassword $TestDrive

    # THEN it is the text inside the quotes
    $password | Should -Be 'skol 123'
  }

  It 'reads a password without quotes' {
    # GIVEN a start file with an unquoted password
    Set-Content -Path (Join-Path $TestDrive 'start_headless_server.bat') -Value 'valheim_server -world Cotil -password skol123 -public 1'

    # WHEN reading the password
    $password = Get-GameServerPassword $TestDrive

    # THEN it is the next word
    $password | Should -Be 'skol123'
  }

  It 'gives nothing when the start file has no password' {
    # GIVEN a start file without -password
    Set-Content -Path (Join-Path $TestDrive 'start_headless_server.bat') -Value 'valheim_server -world Cotil'

    # WHEN reading the password
    $password = Get-GameServerPassword $TestDrive

    # THEN there is none
    $password | Should -BeNullOrEmpty
  }
}
