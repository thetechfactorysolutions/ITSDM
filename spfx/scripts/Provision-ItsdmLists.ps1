<#
.SYNOPSIS
  Creates the SharePoint lists used by the IT Management Hub web part and, optionally, sample data.

.DESCRIPTION
  Creates IT_01_Ideas, IT_02_Initiatives, IT_03_Projects and IT_04_Actions with the columns the
  web part reads and writes (see docs/SHAREPOINT_SCHEMA.md). Safe to run more than once: lists and
  columns that already exist are left alone, and sample data is only added to an EMPTY list.

.PARAMETER SiteUrl
  Site that hosts the web part, e.g. https://contoso.sharepoint.com/sites/MySite

.PARAMETER ClientId
  Entra ID app (client) id for PnP interactive sign-in. Needed by PnP.PowerShell 2.x/3.x unless
  the ENTRAID_APP_ID environment variable is set. If omitted, the legacy web login is used.

.PARAMETER SkipSampleData
  Create the structure only, without sample items.

.PARAMETER OwnerEmail
  Owner given to the sample items. Defaults to the signed-in user, so "My Actions" is not empty.

.EXAMPLE
  ./Provision-ItsdmLists.ps1 -SiteUrl https://contoso.sharepoint.com/sites/MySite -ClientId 00000000-0000-0000-0000-000000000000
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $SiteUrl,
  [string] $ClientId,
  [switch] $SkipSampleData,
  [string] $OwnerEmail
)

$ErrorActionPreference = 'Stop'

# ---------- connection ----------
if ($ClientId) {
  Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId
} elseif ($env:ENTRAID_APP_ID -or $env:ENTRAID_CLIENT_ID) {
  Connect-PnPOnline -Url $SiteUrl -Interactive
} else {
  Write-Host 'No ClientId given: using the legacy web login (a sign-in window will open).' -ForegroundColor Yellow
  Connect-PnPOnline -Url $SiteUrl -UseWebLogin
}

if (-not $OwnerEmail) {
  $OwnerEmail = (Get-PnPProperty -ClientObject (Get-PnPWeb) -Property CurrentUser | Select-Object -ExpandProperty Email)
}
Write-Host "Site: $SiteUrl | Sample owner: $OwnerEmail" -ForegroundColor Cyan

# ---------- helpers ----------
function New-FieldXml {
  param([string] $Name, [string] $Type, [string[]] $Choices, [string] $Extra = '')
  $id = [guid]::NewGuid().ToString('B')
  $base = "ID=`"$id`" Name=`"$Name`" StaticName=`"$Name`" DisplayName=`"$Name`""
  switch ($Type) {
    'Text'   { return "<Field Type=`"Text`" $base $Extra />" }
    'Note'   { return "<Field Type=`"Note`" $base RichText=`"FALSE`" NumLines=`"6`" $Extra />" }
    'Number' { return "<Field Type=`"Number`" $base $Extra />" }
    'Date'   { return "<Field Type=`"DateTime`" $base Format=`"DateOnly`" $Extra />" }
    'Choice' {
      $items = ($Choices | ForEach-Object { "<CHOICE>$_</CHOICE>" }) -join ''
      return "<Field Type=`"Choice`" $base Format=`"Dropdown`" $Extra><Default>$($Choices[0])</Default><CHOICES>$items</CHOICES></Field>"
    }
  }
  throw "Unknown field type $Type"
}

function Initialize-ItsdmList {
  param([string] $Title, [array] $Fields)

  $list = Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
  if ($list) {
    Write-Host "  list exists: $Title"
  } else {
    $list = New-PnPList -Title $Title -Template GenericList -OnQuickLaunch
    Write-Host "  list created: $Title" -ForegroundColor Green
  }

  foreach ($f in $Fields) {
    $existing = Get-PnPField -List $Title -Identity $f.Name -ErrorAction SilentlyContinue
    if ($existing) { continue }
    $xml = New-FieldXml -Name $f.Name -Type $f.Type -Choices $f.Choices -Extra $f.Extra
    Add-PnPFieldFromXml -List $Title -FieldXml $xml | Out-Null
    Write-Host "    + $($f.Name) ($($f.Type))"
  }

  # Show the new columns in the default view (not fatal if the view has another name).
  try {
    $names = @('LinkTitle') + ($Fields | ForEach-Object { $_.Name })
    Set-PnPView -List $Title -Identity 'All Items' -Fields $names | Out-Null
  } catch {
    Write-Warning "Could not update the default view of ${Title}: $($_.Exception.Message)"
  }
}

