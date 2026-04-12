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
;   3. Creates a Start Menu shortcut (launched via wscript.exe launcher.vbs
;      to avoid a console-window flash)
;   4. Sets AUMID on the shortcut for WinRT toast notifications
;   5. On upgrade: migrates away from old Windows service if present
;   6. On uninstall: removes firewall rule, deletes files
;
; User settings in %APPDATA%\c123-server\ are NEVER touched.

#include "iss-defines.iss"

#define AppName       "C123 Server"
#define AppPublisher  "Open Canoe Timing"
#define AppURL        "https://github.com/OpenCanoeTiming/c123-server"
#define ServerPort    "27123"
#define FirewallRule  "C123 Server"
; AUMID must match the constant in src/tray/NotificationManager.ts
#define AUMID         "OpenCanoeTiming.C123Server"
; Legacy service ID — only used by migration code in PrepareToInstall.
; Remove after a few releases when all users have upgraded.
#define LegacyServiceId "c123server.exe"

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

; Prevent two installer instances from racing on the firewall.
SetupMutex=C123ServerSetupMutex
; Let Inno Setup's restart manager detect and close a running instance.
CloseApplications=yes

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
UninstallDisplayIcon={app}\c123-server.ico

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\build-output\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build-output\app\*";     DestDir: "{app}\app";     Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build-output\LICENSE";   DestDir: "{app}";         Flags: ignoreversion
Source: "..\build-output\README.txt"; DestDir: "{app}";        Flags: ignoreversion
Source: "launcher.vbs";               DestDir: "{app}";        Flags: ignoreversion
Source: "c123-server.ico";            DestDir: "{app}";        Flags: ignoreversion

[InstallDelete]
; Migration: remove old files from the service-based architecture
Type: files; Name: "{app}\tray-launcher.vbs"
; Remove old Startup shortcut for standalone tray monitor
Type: files; Name: "{userstartup}\{#AppName} Tray.lnk"

[Icons]
; Start Menu: launch the server (tray icon appears, no console window)
Name: "{group}\{#AppName}"; Filename: "{sys}\wscript.exe"; \
  Parameters: """{app}\launcher.vbs"""; \
  WorkingDir: "{app}"; \
  IconFilename: "{app}\c123-server.ico"; \
  Comment: "Start C123 Server"
