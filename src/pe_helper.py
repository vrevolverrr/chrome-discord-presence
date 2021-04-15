"""
Helper script to hide console window of dart2native executable
https://stackoverflow.com/questions/2435816/how-do-i-poke-the-flag-in-a-win32-pe-that-controls-console-window-display/14806704
"""

import struct

source = open("./src/launcher.exe", "rb")
dest   = open("./release/launcher.exe", "w+b")
dest.write(source.read())

dest.seek(0x3c)
(PeHeaderOffset,)=struct.unpack("H", dest.read(2))

dest.seek(PeHeaderOffset)
(PeSignature,) = struct.unpack("I", dest.read(4))

dest.seek(PeHeaderOffset + 0x5C)
dest.write(struct.pack("H", 0x02))

source.close()
dest.close()