function Get-ListItemCount([string] $Title) {
  return (Get-PnPList -Identity $Title -Includes ItemCount).ItemCount
}

# Day as the value the web part writes: noon UTC keeps the same calendar day in every timezone.
function Get-DateValue([int] $OffsetDays) {
  return (Get-Date).Date.AddDays($OffsetDays).ToString('yyyy-MM-dd') + 'T12:00:00Z'
}

# ---------- list definitions ----------
$ideaStatus       = 'NEW', 'DISCOVERY', 'VALIDATED', 'PLANNED', 'IN_PROGRESS', 'PILOT', 'ROLLOUT', 'COMPLETED', 'REJECTED', 'CANCELLED'
$initiativeStatus = 'DRAFT', 'ACTIVE', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
$projectStatus    = 'PLANNING', 'ACTIVE', 'AT_RISK', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
$actionStatus     = 'OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'
$level            = 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

$ideas = @(
  @{ Name = 'IdeaId'; Type = 'Text' }, @{ Name = 'Description'; Type = 'Note' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = $ideaStatus },
  @{ Name = 'OwnerUPN'; Type = 'Text' }, @{ Name = 'SponsorUPN'; Type = 'Text' },
  @{ Name = 'EstimatedValue'; Type = 'Number' }, @{ Name = 'TargetDate'; Type = 'Date' },
  @{ Name = 'Tags'; Type = 'Note' }, @{ Name = 'ConvertedInitiativeId'; Type = 'Text' }
)
$initiatives = @(
  @{ Name = 'InitiativeId'; Type = 'Text' }, @{ Name = 'Description'; Type = 'Note' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = $initiativeStatus },
  @{ Name = 'OwnerUPN'; Type = 'Text' },
  @{ Name = 'ProgressPct'; Type = 'Number'; Extra = 'Min="0" Max="100"' },
  @{ Name = 'TargetDate'; Type = 'Date' }, @{ Name = 'SourceIdeaId'; Type = 'Text' },
  @{ Name = 'PlannerPlanId'; Type = 'Text' }
)
$projects = @(
  @{ Name = 'ProjectId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' },
  @{ Name = 'Description'; Type = 'Note' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = $projectStatus },
  @{ Name = 'OwnerUPN'; Type = 'Text' },
  @{ Name = 'StartDate'; Type = 'Date' }, @{ Name = 'EndDate'; Type = 'Date' },
  @{ Name = 'BudgetAmount'; Type = 'Number' }, @{ Name = 'ForecastAmount'; Type = 'Number' },
  @{ Name = 'RiskLevel'; Type = 'Choice'; Choices = $level },
  @{ Name = 'PlannerPlanId'; Type = 'Text' }
)
$actions = @(
  @{ Name = 'ActionId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' },
  @{ Name = 'ProjectId'; Type = 'Text' }, @{ Name = 'Description'; Type = 'Note' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = $actionStatus },
  @{ Name = 'Priority'; Type = 'Choice'; Choices = $level },
  @{ Name = 'OwnerUPN'; Type = 'Text' },
  @{ Name = 'DueDate'; Type = 'Date' }, @{ Name = 'CompletedDate'; Type = 'Date' },
  @{ Name = 'PlannerTaskId'; Type = 'Text' }
)

