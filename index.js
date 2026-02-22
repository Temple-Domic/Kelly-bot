import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import P from "pino"

async function startKellyBot() {

const { state, saveCreds } = await useMultiFileAuthState("auth_info")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
  logger: P({ level: "silent" }),
  auth: state,
  version
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect } = update

  if (connection === "close") {
    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      startKellyBot()
    }
  }

  if (connection === "open") {
    console.log("✅ Kelly Bot Connected Successfully!")
  }
})

/* ===== PAIRING CODE ===== */

if (!sock.authState.creds.registered) {

  const phoneNumber = "233278104843"

  const code = await sock.requestPairingCode(phoneNumber)

  console.log("\n🔥 KELLY BOT PAIRING CODE 🔥")
  console.log("👉 " + code)
  console.log("Enter this code in WhatsApp → Linked Devices → Link with phone number\n")
}

/* ===== BASIC COMMANDS ===== */

sock.ev.on("messages.upsert", async ({ messages }) => {

const m = messages[0]
if (!m.message) return

const msg =
  m.message.conversation ||
  m.message.extendedTextMessage?.text

if (!msg) return

const from = m.key.remoteJid
const command = msg.toLowerCase()

if (command === "ping") {
  await sock.sendMessage(from, { text: "🏓 Pong!" })
}

if (command === "alive") {
  await sock.sendMessage(from, { text: "🤖 Kelly Bot is Online and Stable 🚀" })
}

if (command === "menu") {
  await sock.sendMessage(from, { text: `
🤖 *KELLY BOT MENU*

• ping
• alive
• menu
• joke
• truth
• dare
`})
}

if (command === "joke") {
  await sock.sendMessage(from, { text: "😂 Why did the bot cross the road? To connect to WhatsApp!" })
}

if (command === "truth") {
  await sock.sendMessage(from, { text: "🤭 What’s your biggest secret?" })
}

if (command === "dare") {
  await sock.sendMessage(from, { text: "🔥 I dare you to change your DP for 24 hours!" })
}

})

}

startKellyBot()
