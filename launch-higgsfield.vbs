' Silent desktop launcher — no flashing console window.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = Chr(34) & projectDir & "\launch-higgsfield.bat" & Chr(34)

shell.CurrentDirectory = projectDir
' 7 = minimized window (server stays in taskbar; close to stop)
shell.Run "cmd /c " & batPath, 7, False
