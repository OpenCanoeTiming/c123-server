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
#define ServiceName   "C123Server"
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
VersionInfoDescription={#AppName} installer
VersionInfoCopyright=Copyright (C) 2025 {#AppPublisher}

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
CloseApplications=force

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

[Icons]
Name: "{group}\{#AppName} Dashboard"; Filename: "http://localhost:{#ServerPort}"
Name: "{group}\{#AppName} README"; Filename: "{app}\README.txt"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Run]
; 1. Open firewall port for incoming scoreboard/admin connections.
Filename: "{sys}\netsh.exe"; \
  Parameters: "advfirewall firewall add rule name=""{#FirewallRule}"" dir=in action=allow protocol=TCP localport={#ServerPort}"; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Configuring Windows Firewall..."

; 2. Register the Windows service. node-windows captures the absolute path of
;    the node.exe used here into the service XML — that is exactly why we call
;    the bundled {app}\runtime\node.exe explicitly. WorkingDir sets the cwd
;    that the service will run in.
Filename: "{app}\runtime\node.exe"; \
  Parameters: """{app}\app\dist\cli.js"" install"; \
  WorkingDir: "{app}\app"; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Registering Windows service..."

; 3. Optional: open the admin dashboard in the default browser after install.
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
// Helper: check if a Windows service exists and is queryable via sc.exe.
// Returns True if `sc query <name>` exits with code 0.
function IsServiceInstalled(ServiceName: string): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{sys}\sc.exe'), 'query ' + ServiceName,
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Before installing, if an older C123 Server is already installed as a service,
// stop it so that files in the install directory are no longer locked and can
// be overwritten. We do NOT uninstall the service here — the new [Run] step
// will re-register it with the freshly installed binary.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';
  NeedsRestart := False;

  if IsServiceInstalled('{#ServiceName}') then
  begin
    Log('Stopping existing {#ServiceName} service before upgrade...');
    Exec(ExpandConstant('{sys}\sc.exe'), 'stop {#ServiceName}',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(2000);
  end;
end;

// After the post-install [Run] step has completed, verify the service is
// actually registered. If not, warn the user — typically means node-windows
// or sc.exe failed for some reason (see Event Viewer > Application logs).
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if not IsServiceInstalled('{#ServiceName}') then
    begin
      MsgBox('Warning: The ' + '{#ServiceName}' +
        ' Windows service could not be registered automatically.'#13#10#13#10 +
        'You can try registering it manually by running this from an elevated command prompt:'#13#10#13#10 +
        ExpandConstant('"{app}\runtime\node.exe" "{app}\app\dist\cli.js" install'),
        mbInformation, MB_OK);
    end;
  end;
end;