$meetings = @(
  @{ Name = 'MeetingId'; Type = 'Text' }, @{ Name = 'MeetingDate'; Type = 'Date' }, @{ Name = 'Summary'; Type = 'Note' },
  @{ Name = 'Attendees'; Type = 'Note' }, @{ Name = 'Transcript'; Type = 'Note' }, @{ Name = 'ImportedItems'; Type = 'Note' }
)
$notes = @(
  @{ Name = 'NoteId'; Type = 'Text' }, @{ Name = 'Body'; Type = 'Note' },
  @{ Name = 'Category'; Type = 'Choice'; Choices = 'DECISION', 'RISK', 'INFO', 'FOLLOW_UP' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = 'ACTIVE', 'ARCHIVED' },
  @{ Name = 'MeetingId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' }, @{ Name = 'ProjectId'; Type = 'Text' }
)

$risks = @(
  @{ Name = 'RiskId'; Type = 'Text' }, @{ Name = 'Description'; Type = 'Note' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = 'OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED' },
  @{ Name = 'Probability'; Type = 'Choice'; Choices = 'LOW', 'MEDIUM', 'HIGH' }, @{ Name = 'Impact'; Type = 'Choice'; Choices = 'LOW', 'MEDIUM', 'HIGH' },
  @{ Name = 'OwnerUPN'; Type = 'Text' }, @{ Name = 'Mitigation'; Type = 'Note' }, @{ Name = 'DueDate'; Type = 'Date' },
  @{ Name = 'ProjectId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' }, @{ Name = 'MeetingId'; Type = 'Text' }
)
$decisions = @(
  @{ Name = 'DecisionId'; Type = 'Text' }, @{ Name = 'Description'; Type = 'Note' }, @{ Name = 'Rationale'; Type = 'Note' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = 'PROPOSED', 'DECIDED', 'SUPERSEDED' },
  @{ Name = 'DecidedBy'; Type = 'Text' }, @{ Name = 'DecisionDate'; Type = 'Date' },
  @{ Name = 'ProjectId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' }, @{ Name = 'MeetingId'; Type = 'Text' }
)
$reviews = @(
  @{ Name = 'ReviewId'; Type = 'Text' }, @{ Name = 'ReviewType'; Type = 'Choice'; Choices = 'STATUS', 'RISK', 'FINANCIAL', 'CLOSURE' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = 'SCHEDULED', 'COMPLETED', 'CANCELLED' }, @{ Name = 'Health'; Type = 'Choice'; Choices = 'GREEN', 'AMBER', 'RED' },
  @{ Name = 'ReviewDate'; Type = 'Date' }, @{ Name = 'NextReviewDate'; Type = 'Date' }, @{ Name = 'Summary'; Type = 'Note' }, @{ Name = 'NextSteps'; Type = 'Note' },
  @{ Name = 'OwnerUPN'; Type = 'Text' }, @{ Name = 'ProjectId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' }
)
$lessons = @(
  @{ Name = 'LessonId'; Type = 'Text' }, @{ Name = 'Description'; Type = 'Note' }, @{ Name = 'Recommendation'; Type = 'Note' },
  @{ Name = 'Category'; Type = 'Choice'; Choices = 'PROCESS', 'TECHNOLOGY', 'PEOPLE', 'VENDOR', 'OTHER' },
  @{ Name = 'Status'; Type = 'Choice'; Choices = 'NEW', 'REVIEWED', 'APPLIED' }, @{ Name = 'OwnerUPN'; Type = 'Text' },
  @{ Name = 'ProjectId'; Type = 'Text' }, @{ Name = 'InitiativeId'; Type = 'Text' }, @{ Name = 'MeetingId'; Type = 'Text' }
)

# Same seven approval columns on the four main lists (see src/rules/approvals.ts).
$approval = @(
  @{ Name = 'ApprovalRule'; Type = 'Text' },
  @{ Name = 'ApprovalStatus'; Type = 'Choice'; Choices = 'NONE', 'PENDING', 'APPROVED', 'REJECTED' },
  @{ Name = 'Approver'; Type = 'Text' }, @{ Name = 'ApprovalRequestedOn'; Type = 'Date' }, @{ Name = 'ApprovalDecidedOn'; Type = 'Date' },
  @{ Name = 'ApprovalDecidedBy'; Type = 'Text' }, @{ Name = 'ApprovalComment'; Type = 'Note' }
)
$ideas += $approval
$initiatives += $approval
$projects += $approval
$actions += $approval

