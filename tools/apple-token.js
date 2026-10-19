// Makes an Apple Music developer token (valid about 150 days) from your MusicKit private key.
// You need an Apple Developer Program membership. In the developer portal, create a MusicKit key
// and download the .p8 file. Then run:
//
//   node tools/apple-token.js AuthKey_ABC123DEFG.p8 KEY_ID TEAM_ID [http://127.0.0.1:3000]
//
// KEY_ID is the 10 characters in the .p8 file name. TEAM_ID is on your membership page.
// The optional last argument limits the token to one website. Paste the printed token into the app.
// Keep the .p8 file private. It never goes into the browser.
const fs = require("fs"), crypto = require("crypto");
const [, , keyFile, keyId, teamId, origin] = process.argv;
if (!keyFile || !keyId || !teamId) {
  console.error("Usage: node tools/apple-token.js AuthKey_XXXX.p8 KEY_ID TEAM_ID [https://your-origin]");
  process.exit(1);
}
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const claims = { iss: teamId, iat: now, exp: now + 60 * 60 * 24 * 150 };
if (origin) claims.origin = [origin];
const data = b64({ alg: "ES256", kid: keyId }) + "." + b64(claims);
const sig = crypto.sign("sha256", Buffer.from(data), { key: fs.readFileSync(keyFile), dsaEncoding: "ieee-p1363" });
console.log(data + "." + sig.toString("base64url"));