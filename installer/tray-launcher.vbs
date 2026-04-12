' C123 Server Tray Monitor Launcher
' =================================
'
' Launches the tray monitor via wscript.exe so that node.exe starts with no
' visible console window. A .lnk pointing directly at node.exe flashes a
' black console window on every login, which looks unprofessional for a
' tray app — Node.js on Windows has no "nodew.exe" equivalent (unlike
' python/pythonw), so a hidden-launcher wrapper is the simplest workaround.
'
' This script lives in {app}\tray-launcher.vbs (the install root). It
' derives the paths to node.exe and cli.js relative to its own location so
' it keeps working if the user moves the install directory — no hardcoded
' C:\Program Files\... baked in.
'
' sh.Run(cmd, windowStyle, waitOnReturn):
'   windowStyle = 0     -> SW_HIDE (no window)
'   waitOnReturn = False -> do not block; return as soon as the process starts

Option Explicit

Dim sh, fso, appDir, nodeExe, cliJs, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Directory containing this .vbs file == install root (== {app} in Inno Setup)
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = appDir & "\runtime\node.exe"
cliJs = appDir & "\app\dist\cli.js"

' Sanity check: bail out quietly if expected files are missing. A silent
' exit is intentional — this script runs at user login with no UI, so a
' popup would be more confusing than helpful. If the tray is missing,
' docs/DEPLOYMENT.md tells the user how to run the tray command manually
' from cmd to see the actual error.
If Not fso.FileExists(nodeExe) Then WScript.Quit 1
If Not fso.FileExists(cliJs) Then WScript.Quit 1

' Run node.exe cli.js tray, hidden, non-blocking.
' Quote both paths in case the user installed to a path with spaces.
cmd = """" & nodeExe & """ """ & cliJs & """ tray"
sh.CurrentDirectory = appDir & "\app"
sh.Run cmd, 0, False
