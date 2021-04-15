D:\Projects\rpc-chrome\Scripts\python.exe -m nuitka --standalone --windows-disable-console ./src/client.pyw

rd /s /q D:\Projects\rpc-chrome\client.build

mkdir D:\Projects\rpc-chrome\release
mkdir D:\Projects\rpc-chrome\release\client
mkdir D:\Projects\rpc-chrome\release\extension

xcopy D:\Projects\rpc-chrome\client.dist D:\Projects\rpc-chrome\release\client
xcopy D:\Projects\rpc-chrome\src\extension D:\Projects\rpc-chrome\release\extension

xcopy D:\Projects\rpc-chrome\config.json D:\Projects\rpc-chrome\release
xcopy D:\Projects\rpc-chrome\chromium.ico D:\Projects\rpc-chrome\release

dart compile exe ./src/launcher.dart
py ./src/pe_helper.py

rd /s /q D:\Projects\rpc-chrome\client.dist