# ---------- create structure ----------
Write-Host 'Creating lists and columns...' -ForegroundColor Cyan
Initialize-ItsdmList -Title 'IT_01_Ideas'       -Fields $ideas
Initialize-ItsdmList -Title 'IT_02_Initiatives' -Fields $initiatives
Initialize-ItsdmList -Title 'IT_03_Projects'    -Fields $projects
Initialize-ItsdmList -Title 'IT_04_Actions'     -Fields $actions
Initialize-ItsdmList -Title 'IT_11_Risks'       -Fields $risks
Initialize-ItsdmList -Title 'IT_12_Decisions'   -Fields $decisions
Initialize-ItsdmList -Title 'IT_19_Reviews'     -Fields $reviews
Initialize-ItsdmList -Title 'IT_20_LessonsLearned' -Fields $lessons
Initialize-ItsdmList -Title 'IT_21_Meetings'    -Fields $meetings
Initialize-ItsdmList -Title 'IT_22_Notes'       -Fields $notes

# ---------- sample data ----------
if ($SkipSampleData) {
  Write-Host 'Sample data skipped.' -ForegroundColor Yellow
} else {
  Write-Host 'Adding sample data (only to empty lists)...' -ForegroundColor Cyan

  if ((Get-ListItemCount 'IT_01_Ideas') -eq 0) {
    $rows = @(
      @{ T = 'Automate new-joiner laptop provisioning'; Id = 'IDEA-DEMO-001'; S = 'NEW';        V = 40000;  D = 90; Tags = 'automation,onboarding' },
      @{ T = 'Self-service password reset portal';      Id = 'IDEA-DEMO-002'; S = 'DISCOVERY';  V = 25000;  D = 60; Tags = 'service-desk' },
      @{ T = 'Consolidate SaaS licences';               Id = 'IDEA-DEMO-003'; S = 'VALIDATED';  V = 120000; D = 45; Tags = 'cost,licences' },
      @{ T = 'Chatbot for first-line IT support';       Id = 'IDEA-DEMO-004'; S = 'PILOT';      V = 80000;  D = 30; Tags = 'ai,service-desk' },
      @{ T = 'On-premises file server migration';       Id = 'IDEA-DEMO-005'; S = 'REJECTED';   V = 15000;  D = 10; Tags = 'infrastructure' }
    )
    foreach ($r in $rows) {
      Add-PnPListItem -List 'IT_01_Ideas' -Values @{
        Title = $r.T; IdeaId = $r.Id; Description = "Sample idea: $($r.T)."; Status = $r.S
        OwnerUPN = $OwnerEmail; SponsorUPN = $OwnerEmail; EstimatedValue = $r.V
        TargetDate = (Get-DateValue $r.D); Tags = $r.Tags
      } | Out-Null
    }
    Write-Host '  5 sample ideas (one VALIDATED so you can try "Convert to Initiative")'
  }

  if ((Get-ListItemCount 'IT_02_Initiatives') -eq 0) {
    $rows = @(
      @{ T = 'Digital Workplace 2027'; Id = 'INIT-DEMO-001'; S = 'ACTIVE';  P = 55; D = 120 },
      @{ T = 'Cloud cost optimisation'; Id = 'INIT-DEMO-002'; S = 'BLOCKED'; P = 30; D = 75 },
      @{ T = 'Service desk modernisation'; Id = 'INIT-DEMO-003'; S = 'DRAFT'; P = 0; D = 150 }
    )
    foreach ($r in $rows) {
      Add-PnPListItem -List 'IT_02_Initiatives' -Values @{
        Title = $r.T; InitiativeId = $r.Id; Description = "Sample initiative: $($r.T)."; Status = $r.S
        OwnerUPN = $OwnerEmail; ProgressPct = $r.P; TargetDate = (Get-DateValue $r.D)
      } | Out-Null
    }
    Write-Host '  3 sample initiatives'
  }

  if ((Get-ListItemCount 'IT_03_Projects') -eq 0) {
    $rows = @(
      @{ T = 'Laptop refresh wave 1';   Id = 'PROJ-DEMO-001'; I = 'INIT-DEMO-001'; S = 'ACTIVE';   B = 200000; F = 205000; R = 'LOW';  Sd = -60; Ed = 60 },
      @{ T = 'Teams telephony rollout'; Id = 'PROJ-DEMO-002'; I = 'INIT-DEMO-001'; S = 'ACTIVE';   B = 100000; F = 128000; R = 'HIGH'; Sd = -30; Ed = 90 },
      @{ T = 'FinOps tooling';          Id = 'PROJ-DEMO-003'; I = 'INIT-DEMO-002'; S = 'PLANNING'; B = 50000;  F = 50000;  R = 'MEDIUM'; Sd = 15; Ed = 120 }
    )
    foreach ($r in $rows) {
      Add-PnPListItem -List 'IT_03_Projects' -Values @{
        Title = $r.T; ProjectId = $r.Id; InitiativeId = $r.I; Description = "Sample project: $($r.T)."; Status = $r.S
        OwnerUPN = $OwnerEmail; StartDate = (Get-DateValue $r.Sd); EndDate = (Get-DateValue $r.Ed)
        BudgetAmount = $r.B; ForecastAmount = $r.F; RiskLevel = $r.R
      } | Out-Null
    }
    Write-Host '  3 sample projects (one over budget by more than 10%, so it shows as at risk)'
  }

  if ((Get-ListItemCount 'IT_04_Actions') -eq 0) {
    $rows = @(
      @{ T = 'Send procurement request';    Id = 'ACT-DEMO-001'; S = 'OPEN';        P = 'HIGH';     D = -5; O = $OwnerEmail },
      @{ T = 'Review vendor contract';      Id = 'ACT-DEMO-002'; S = 'IN_PROGRESS'; P = 'CRITICAL'; D = -1; O = $OwnerEmail },
      @{ T = 'Prepare steering committee';  Id = 'ACT-DEMO-003'; S = 'OPEN';        P = 'MEDIUM';   D = 0;  O = $OwnerEmail },
      @{ T = 'Test telephony failover';     Id = 'ACT-DEMO-004'; S = 'OPEN';        P = 'HIGH';     D = 3;  O = $OwnerEmail },
      @{ T = 'Update risk register';        Id = 'ACT-DEMO-005'; S = 'BLOCKED';     P = 'MEDIUM';   D = 6;  O = $OwnerEmail },
      @{ T = 'Plan wave 2 logistics';       Id = 'ACT-DEMO-006'; S = 'OPEN';        P = 'LOW';      D = 21; O = $OwnerEmail },
      @{ T = 'Close wave 1 purchase order'; Id = 'ACT-DEMO-007'; S = 'DONE';        P = 'LOW';      D = -10; O = $OwnerEmail },
      @{ T = 'Colleague task (not mine)';   Id = 'ACT-DEMO-008'; S = 'OPEN';        P = 'MEDIUM';   D = -2; O = 'someone.else@example.com' }
    )
    foreach ($r in $rows) {
      $values = @{
        Title = $r.T; ActionId = $r.Id; Description = "Sample action: $($r.T)."; Status = $r.S
        Priority = $r.P; OwnerUPN = $r.O; DueDate = (Get-DateValue $r.D)
      }
      if ($r.S -eq 'DONE') { $values.CompletedDate = (Get-DateValue ($r.D + 1)) }
      Add-PnPListItem -List 'IT_04_Actions' -Values $values | Out-Null
    }
    Write-Host '  8 sample actions (overdue, due today, this week, later, done and someone else''s)'
  }
}

Write-Host ''
Write-Host 'Done. Refresh the page with the IT Management Hub web part.' -ForegroundColor Green
