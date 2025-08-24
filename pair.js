
const { giftedid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
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
    try {
        const storage = await new Storage({
            email: 'fghia2840@Gmail.com',
            password: 'Bloodxmd234@'
        }).ready;
        console.log('Mega storage initialized.');
        if (!fs.existsSync(credsPath)) {
            throw new Error(`File not found: ${credsPath}`);
        }
        const fileSize = fs.statSync(credsPath).size;
        const uploadResult = await storage.upload({
            name: `${randomMegaId()}.json`,
            size: fileSize
        }, fs.createReadStream(credsPath)).complete;
        console.log('Session successfully uploaded to Mega.');
        const fileNode = storage.files[uploadResult.nodeId];
        const megaUrl = await fileNode.link();
        console.log(`Session Url: ${megaUrl}`);
        return megaUrl;
    } catch (error) {
        console.error('Error uploading to Mega:', error);
        throw error;
    }
}

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = giftedid();
    let num = req.query.number;

    async function GIFTED_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Gifted = Gifted_Tech({
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
                console.log(`Your Code: ${code}`);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Gifted.ev.on('creds.update', saveCreds);

            Gifted.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(50000);
                    const filePath = __dirname + `/temp/${id}/creds.json`;
                    if (!fs.existsSync(filePath)) {
                        console.error("File not found:", filePath);
                        return;
                    }

                    const megaUrl = await uploadCredsToMega(filePath);
                    const sid = megaUrl.includes("https://mega.nz/file/")
                        ? 'QUEEN-ELISA~' + megaUrl.split("https://mega.nz/file/")[1]
                        : 'Error: Invalid URL';

                    console.log(`Session ID: ${sid}`);

                    Gifted.groupAcceptInvite("D2uPHizziioEZce4ev9Kkl");

                    const sidMsg = await Gifted.sendMessage(
                        Gifted.user.id,
                        {
                            text: sid,
                            contextInfo: {
                                mentionedJid: [Gifted.user.id],
                                forwardingScore: 999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363401819417685@newsletter',
                                    newsletterName: 'QUEEN ELISA 𝐏𝐀𝐈𝐑 ♻️',
                                    serverMessageId: 143
                                }
                            }
                        },
                        {
                            disappearingMessagesInChat: true,
                            ephemeralExpiration: 86400
                        }
                    );

                    const GIFTED_TEXT = `
*✅sᴇssɪᴏɴ ɪᴅ ɢᴇɴᴇʀᴀᴛᴇᴅ✅*
______________________________
*🎉 SESSION GENERATED SUCCESSFULLY! ✅*

*💪 Empowering Your Experience with Queen Elisa*

*🌟 Show your support by giving our repo a star! 🌟*
🔗 https://github.com/ayanmdoz/QUEEN-ELISA

*💭 Need help? Join our support groups:*
📢 💬
*https://chat.whatsapp.com/D2uPHizziioEZce4ev9Kkl*

*📚 Learn & Explore More with Tutorials:*
🪄 YouTube Channel https://www.youtube.com

> Q U E E N - E L I S A 
*Together, we build the future of automation! 🚀*
______________________________

ඔයාට QUEEN ELISA WHATSAPP BOT DEPLOY කරගන්න අවශයනම්
ඔබ ලබා ගත් SESSION ID එක BOT OWNER ට SEND කර . 
OWNER හරහා BOT DEPLOYED කර ගන්න 🫶❤️‍🩹
BOT OWNER -: +258833406646`;

                    await Gifted.sendMessage(
                        Gifted.user.id,
                        {
                            text: GIFTED_TEXT,
                            contextInfo: {
                                mentionedJid: [Gifted.user.id],
                                forwardingScore: 999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363401819417685@newsletter',
                                    newsletterName: 'QUEEN ELISA 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐍 ⚠️',
                                    serverMessageId: 143
                                }
                            }
                        },
                        {
                            quoted: sidMsg,
                            disappearingMessagesInChat: true,
                            ephemeralExpiration: 86400
                        }
                    );

                    await delay(100);
                    await Gifted.ws.close();
                    return await removeFile('./temp/' + id);
                } else if (
                    connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output.statusCode != 401
                ) {
                    await delay(10000);
                    GIFTED_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("Service Has Been Restarted:", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "Service is Currently Unavailable" });
            }
        }
    }

    return await GIFTED_PAIR_CODE();
});

module.exports = router;
