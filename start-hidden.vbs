Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node scheduler.js", 0, False
Set WshShell = Nothing
