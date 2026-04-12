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
- Creates a Start Menu shortcut with a system tray icon.

## What gets installed where

| Path | Contents |
|---|---|
| `C:\Program Files\C123 Server\runtime\node.exe` | Portable Node.js 20 runtime. Bundled with the installer so the app never depends on the user's own Node.js installation. |
| `C:\Program Files\C123 Server\app\` | Compiled c123-server application + production `node_modules`. |
| `C:\Program Files\C123 Server\launcher.vbs` | Hidden launcher — starts the server without a console window. |
| `C:\Program Files\C123 Server\unins000.exe` | Uninstaller. |
| `%APPDATA%\c123-server\settings.json` | Your settings (XML path, event name override, client configs, Live-Mini connection). **Preserved across upgrades and uninstall.** |

## Running and stopping

C123 Server runs as a **tray application** in the user's session — like Canoe123 itself, you start it before a race and close it when done.

### Starting

- **Start Menu:** Click **C123 Server** in the Start Menu. A tray icon appears in the system tray (notification area).
- **Command line:** `"C:\Program Files\C123 Server\runtime\node.exe" "C:\Program Files\C123 Server\app\dist\cli.js"`
- **Headless (no tray):** Add `--no-tray` for servers or CI environments.

The server does **not** auto-start at boot. If you want it to start at login, copy the Start Menu shortcut into `shell:startup`.

### Stopping

- **Tray icon:** Right-click the tray icon → **Quit**.
- **Command line:** Press <kbd>Ctrl</kbd>+<kbd>C</kbd>.

### System tray icon

The tray icon shows the server status at a glance:

| Icon | Meaning | Typical cause |
|------|---------|---------------|
| 🟢 Green | All data sources `connected`, server healthy | Normal |
| 🟡 Yellow | A source is `connecting` (transient backoff) **or** no sources configured | Race not started, scoreboard in reconnect |
| 🔴 Red | A source is terminally `disconnected` **or** an error occurred | Wrong XML path, C123 not running |

Right-click gives you **Open Dashboard** and **Quit**.

### Notifications

The server sends Windows toast notifications for important events (connection changes, errors, XML mismatches). These appear in the Action Center and require the installed version — when running from source (`npm start`), notifications fall back to legacy balloon tooltips.

### Single instance

Only one instance can run on a given port. If you try to start a second instance, it will detect the running server and exit with a clear error message.

## Upgrading

To install a newer version over an existing installation:

1. **Quit** the running server (right-click tray icon → Quit).
2. Run the new installer. It will overwrite the old files.
3. Your settings in `%APPDATA%\c123-server\settings.json` are untouched.

No need to uninstall first. The admin UI shows a banner when a new version is published on GitHub (the check runs hourly against the GitHub Releases API).

> **Upgrading from the service-based version (pre-v0.2):** The installer automatically detects and removes the old Windows service. No manual steps needed.

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

1. Removes the Windows Firewall rule.
2. Deletes `C:\Program Files\C123 Server\`.

**Your settings in `%APPDATA%\c123-server\` are NOT deleted.** If you really want a clean wipe, remove that folder manually after uninstall.

> **Tip:** Quit the server before uninstalling. The installer will try to close it automatically, but quitting first avoids any file-in-use prompts.

## Troubleshooting

### Admin dashboard does not open / `http://localhost:27123` returns connection refused

Make sure C123 Server is running:

- Look for the tray icon in the system tray (notification area). If it's not there, start it from the Start Menu.
- If the tray icon is red, hover over it for the error message.

Common causes:

- Port 27123 already in use by another process (`netstat -ano | findstr :27123`).
- Firewall or antivirus blocking `node.exe`.

### SmartScreen warning "Windows protected your PC"

The installer is not code-signed yet. This is a known limitation and we'll look at adding a signing certificate in a future release. In the meantime:

1. Click **More info**.
2. Click **Run anyway**.

The installer source is open, so you can audit it at [github.com/OpenCanoeTiming/c123-server/tree/main/installer](https://github.com/OpenCanoeTiming/c123-server/tree/main/installer) if you want to verify before running.

### Scoreboards on the LAN cannot connect

The installer adds a firewall rule, but some third-party firewalls / endpoint protection suites ignore Windows Firewall rules and add their own. Check your security software and allow inbound TCP/27123 for `node.exe`.

### Debugging with log files

When launched via the Start Menu shortcut (wscript.exe), console output is not visible. The server automatically logs to `%APPDATA%\c123-server\server.log` when running without a terminal. Check this file for startup errors or crash diagnostics.

The log file is rotated at 512 KB (`server.log.old`).

To see live output, run the server from a command prompt instead:

```cmd
"C:\Program Files\C123 Server\runtime\node.exe" "C:\Program Files\C123 Server\app\dist\cli.js"
```

Add `--debug` for verbose logging.

## Running without the installer (advanced)

Developers can skip the installer and run from source — see the main [README.md](../README.md#installation-from-source-for-developers).

The bundled installer is Windows-only. For Linux or macOS deployments, build from source and run `npm start` or `node dist/cli.js` directly. Toast notifications require the installer (AUMID registration); without it, notifications fall back to balloon tooltips.

## Reporting issues

- Issues: <https://github.com/OpenCanoeTiming/c123-server/issues>
- When reporting installer problems, include:
  - Installer version (visible in the filename)
  - Content of `%APPDATA%\c123-server\server.log` (recent entries)
  - Content of `%APPDATA%\c123-server\settings.json` (redact any API keys first)
