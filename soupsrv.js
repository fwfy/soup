require("process").chdir(__dirname);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3939 });
const f = require("@fwfy/futil");
const authdb = new f.JSONDB("./auth.json", true, 5000);
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync("./config.json"));
if(process.env.dev) {
    console.log(`[WARN] Using devmode override for config.imgpath, all images will be saved to ./img/!`)
    config.imgpath = "./img";
}

// https://stackoverflow.com/a/58326357
const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

if(!authdb.tokens) {
    authdb.tokens = [];
    authdb.tokens.push(genRanHex(256));
    console.log(`IMPORTANT!!\n\nThere were zero tokens found in your auth.json, so one has been created for you.\nAuthenticate with the server using the below token in order to be able to generate more tokens for other client devices.\nThis token will not be shown again, but if you lose access to it, you can either delete auth.json to repeat this process, or you can open auth.json in any text editor to extract the token yourself.\n\nToken: ${authdb.tokens[0]}`);
}



wss.on('connection', ws => {
    ws.on('message', e => handler(e,ws));
    ws.sendJSON = j => ws.send(JSON.stringify(j));
    console.log("new connection!");
});

let errors = {
    "ENDPOINT_NEEDS_AUTH": {
        error: true,
        error_code: "This endpoint requires authentication!",
        intent: "auth_fail"
    },
    "BAD_TOKEN": {
        error: true,
        error_code: "Invalid authentication token.",
        intent: "auth_fail"
    }
}

function handler(e,ws) {
    let o;
    try {
        o = JSON.parse(e);
    } catch(err) { return false; }
    switch(o.intent) {
        case "auth":
            if(!authdb.tokens.includes(o.token)) {
                ws.sendJSON(errors.BAD_TOKEN);
            } else {
                ws.authenticated = true;
                ws.authenticated_by = o.token;
                ws.sendJSON({
                    error: false,
                    intent: "auth_successful"
                });
            }
            break;
        case "new_token":
            if(!ws.authenticated) return ws.sendJSON(errors.ENDPOINT_NEEDS_AUTH);
            let tok = genRanHex(256);
            authdb.tokens.push(tok);
            ws.authenticated_by = tok;
            ws.sendJSON({
                intent: "new_token_response",
                token: tok
            });
            break;
        case "upload":
            if(!ws.authenticated) return ws.sendJSON(errors.ENDPOINT_NEEDS_AUTH);
            try {
                let ss_id = genRanHex(16);
                let filepath = path.join(config.imgpath,`${ss_id}.png`);
                fs.writeFileSync(filepath, Buffer.from(o.data, 'base64'));
                ws.sendJSON({
                    error: false,
                    intent: "ss_ready",
                    url: `${config.ss_public_path}${ss_id}.png`
                });
            } catch(err) {
                let eid = genRanHex(5);
                ws.sendJSON({
                    error: true,
                    error_code: "An internal error happened while trying to upload your screenshot.",
                    debug_id: eid
                });
                console.error(`Error EID ${eid} details:`,err);
            }
            break;
    }
}
