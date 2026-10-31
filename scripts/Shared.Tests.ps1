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
