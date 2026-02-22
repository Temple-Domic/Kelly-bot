import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import P from "pino"

const owner = "2348056408043" // Nigerian Number, new owner
let bannedUsers = [] // Store banned users temporarily

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

    // Print pairing code automatically
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(owner)
      console.log("\n🔥 KELLY BOT PAIRING CODE 🔥")
      console.log("👉 " + code)
      console.log("Enter this code in WhatsApp → Linked Devices → Link with phone number\n")
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return

    const msg = m.message.conversation || m.message.extendedTextMessage?.text
    if (!msg) return

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith("@g.us")
    const command = msg.toLowerCase()

    // Ignore banned users
    if (bannedUsers.includes(sender)) return

    // ===== GENERAL =====
    if (command === "ping") await sock.sendMessage(from, { text: "🏓 Pong!" })
    if (command === "alive") await sock.sendMessage(from, { text: "🤖 Kelly Bot is Online and Stable 🚀" })

    // ===== MENU =====
    if (command === "menu") await sock.sendMessage(from, { text: `
🤖 *KELLY BOT MENU*

⚡ General
• ping
• alive
• menu

👥 Group Menu
• tagall
• group open
• group close

🎉 Fun Menu
• joke
• truth
• dare

🚫 Ban Menu (Owner Only)
• ban [number]
• unban [number]
`})

    // ===== FUN =====
    if (command === "joke") await sock.sendMessage(from, { text: "😂 Why did the bot cross the road? To connect to WhatsApp!" })
    if (command === "truth") await sock.sendMessage(from, { text: "🤭 What’s your biggest secret?" })
    if (command === "dare") await sock.sendMessage(from, { text: "🔥 I dare you to change your DP for 24 hours!" })

    // ===== GROUP MENU =====
    if (isGroup) {
      if (command === "tagall") {
        const metadata = await sock.groupMetadata(from)
        let text = "📢 Tagging Everyone:\n\n"
        metadata.participants.forEach(p => text += `@${p.id.split("@")[0]}\n`)
        await sock.sendMessage(from, { text, mentions: metadata.participants.map(p => p.id) })
      }
      if (command === "group open") {
        await sock.groupSettingUpdate(from, "not_announcement")
        await sock.sendMessage(from, { text: "✅ Group Opened — Everyone can send messages" })
      }
      if (command === "group close") {
        await sock.groupSettingUpdate(from, "announcement")
        await sock.sendMessage(from, { text: "🔒 Group Closed — Only admins can send messages" })
      }
    }

    // ===== BAN MENU (OWNER ONLY) =====
    if (sender.includes(owner)) {
      if (command.startsWith("ban ")) {
        const toBan = command.split(" ")[1]
        if (toBan) {
          bannedUsers.push(toBan + "@s.whatsapp.net")
          await sock.sendMessage(from, { text: `🚫 User ${toBan} banned!` })
        }
      }
      if (command.startsWith("unban ")) {
        const toUnban = command.split(" ")[1]
        if (toUnban) {
          bannedUsers = bannedUsers.filter(u => u !== toUnban + "@s.whatsapp.net")
          await sock.sendMessage(from, { text: `✅ User ${toUnban} unbanned!` })
        }
      }
    }

  })
}

startKellyBot()