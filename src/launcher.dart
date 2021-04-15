import 'dart:convert';
import 'dart:io';

void main() async {
  var config = jsonDecode(File("config.json").readAsStringSync());

  Process rpcClient = await Process.start("./client/client.exe", []);

  Process.runSync(config["chrome_path"], []);
  rpcClient.kill();
}
