import json
import html
import time
import threading
import http.server
from pypresence import Presence

activeSiteTitle = "Idling"
activeSiteOrigin = None
extraDetails = None
icon = "chrome"
startTime = time.time()

try:
    with open("config.json", "r") as f:
        config = json.load(f)
except FileNotFoundError:
    config = {"label": "Chrome RPC"}

def RPCThread():
    RPC = Presence('827470852118806528')
    RPC.connect()

    while True:
        RPC.update(large_image=icon, large_text=activeSiteOrigin, buttons=[{"label": config["label"], "url": "https://discord.com"}], start=startTime, state=extraDetails, details=activeSiteTitle)
        time.sleep(1)

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","*")
        self.send_header("Access-Control-Allow-Headers","*")
        self.end_headers()

    def do_PUT(self):
        global activeSiteTitle
        global activeSiteOrigin
        global extraDetails
        global icon
        global label
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","*")
        self.send_header("Access-Control-Allow-Headers","*")
        self.end_headers()
        
        content_length = int(self.headers["Content-Length"])
        request_json = json.loads(html.unescape(self.rfile.read(content_length).decode('utf-8')))

        activeSiteTitle = request_json["title"]
        activeSiteOrigin = request_json["originUrl"]
        extraDetails = request_json["details"]
        icon = request_json["icon"]

def server_thread():
    server = http.server.ThreadingHTTPServer(('localhost', 1231), RequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.socket.close()

threading.Thread(target=server_thread).start()
RPCThread()