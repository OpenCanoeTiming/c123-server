# Deployment guide

End-user installation, upgrade, uninstall and troubleshooting for C123 Server on Windows.

## Quick install

1. Go to [Releases](https://github.com/OpenCanoeTiming/c123-server/releases/latest).
2. Download `c123-server-setup-x.y.z.exe`.
3. Double-click the installer. Windows will show a UAC prompt — accept it.
4. Walk through the wizard (defaults are fine).
5. After installation the admin dashboard opens at <http://localhost:27123>.

The installer does the following automatically:

- Copies files to `C:\Program Files\C123 Server\` (portable Node.js runtime + compiled app + production dependencies).
- Adds a Windows Firewall rule for incoming TCP connections on port 27123 so scoreboards on the local network can connect.
- Registers the Windows service `C123Server` (starts automatically on boot, restarts on crash).
- Creates Start Menu shortcuts.

## What gets installed where

| Path | Contents |
|---|---|
| `C:\Program Files\C123 Server\runtime\node.exe` | Portable Node.js 20 runtime. Bundled with the installer so the app never depends on the user's own Node.js installation. |
| `C:\Program Files\C123 Server\app\` | Compiled c123-server application + production `node_modules`. |
| `C:\Program Files\C123 Server\unins000.exe` | Uninstaller. |
| `%APPDATA%\c123-server\settings.json` | Your settings (XML path, event name override, client configs, Live-Mini connection). **Preserved across upgrades and uninstall.** |

## Service management

The Windows service is the main process. It runs in the background without any visible window, even when no user is logged in.

> **Note on naming:** The service has **two names**.
> * **Display name:** `C123Server` — what you see in `services.msc` and `Get-Service`.
> * **Service ID:** `c123server.exe` — what `sc.exe` and the registry use.
>
> This split comes from `node-windows`, which derives the service id from the display name by stripping non-word characters, lowercasing, and appending `.exe`. Both names refer to the same service — use the service id with `sc.exe` commands.

```powershell
# Check status
sc.exe query c123server.exe

# Start / stop manually
sc.exe start c123server.exe
sc.exe stop c123server.exe

# Services MMC snap-in
services.msc
# → find "C123Server" in the list
```

The service runs as `Local System` by default. Startup type is **Automatic**.

On crash, Windows Service Control Manager restarts the service automatically (3 attempts with exponential backoff — configured by `node-windows`).

## Upgrading

To install a newer version over an existing installation:

1. Download the new installer.
2. Run it. The installer automatically stops the running `C123Server` service before overwriting files, then re-registers it.
3. Your settings in `%APPDATA%\c123-server\settings.json` are untouched.

No need to uninstall first. The admin UI shows a banner when a new version is published on GitHub (the check runs hourly against the GitHub Releases API).

### Disabling the update check

On closed networks without outbound access to `api.github.com`, add `"updateCheck": false` to `%APPDATA%\c123-server\settings.json`:

```json
{
  "updateCheck": false,
  ...other settings...
}
```

## Uninstalling

**Settings → Apps → C123 Server → Uninstall**, or from the classic Control Panel, or run `C:\Program Files\C123 Server\unins000.exe`.

The uninstaller:

1. Stops the `C123Server` service.
2. Unregisters the service.
3. Removes the Windows Firewall rule.
4. Deletes `C:\Program Files\C123 Server\`.

**Your settings in `%APPDATA%\c123-server\` are NOT deleted.** If you really want a clean wipe, remove that folder manually after uninstall.

## Troubleshooting

### Admin dashboard does not open / `http://localhost:27123` returns connection refused

Check that the service is running:

```powershell
sc.exe query c123server.exe
```

If `STATE` is not `RUNNING`:

```powershell
sc.exe start c123server.exe
```

If that fails, check the Event Viewer: **Windows Logs → Application**, filter for source `C123Server`. Common causes:

- Port 27123 already in use by another process (`netstat -ano | findstr :27123`).
- Firewall or antivirus blocking `node.exe`.
- XML source path unreachable (should only affect data, not the service).

### SmartScreen warning "Windows protected your PC"

The installer is not code-signed yet. This is a known limitation and we'll look at adding a signing certificate in a future release. In the meantime:

1. Click **More info**.
2. Click **Run anyway**.

The installer source is open, so you can audit it at [github.com/OpenCanoeTiming/c123-server/tree/main/installer](https://github.com/OpenCanoeTiming/c123-server/tree/main/installer) if you want to verify before running.

### "The C123Server service could not be registered automatically"

Shown as a popup at the end of installation. The installer copied files successfully but the post-install service registration step failed. You can register the service manually from an **elevated** command prompt:

```cmd
"C:\Program Files\C123 Server\runtime\node.exe" "C:\Program Files\C123 Server\app\dist\cli.js" install
```

If that works, you're done. If it still fails, open an issue with the output.

### System tray icon

The installer ships a **tray monitor** — a lightweight user-session process that polls the installed service over HTTP and reflects its state in the tray icon (green = all good, yellow = a data source is reconnecting, red = server unreachable). Right-click gives you "Open Dashboard" and "Quit".

The monitor is installed as a shortcut in your user Startup folder (`shell:startup`) and auto-starts at every login. The shortcut target is `wscript.exe %ProgramFiles%\C123 Server\tray-launcher.vbs`, which in turn spawns `node.exe cli.js tray` with no console window.

#### Why a separate process?

The service itself runs in *Session 0* — an isolated, non-interactive session that cannot show tray icons (a Windows Vista-era security boundary). `systray2` would silently fail there. The monitor is a second process that lives in *your* interactive session and talks to the service only over `http://localhost:27123/api/status`. No IPC, no event-bus coupling, just HTTP polling every 3 seconds.

#### Disabling or moving the tray

- **Disable for one user:** delete the `C123 Server Tray` shortcut from `shell:startup` (press <kbd>Win</kbd>+<kbd>R</kbd>, type `shell:startup`, delete the shortcut).
- **Disable for all users:** not installed for all users by default — the shortcut is per-user only.
- **Stop the running tray:** right-click the icon → *Quit*. It will come back at the next login unless you also delete the shortcut.

#### Debugging a missing tray icon

If no icon appears after login, the most common causes are (a) `wscript.exe` is blocked by a security policy, (b) `systray2`'s bundled Go binary is missing or quarantined by AV, or (c) the service on port 27123 is unreachable. To see the actual error, run the tray manually from a command prompt so its stderr is visible:

```cmd
"C:\Program Files\C123 Server\runtime\node.exe" "C:\Program Files\C123 Server\app\dist\cli.js" tray
```

Add `--debug` for verbose logging. If the tray launches but immediately turns red, the service is the problem — check `sc.exe query c123server.exe`.

#### Running the tray manually against a non-default port

If you changed the server port in `%APPDATA%\c123-server\settings.json`, the bundled Startup shortcut still polls the default `27123` and will go red. Either (a) revert the port, or (b) replace the shortcut target with:

```cmd
"C:\Program Files\C123 Server\runtime\node.exe" "C:\Program Files\C123 Server\app\dist\cli.js" tray --target-url http://localhost:28000
```

— substituting your actual port.

### Scoreboards on the LAN cannot connect

The installer adds a firewall rule, but some third-party firewalls / endpoint protection suites ignore Windows Firewall rules and add their own. Check your security software and allow inbound TCP/27123 for `node.exe`.

### Upgrade failed, service stuck in "stopping" state

Rare, but can happen if a scoreboard client holds the WebSocket open during the stop. Hard-kill the service and retry:

```powershell
sc.exe queryex c123server.exe | findstr PID
# Note the PID, then:
taskkill /F /PID <pid>
sc.exe start c123server.exe
```

### Uninstalling leaves a stale `C123Server` service

If the uninstaller fails mid-way (e.g. because the service is locked), remove the service manually:

```powershell
sc.exe stop c123server.exe
sc.exe delete c123server.exe
```

Then delete `C:\Program Files\C123 Server\` by hand.

## Running without the installer (advanced)

Developers can skip the installer and run from source — see the main [README.md](../README.md#installation-from-source-for-developers).

The bundled installer is Windows-only. For Linux or macOS deployments, build from source and run `npm start` or `node dist/cli.js run` directly. The Windows service commands (`install` / `uninstall` / `start` / `stop`) require `node-windows` which only works on Windows.

## Reporting issues

- Issues: <https://github.com/OpenCanoeTiming/c123-server/issues>
- When reporting installer problems, include:
  - Installer version (visible in the filename)
  - Output of `sc.exe query c123server.exe`
  - Relevant Event Viewer entries (Application log, filter by source `C123Server`)
  - Content of `%APPDATA%\c123-server\settings.json` (redact any API keys first)
