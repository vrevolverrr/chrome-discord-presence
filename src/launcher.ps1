Start-Process -filePath "./client/client.exe"
Start-Process -filePath "C:/Program Files/Google/Chrome/Application/chrome.exe" -Wait
Start-Process -filePath "taskkill.exe" -WindowStyle hidden -Wait -ArgumentList '/F', '/IM', "client.exe"