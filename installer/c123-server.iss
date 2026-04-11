; Inno Setup script for C123 Server
; ==================================
;
; Build via: npm run build:installer:local
;
; The payload at build-output/ is produced by
; scripts/prepare-installer-payload.js and contains everything we ship:
; portable Node.js runtime, compiled app, production node_modules, docs.
;
; This script:
;   1. Installs files to {autopf}\C123 Server
;   2. Adds a Windows Firewall rule for TCP/27123
;   3. Registers the Windows service by calling our own CLI
;      ({app}\runtime\node.exe {app}\app\dist\cli.js install) — this reuses
;      the existing WindowsService implementation in src/service/.
;   4. On uninstall: stops + uninstalls the service and removes the firewall
;      rule BEFORE files are deleted (order matters).
;
; User settings in %APPDATA%\c123-server\ are NEVER touched.

#include "iss-defines.iss"

#define AppName       "C123 Server"
#define AppPublisher  "Open Canoe Timing"
#define AppURL        "https://github.com/OpenCanoeTiming/c123-server"
; ServiceName is the DISPLAY name visible in services.msc.
; ServiceId is the ACTUAL service identifier used by sc.exe, the registry,
; and Get-Service. node-windows derives the id from the name as:
;   name.replace(/[^\w]/gi, '').toLowerCase() + '.exe'
; So "C123Server" → "c123server.exe". If ServiceName ever changes in
; src/service/windows-service.ts, update ServiceId here accordingly.
#define ServiceName   "C123Server"
#define ServiceId     "c123server.exe"
#define ServerPort    "27123"
#define FirewallRule  "C123 Server"

