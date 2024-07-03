const WebSocket = require('ws');
const ws = new WebSocket(process.argv[2]);
const token = process.argv[3];
const path = process.argv[4];
const fs = require('fs');
if(!token || !path) {
errorHandler("missing params. call the script like this: upload.js [websocket uri] [authtoken] [filepath]");
}
ws.on('message', handler);
ws.on('open', _ => {
ws.sendJSON = j => ws.send(JSON.stringify(j));
ws.sendJSON({
intent: "auth",
token: token
});
});
function errorHandler(error_code) {
console.error(`ERROR: ${error_code}`);
process.exit(1);
}
function handler(e) {
let o;
try {
o = JSON.parse(e);
} catch(err) {
errorHandler("Invalid JSON from server.");
}
switch(o.intent) {
case "auth_successful":
if(path == "new_token") return ws.sendJSON({
intent: "new_token",
});
ws.sendJSON({
intent: "upload",
data: fs.readFileSync(path, {encoding: "base64"})
});
break;
case "auth_fail":
errorHandler("Invalid token.");
break;
case "ss_ready":
console.log(o.url);
process.exit(0);
break;
case "new_token_response":
console.log(`Success! A new token has been generated: ${o.tok}`);
process.exit(0);
break;
default:
console.log(o);
break;
}
}
