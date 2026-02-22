import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import P from "pino"

const owner = "2348056408043"
let bannedUsers = []

async function startBot() {
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
        startBot()
      }
    }

    if (connection === "open") {
      console.log("✅ KELLY BOT CONNECTED SUCCESSFULLY!")
    }

    // 🔥 THIS MAKES PAIRING CODE SHOW IN RAILWAY LOGS
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(owner)
      console.log("\n🔥 KELLY BOT PAIRING CODE 🔥")
      console.log("👉 " + code)
      console.log("Enter this in WhatsApp → Linked Devices → Link with phone number\n")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return

    const msg =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      ""

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith("@g.us")
    const text = msg.toLowerCase()

    if (bannedUsers.includes(sender)) return

    // ===== GENERAL =====
    if (text === "ping")
      await sock.sendMessage(from, { text: "🏓 Pong!" })

    if (text === "alive")
      await sock.sendMessage(from, { text: "🤖 Kelly Bot is Alive & Running 🚀" })

    if (text === "menu")
      await sock.sendMessage(from, {
        text: `
🤖 *KELLY BOT MENU*

⚡ General
• ping
• alive
• menu

👥 Group
• tagall
• group open
• group close

🎉 Fun
• joke
• truth
• dare

🚫 Owner
• ban 234xxxxxxxxx
• unban 234xxxxxxxxx
`
      })

    // ===== FUN =====
    if (text === "joke")
      await sock.sendMessage(from, {
        text: "😂 Why did the bot cross the road? To connect to Railway!"
      })

    if (text === "truth")
      await sock.sendMessage(from, {
        text: "🤭 What is your biggest secret?"
      })

    if (text === "dare")
      await sock.sendMessage(from, {
        text: "🔥 I dare you to change your profile picture!"
      })

    // ===== GROUP COMMANDS =====
    if (isGroup) {
      if (text === "tagall") {
        const metadata = await sock.groupMetadata(from)
        let message = "📢 Tagging Everyone:\n\n"
        metadata.participants.forEach(p => {
          message += `@${p.id.split("@")[0]}\n`
        })

        await sock.sendMessage(from, {
          text: message,
          mentions: metadata.participants.map(p => p.id)
        })
      }

      if (text === "group open") {
        await sock.groupSettingUpdate(from, "not_announcement")
        await sock.sendMessage(from, { text: "✅ Group Opened" })
      }

      if (text === "group close") {
        await sock.groupSettingUpdate(from, "announcement")
        await sock.sendMessage(from, { text: "🔒 Group Closed" })
      }
    }

    // ===== OWNER ONLY =====
    if (sender.includes(owner)) {
      if (text.startsWith("ban ")) {
        const number = text.split(" ")[1]
        bannedUsers.push(number + "@s.whatsapp.net")
        await sock.sendMessage(from, { text: "🚫 User banned!" })
      }

      if (text.startsWith("unban ")) {
        const number = text.split(" ")[1]
        bannedUsers = bannedUsers.filter(
          u => u !== number + "@s.whatsapp.net"
        )
        await sock.sendMessage(from, { text: "✅ User unbanned!" })
      }
    }
  })
}

startBot()