Name: "{group}\{#AppName} Dashboard"; Filename: "http://localhost:{#ServerPort}"
Name: "{group}\{#AppName} README"; Filename: "{app}\README.txt"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Run]
; 1. Delete any stale firewall rule with the same name. `netsh add rule` is
;    NOT idempotent — it appends a duplicate on every upgrade. Deleting first
;    keeps the rule set clean across many upgrades.
Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall delete rule name=""{#FirewallRule}"""; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Refreshing Windows Firewall rule..."

; 2. Open firewall port for incoming scoreboard/admin connections.
Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall add rule name=""{#FirewallRule}"" dir=in action=allow protocol=TCP localport={#ServerPort}"; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Configuring Windows Firewall..."

; 3. Start the server now (optional, post-install)
Filename: "{sys}\wscript.exe"; \
  Parameters: """{app}\launcher.vbs"""; \
  WorkingDir: "{app}"; \
  Description: "Start {#AppName} now"; \
  Flags: postinstall nowait skipifsilent

; 4. Open the admin dashboard in the default browser after install.
Filename: "http://localhost:{#ServerPort}"; \
  Description: "Open {#AppName} dashboard in browser"; \
  Flags: postinstall shellexec nowait skipifsilent unchecked

[UninstallRun]
; Remove firewall rule before files are deleted.
Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall delete rule name=""{#FirewallRule}"""; \
  Flags: runhidden waituntilterminated; \
  RunOnceId: "DelFirewallRule"

[Code]
// ====================================================================
// Legacy service migration (remove after a few releases)
// ====================================================================
//
// Users upgrading from the service-based version (pre-v0.2) will have
// a registered Windows service "c123server.exe". We need to stop it,
// uninstall it, and clean up before proceeding with the new install.

function IsServiceInstalled(ServiceId: string): Boolean;
begin
  Result := RegKeyExists(HKEY_LOCAL_MACHINE,
    'SYSTEM\CurrentControlSet\Services\' + ServiceId);
end;

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
    Result := -1;
    Exit;
  end;
  Result := ResultCode;
end;

// Kill any running C123 Server process launched via launcher.vbs.
// Uses PowerShell Get-CimInstance to target only our specific process,
// not all node.exe instances. Avoids deprecated wmic.exe (removed in
// Windows 11 24H2).
procedure KillRunningServer;
var
  ResultCode: Integer;
begin
  Exec('powershell.exe',
    '-NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like ''*cli.js*'' -and $_.CommandLine -like ''*c123*'' } | Invoke-CimMethod -MethodName Terminate | Out-Null"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  StopExitCode: Integer;
  UninstallExitCode: Integer;
begin
  Result := '';
  NeedsRestart := False;

  // Kill any running user-session server (from a previous tray-app install)
  KillRunningServer;

  // Legacy migration: remove old Windows service if present
  if not IsServiceInstalled('{#LegacyServiceId}') then
    Exit;

  Log('Upgrade path: legacy service detected, migrating to tray app.');

  // 1. Request stop.
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop {#LegacyServiceId}',
    '', SW_HIDE, ewWaitUntilTerminated, StopExitCode);

  // 2. Wait for STOPPED (15 s budget).
  if not WaitForServiceStopped('{#LegacyServiceId}', 15000) then
  begin
    Result := 'The legacy C123 Server service did not stop within 15 seconds. ' +
      'Please stop it manually (services.msc) and run Setup again.';
    Exit;
  end;

  // 3. Uninstall via CLI.
  UninstallExitCode := RunCli('uninstall');
  if UninstallExitCode <> 0 then
  begin
    Result := 'Failed to uninstall the legacy C123 Server service (exit code ' +
      IntToStr(UninstallExitCode) + '). ' +
      'You may need to remove it manually: sc.exe delete {#LegacyServiceId}';
    Exit;
  end;

  // 4. Wait for registry cleanup (10 s budget).
  if not WaitForServiceRemoved('{#LegacyServiceId}', 10000) then
  begin
    Result := 'The legacy service was uninstalled but its registry entry persists. ' +
      'Please reboot and retry.';
    Exit;
  end;

  Log('Legacy service removed successfully.');
end;

// After files are copied, set the AUMID on the Start Menu shortcut
// so WinRT toast notifications show under the correct app identity.
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  LnkPath: string;
  PsCmd: string;
begin
  if CurStep <> ssPostInstall then
    Exit;

  WizardForm.StatusLabel.Caption := 'Configuring notifications...';

  // The shortcut was created by [Icons] as "{group}\C123 Server.lnk".
  LnkPath := ExpandConstant('{group}\{#AppName}.lnk');

  // Set System.AppUserModel.ID via PowerShell IPropertyStore COM interop.
  // This is the standard way to stamp an AUMID on an existing .lnk file.
  PsCmd := '-NoProfile -NonInteractive -Command "' +
    'try { ' +
    '$source = @''' + #13#10 +
    'using System; using System.Runtime.InteropServices; using System.Runtime.InteropServices.ComTypes;' + #13#10 +
    '[ComImport, Guid(""""00021401-0000-0000-C000-000000000046"""")] class ShellLink {}' + #13#10 +
    '[ComImport, Guid(""""886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99""""), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IPropertyStore {' + #13#10 +
    '  int GetCount(out uint c); int GetAt(uint i, out Guid k);' + #13#10 +
    '  int GetValue(ref Guid key, out PropVariant v); int SetValue(ref Guid key, ref PropVariant v); int Commit(); }' + #13#10 +
    '[StructLayout(LayoutKind.Sequential)] struct PropVariant { public ushort vt; ushort r1,r2,r3; public IntPtr data; }' + #13#10 +
    '''@' + #13#10 +
    'Add-Type -TypeDefinition $source -PassThru | Out-Null;' +
    '$lnk = New-Object ShellLink;' +
    '($lnk -as [IPersistFile]).Load(''''' + LnkPath + ''''', 0);' +
    '$ps = $lnk -as [IPropertyStore];' +
    '$k = New-Object Guid ''''9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3'''';' +
    '$v = New-Object PropVariant; $v.vt = 31;' +
    '$v.data = [Marshal]::StringToCoTaskMemUni(''''OpenCanoeTiming.C123Server'''');' +
    '$ps.SetValue([ref]$k, [ref]$v); $ps.Commit();' +
    '($lnk -as [IPersistFile]).Save(''''' + LnkPath + ''''', $true);' +
    '[Marshal]::FreeCoTaskMem($v.data);' +
    '} catch { exit 0 }"';

  Exec('powershell.exe', PsCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  // Non-fatal: if AUMID stamping fails, notifications fall back to balloon tooltips.
  if ResultCode <> 0 then
    Log('AUMID stamping returned exit code ' + IntToStr(ResultCode) + ' — toast notifications will use balloon fallback.');
end;
