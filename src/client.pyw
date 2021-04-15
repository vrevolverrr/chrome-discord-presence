import json
import html
import time
import urllib.request
import http.server
from pypresence import Presence

icons = json.loads(urllib.request.urlopen("https://raw.githubusercontent.com/vrevolverrr/chrome-rpc/main/assets/icons.json").read())
startTime = time.time()

try:
    with open("config.json", "r") as f:
        config = json.load(f)
except FileNotFoundError:
    config = {"label": "Chrome RPC", "label_hyperlink": "https://github.com/vrevolverrr/chrome-rpc"}

RPC = Presence('827470852118806528')
RPC.connect()
RPC.update(large_image="chrome", buttons=[{"label": config["label"], "url": config["label_hyperlink"]}], start=startTime, details="Idling")

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # CORS
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","*")
        self.send_header("Access-Control-Allow-Headers","*")
        self.end_headers()

    def do_PUT(self):
        # CORS
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","*")
        self.send_header("Access-Control-Allow-Headers","*")
        self.end_headers()
        
        content_length = int(self.headers["Content-Length"])
        request_json = json.loads(html.unescape(self.rfile.read(content_length).decode('utf-8')))

        if (request_json["originUrl"] in list(icons.keys())):
            icon = icons[request_json["originUrl"]]
        else:
            icon = "chrome"

        RPC.update(
            large_image=icon,
            large_text=request_json["originUrl"],
            buttons=[{"label": config["label"], "url": config["label_hyperlink"]}],
            start=startTime,
            state=request_json["details"],
            details=request_json["title"]
            )

server = http.server.ThreadingHTTPServer(('localhost', 1231), RequestHandler)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.socket.close()