const { giftedid } = require('./id');
const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require("pino");
const { Storage, File } = require("megajs");
const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

function randomMegaId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

async function uploadCredsToMega(credsPath) {
    if (!fs.existsSync(credsPath)) {
        throw new Error(`File not found: ${credsPath}`);
    }

    const storage = await new Storage({
        email: 'binukatrading@gmail.com',
        password: 'Binuka@123456'
    }).ready;

    const fileSize = fs.statSync(credsPath).size;
    const uploadResult = await storage.upload({
        name: `${randomMegaId()}.json`,
        size: fileSize
    }, fs.createReadStream(credsPath)).complete;

    const fileNode = storage.files[uploadResult.nodeId];
    const megaUrl = await fileNode.link();

    // Ensure hash included
    if (!megaUrl.includes('#')) {
        throw new Error("Mega URL invalid: hash missing.");
    }

    return megaUrl;
}

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = giftedid();
    let num = req.query.number;

    async function GIFTED_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            const Gifted = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari")
            });

            if (!Gifted.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Gifted.requestPairingCode(num);
                if (!res.headersSent) await res.send({ code });
                console.log(`Your Code: ${code}`);
            }

            Gifted.ev.on('creds.update', saveCreds);

            Gifted.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    await delay(5000); // reduced delay for safety
                    const filePath = `./temp/${id}/creds.json`;

                    if (!fs.existsSync(filePath)) {
                        console.error("File not found:", filePath);
                        return;
                    }

                    let megaUrl;
                    try {
                        megaUrl = await uploadCredsToMega(filePath);
                    } catch (err) {
                        console.error("Mega upload failed:", err);
                        return;
                    }

                    const sid = 'QUEEN-ELISA~' + megaUrl.split("https://mega.nz/file/")[1];
                    console.log(`Session ID: ${sid}`);

                    // Accept invite safely
                    try {
                        await Gifted.groupAcceptInvite("D2uPHizziioEZce4ev9Kkl");
                    } catch (err) {
                        console.warn("Group invite may have failed:", err.message);
                    }

                    // Send session ID message
                    const sidMsg = await Gifted.sendMessage(Gifted.user.id, { text: sid });

                    // Send info message
                    const infoText = `
*✅ SESSION GENERATED ✅*
Session ID: ${sid}
Support: https://chat.whatsapp.com/D2uPHizziioEZce4ev9Kkl
Repo: https://github.com/ayanmdoz/QUEEN-ELISA
`;

                    await Gifted.sendMessage(Gifted.user.id, { text: infoText }, { quoted: sidMsg });

                    await delay(100);
                    await Gifted.ws.close();
                    removeFile(`./temp/${id}`);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode != 401) {
                    console.log("Reconnecting in 10s...");
                    await delay(10000);
                    GIFTED_PAIR_CODE(); // recursive reconnect safe
                }
            });

        } catch (err) {
            console.error("Service Error:", err);
            removeFile(`./temp/${id}`);
            if (!res.headersSent) await res.send({ code: "Service is Currently Unavailable" });
        }
    }

    await GIFTED_PAIR_CODE();
});

module.exports = router;
