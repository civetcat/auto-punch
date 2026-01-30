Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\danielcheng\Desktop\auto-punch"" && ""C:\Program Files\nodejs\node.exe"" scheduler.js", 0, False
Set WshShell = Nothing