[Setup]
; Stable GUID — never change after first release or upgrades will break.
AppId={{B5C9F3E1-7A2D-4B5E-9F8C-1A3B4D5E6F7A}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/issues
AppUpdatesURL={#AppURL}/releases
VersionInfoVersion={#AppVersion}
; BuildCommit is injected by scripts/prepare-installer-payload.js — surfacing
; it in the installer's file properties makes field debugging straightforward
; ("what commit produced this setup.exe?" answerable via right-click → details).
VersionInfoDescription={#AppName} installer (build {#BuildCommit})
VersionInfoCopyright=Copyright (C) 2025-2026 {#AppPublisher}

DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
AllowNoIcons=yes

PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Prevent two installer instances from racing on the service/firewall.
SetupMutex=C123ServerSetupMutex
; We deliberately do NOT set `CloseApplications=force`. Forcing Inno Setup to
; kill processes holding files in {app} would SIGKILL the running service
; mid-write. Instead, PrepareToInstall stops + uninstalls the service cleanly
; and waits for it to fully exit before files are overwritten.
CloseApplications=no

; Compress hard — node.exe is ~70 MB and compresses well.
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

OutputDir=Output
OutputBaseFilename=c123-server-setup-{#AppVersion}
WizardStyle=modern
ShowLanguageDialog=auto

LicenseFile=..\build-output\LICENSE
InfoAfterFile=..\build-output\README.txt

; Uninstaller polish
UninstallDisplayName={#AppName} {#AppVersion}
UninstallDisplayIcon={app}\runtime\node.exe

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\build-output\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build-output\app\*";     DestDir: "{app}\app";     Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build-output\LICENSE";   DestDir: "{app}";         Flags: ignoreversion
Source: "..\build-output\README.txt"; DestDir: "{app}";        Flags: ignoreversion
; Tray monitor launcher (see docs/DEPLOYMENT.md "System tray icon" section).
; Shipped from installer/ directly — not part of the build-output payload
; because it's a small hand-maintained script, not a build artefact.
Source: "tray-launcher.vbs";          DestDir: "{app}";         Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName} Dashboard"; Filename: "http://localhost:{#ServerPort}"
Name: "{group}\{#AppName} README"; Filename: "{app}\README.txt"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; User-session tray monitor: Inno Setup drops a shortcut in the current
; user's Startup folder so the tray icon auto-starts at each login in the
; operator's interactive session (Session 0 services cannot show tray icons,
; see issue #69).
;
; Target is wscript.exe + tray-launcher.vbs — NOT node.exe directly — to
; avoid a console-window flash every time Windows runs the shortcut.
Name: "{userstartup}\{#AppName} Tray"; Filename: "{sys}\wscript.exe"; \
  Parameters: """{app}\tray-launcher.vbs"""; \
  WorkingDir: "{app}"; \
  IconFilename: "{app}\runtime\node.exe"; \
  Comment: "C123 Server tray monitor (polls the installed service)"

[Run]
; 1. Delete any stale firewall rule with the same name. `netsh add rule` is
;    NOT idempotent — it appends a duplicate on every upgrade. Deleting first
;    keeps the rule set clean across many upgrades. Non-zero exit when no
;    such rule exists is harmless — [Run] entries don't abort on exit code.
Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall delete rule name=""{#FirewallRule}"""; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Refreshing Windows Firewall rule..."

; 2. Open firewall port for incoming scoreboard/admin connections.
;    Profile scoping is intentionally broad — OT networks during race events
;    are assumed trusted and often classified by Windows as Public.
Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall add rule name=""{#FirewallRule}"" dir=in action=allow protocol=TCP localport={#ServerPort}"; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Configuring Windows Firewall..."

; 3. Register the Windows service happens in [Code] CurStepChanged(ssPostInstall)
;    — NOT here — so we can capture and act on the cli.js exit code. A plain
;    [Run] entry swallows failures, which we explicitly do not want for the
;    service-install step.

; 4. Optional: open the admin dashboard in the default browser after install.
Filename: "http://localhost:{#ServerPort}"; \
  Description: "Open {#AppName} dashboard in browser"; \
  Flags: postinstall shellexec nowait skipifsilent unchecked

[UninstallRun]
; Stop + uninstall service BEFORE files are removed. Order matters.
Filename: "{app}\runtime\node.exe"; \
  Parameters: """{app}\app\dist\cli.js"" stop"; \
  WorkingDir: "{app}\app"; \
  Flags: runhidden waituntilterminated; \
  RunOnceId: "StopC123Server"

Filename: "{app}\runtime\node.exe"; \
  Parameters: """{app}\app\dist\cli.js"" uninstall"; \
  WorkingDir: "{app}\app"; \
  Flags: runhidden waituntilterminated; \
  RunOnceId: "UninstallC123Server"

Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall delete rule name=""{#FirewallRule}"""; \
  Flags: runhidden waituntilterminated; \
  RunOnceId: "DelFirewallRule"

[Code]
// Helper: check if a Windows service is registered.
//
// We query the registry directly at HKLM\SYSTEM\CurrentControlSet\Services\<Id>
// rather than shelling out to sc.exe, because:
//   1. Registry writes by Windows SCM are atomic — no timing windows.
//   2. No process spawn — immediate, can't time out.
//   3. No WoW64 redirection issues — HKLM\SYSTEM is shared across views.
//   4. Reliable regardless of Inno Setup install mode (64-bit vs 32-bit).
//
// Important: ServiceId must be the actual service name (as seen by sc.exe),
// NOT the display name. For c123-server that is "c123server.exe", not
// "C123Server" — see the ServiceId define at the top of this script.
//
// Prior version used "sc query C123Server" which always failed because
// node-windows registers the service as "c123server.exe" (with id-mangling)
// while "C123Server" is only the display name.
function IsServiceInstalled(ServiceId: string): Boolean;
begin
  Result := RegKeyExists(HKEY_LOCAL_MACHINE,
    'SYSTEM\CurrentControlSet\Services\' + ServiceId);
end;

// Check if the service's current state is STOPPED.
//
// `sc.exe stop` returns as soon as the stop control has been POSTED to SCM —
// the actual transition to STOPPED happens asynchronously after the process
// exits. The previous Sleep(2000) was just a hopeful guess. This helper lets
// us poll the real state.
//
// Strategy: `cmd /c sc query <id> | findstr /C:"STOPPED" >nul` returns
// exit 0 iff "STOPPED" appears in the output. Exec() gives us that exit
// code directly — no output parsing needed.
function IsServiceStopped(ServiceId: string): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{cmd}'),
    '/c sc query ' + ServiceId + ' | findstr /C:"STOPPED" >nul',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function WaitForServiceStopped(ServiceId: string; TimeoutMs: Integer): Boolean;
var
  Elapsed: Integer;
begin
  Result := IsServiceStopped(ServiceId);
  Elapsed := 0;
  while (not Result) and (Elapsed < TimeoutMs) do
  begin
    Sleep(500);
    Elapsed := Elapsed + 500;
    Result := IsServiceStopped(ServiceId);
  end;
end;

function WaitForServiceRemoved(ServiceId: string; TimeoutMs: Integer): Boolean;
var
  Elapsed: Integer;
begin
  Result := not IsServiceInstalled(ServiceId);
  Elapsed := 0;
  while (not Result) and (Elapsed < TimeoutMs) do
  begin
    Sleep(500);
    Elapsed := Elapsed + 500;
    Result := not IsServiceInstalled(ServiceId);
  end;
end;

// Wait up to TimeoutMs for the service to appear in the registry.
// node-windows emits its 'install' event slightly before the registry key
// is fully committed in some scenarios, so a short retry loop removes
// any remaining race condition between install and CurStepChanged.
function WaitForServiceInstalled(ServiceId: string; TimeoutMs: Integer): Boolean;
var
  Elapsed: Integer;
begin
  Result := IsServiceInstalled(ServiceId);
  Elapsed := 0;
  while (not Result) and (Elapsed < TimeoutMs) do
  begin
    Sleep(500);
    Elapsed := Elapsed + 500;
    Result := IsServiceInstalled(ServiceId);
  end;
end;

// Run the bundled CLI with a single subcommand and return its exit code.
// Always uses the bundled {app}\runtime\node.exe so the service XML
// generated by node-windows (which captures process.execPath) is bound to
// the installed runtime, not whatever node happens to be on PATH.
function RunCli(Subcommand: string): Integer;
var
  AppPath: string;
  ResultCode: Integer;
begin
  AppPath := ExpandConstant('{app}');
  if not Exec(AppPath + '\runtime\node.exe',
    '"' + AppPath + '\app\dist\cli.js" ' + Subcommand,
    AppPath + '\app', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    // Exec itself failed (e.g. node.exe missing). Treat as non-zero exit.
    Result := -1;
    Exit;
  end;
  Result := ResultCode;
end;

// Before installing, if an older C123 Server service exists, take it down
// cleanly and completely:
//   1. stop — ask SCM to stop it
//   2. wait for STOPPED — ensures node.exe has actually exited and released
//      file locks in {app}
//   3. uninstall — remove the service registration so the new install step
//      always creates a fresh service XML pointing at the newly staged
//      bundled node.exe (node-windows install rejects with "alreadyinstalled"
//      if we skip this).
// If any step fails we abort with a clear message — better than proceeding
// with half-stopped state and getting cryptic "file in use" errors later.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  StopExitCode: Integer;
  UninstallExitCode: Integer;
begin
  Result := '';
  NeedsRestart := False;

  if not IsServiceInstalled('{#ServiceId}') then
    Exit;

  Log('Upgrade path: existing {#ServiceName} service detected, taking it down before overwriting files.');

  // 1. Request stop.
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop {#ServiceId}',
    '', SW_HIDE, ewWaitUntilTerminated, StopExitCode);
  // Exit codes: 0 = stop accepted, 1062 = already stopped. Both fine.

  // 2. Wait for the service to actually reach STOPPED state (15 s budget).
  if not WaitForServiceStopped('{#ServiceId}', 15000) then
  begin
    Result := 'The existing C123 Server service did not stop within 15 seconds. ' +
      'Please stop it manually (services.msc → C123Server → Stop) and run Setup again.';
    Exit;
  end;

  // 3. Uninstall via our own CLI so node-windows cleans up daemon files too.
  UninstallExitCode := RunCli('uninstall');
  if UninstallExitCode <> 0 then
  begin
    Result := 'Failed to uninstall the existing C123 Server service (exit code ' +
      IntToStr(UninstallExitCode) + '). ' +
      'You may need to remove it manually before upgrading: sc.exe delete {#ServiceId}';
    Exit;
  end;

  // 4. Wait for registry entry to disappear (10 s budget).
  if not WaitForServiceRemoved('{#ServiceId}', 10000) then
  begin
    Result := 'The existing C123 Server service was uninstalled but its registry ' +
      'entry is still present after 10 seconds. This is unusual — please reboot and retry.';
    Exit;
  end;

  Log('Existing service removed successfully, proceeding with install.');
end;

// Smoke test: verify the newly registered service references a binary
// inside the install directory. If node-windows ever captures the wrong
// node.exe path (e.g. the user's system Node instead of our bundled one),
// ImagePath will point outside {app}\app — catch that before the user runs
// into mysterious runtime failures.
function ImagePathReferencesAppDir(ServiceId: string): Boolean;
var
  ImagePath: string;
  AppDir: string;
begin
  Result := False;
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE,
    'SYSTEM\CurrentControlSet\Services\' + ServiceId,
    'ImagePath', ImagePath) then
    Exit;

  // Case-insensitive substring check. Pascal's Pos is case-sensitive, so
  // lowercase both sides first. Keep the raw ImagePath for logging.
  AppDir := ExpandConstant('{app}');
  Log('Service ImagePath = ' + ImagePath);
  Log('Expected to contain {app} = ' + AppDir);
  Result := Pos(Lowercase(AppDir), Lowercase(ImagePath)) > 0;
end;

// After files are copied, register the service via our CLI and capture the
// exit code. This runs as a [Code] step (not a [Run] entry) specifically so
// we can act on failure: abort the install with a clear message instead of
// silently leaving a broken deployment on disk.
procedure CurStepChanged(CurStep: TSetupStep);
var
  InstallExitCode: Integer;
begin
  if CurStep <> ssPostInstall then
    Exit;

  WizardForm.StatusLabel.Caption := 'Registering Windows service...';
  InstallExitCode := RunCli('install');
  if InstallExitCode <> 0 then
  begin
    MsgBox('Setup failed to register the ' + '{#ServiceName}' +
      ' Windows service (cli.js install exited with code ' +
      IntToStr(InstallExitCode) + ').'#13#10#13#10 +
      'The installation will be rolled back. See docs/DEPLOYMENT.md for ' +
      'troubleshooting, or run this from an elevated command prompt to ' +
      'reproduce the error:'#13#10#13#10 +
      ExpandConstant('"{app}\runtime\node.exe" "{app}\app\dist\cli.js" install'),
      mbCriticalError, MB_OK);
    Abort;
  end;

  if not WaitForServiceInstalled('{#ServiceId}', 5000) then
  begin
    MsgBox('Setup registered the ' + '{#ServiceName}' +
      ' service successfully but it did not appear in the registry within 5 seconds.'#13#10#13#10 +
      'You can try registering it manually from an elevated command prompt:'#13#10#13#10 +
      ExpandConstant('"{app}\runtime\node.exe" "{app}\app\dist\cli.js" install'),
      mbInformation, MB_OK);
    Exit;
  end;

  // Smoke test: the service's ImagePath must reference the install dir.
  // Anything else means node-windows captured the wrong node.exe path
  // during install — guaranteed broken at service start time.
  if not ImagePathReferencesAppDir('{#ServiceId}') then
  begin
    MsgBox('Warning: the ' + '{#ServiceName}' +
      ' service was registered but its ImagePath does not reference ' +
      ExpandConstant('{app}') + '.'#13#10#13#10 +
      'The service will likely fail to start. See Event Viewer → Application ' +
      'for details, or reinstall after removing any leftover service state ' +
      '(sc.exe delete {#ServiceId}).',
      mbError, MB_OK);
  end;
end;
