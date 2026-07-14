const { default: makeWASocket, useMultiFileAuthState, delay, disconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

const ADMIN_NUMBER = "97477257244@s.whatsapp.net"; // رقم الأدمن لتلقي الطلبات وصور التحويل
const STATE_FILE = "./user_states.json";

// كتالوج المنتجات والأسعار بالعملة الموريتانية MRU 🇲🇷
const catalog = {
  categories: {
    "1": { name: "🎮 شحن الألعاب (ببجي / فري فاير)", key: "games" },
    "2": { name: "🎬 الأفلام والمسلسلات (نتفليكس / شاهد / TOD)", key: "streaming" },
    "3": { name: "🤖 اشتراكات الذكاء الاصطناعي (ChatGPT / Gemini)", key: "ai" },
    "4": { name: "💳 البطاقات الرقمية (iTunes / Google Play)", key: "cards" },
    "5": { name: "📈 خدمات تطبيقات التواصل (تيك توك / انستغرام / سناب شات+)", key: "social" }
  },
  games: {
    "1": { name: "ببجي 60 UC", price: 50 },
    "2": { name: "ببجي 120 UC", price: 100 },
    "3": { name: "ببجي 325 UC", price: 230 },
    "4": { name: "ببجي 385 UC", price: 280 },
    "5": { name: "ببجي 660 UC", price: 450 },
    "6": { name: "ببجي 720 UC", price: 500 },
    "7": { name: "ببجي 1800 UC", price: 1100 },
    "8": { name: "ببجي 3850 UC", price: 2150 },
    "9": { name: "فري فاير 210 جوهرة", price: 135 },
    "10": { name: "فري فاير 310 جوهرة", price: 195 },
    "11": { name: "فري فاير 530 جوهرة", price: 330 },
    "12": { name: "فري فاير 1060 جوهرة", price: 600 },
    "13": { name: "فري فاير 2180 جوهرة", price: 1230 },
    "14": { name: "فري فاير 5600 جوهرة", price: 2865 },
    "15": { name: "فري فاير 11500 جوهرة", price: 5670 }
  },
  streaming: {
    "1": { name: "نتفليكس / شاهد VIP / أمازون برايم (شهر واحد)", price: 200 },
    "2": { name: "نتفليكس / شاهد VIP / أمازون برايم (شهرين)", price: 350 },
    "3": { name: "نتفليكس / شاهد VIP / أمازون برايم (3 أشهر)", price: 550 },
    "4": { name: "TOD (شهر واحد)", price: 250 },
    "5": { name: "TOD (شهرين)", price: 400 },
    "6": { name: "TOD (3 أشهر)", price: 800 }
  },
  ai: {
    "1": { name: "ChatGPT Plus", price: 1000 },
    "2": { name: "ChatGPT Go", price: 400 },
    "3": { name: "Gemini Plus", price: 318 },
    "4": { name: "Gemini Pro", price: 796 },
    "5": { name: "Gemini Ultra", price: 3980 }
  },
  cards: {
    "1": { name: "بطاقة iTunes / Google Play بقيمة 5$", price: 250 },
    "2": { name: "بطاقة iTunes / Google Play بقيمة 10$", price: 500 },
    "3": { name: "بطاقة iTunes / Google Play بقيمة 20$", price: 1000 }
  },
  social: {
    "1": { name: "تيك توك (1000 متابع)", price: 400 },
    "2": { name: "تيك توك (2000 متابع)", price: 700 },
    "3": { name: "تيك توك (3000 متابع)", price: 10000 },
    "4": { name: "تيك توك (5000 متابع)", price: 16000 },
    "5": { name: "تيك توك (8000 متابع)", price: 23000 },
    "6": { name: "تيك توك (10000 متابع)", price: 29000 },
    "7": { name: "انستغرام (500 متابع)", price: 150 },
    "8": { name: "انستغرام (1000 متابع)", price: 300 },
    "9": { name: "انستغرام (2000 متابع)", price: 500 },
    "10": { name: "انستغرام (5000 متابع)", price: 800 },
    "11": { name: "انستغرام (7000 متابع)", price: 1000 },
    "12": { name: "انستغرام (10000 متابع)", price: 1500 },
    "13": { name: "سناب شات+ اشتراك 3 أشهر", price: 310 },
    "14": { name: "سناب شات+ اشتراك 6 أشهر", price: 650 },
    "15": { name: "سناب شات+ اشتراك سنة كاملة", price: 1000 }
  }
};

// دوال إدارة الجلسة للمستخدمين
function getStates() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return {}; }
  }
  return {};
}

function saveState(phone, data) {
  const states = getStates();
  states[phone] = { ...states[phone], ...data };
  fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2));
}

function clearState(phone) {
  const states = getStates();
  delete states[phone];
  fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2));
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session_auth');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // سنستخدم كود الربط بدلاً من QR لقفل الجوال
    logger: pino({ level: 'silent' })
  });

  // طلب رمز الربط بالهاتف (Pairing Code)
  if (!sock.authState.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER;
    if (phoneNumber) {
      await delay(5000);
      try {
        const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
        console.log(`\n\n🔑 [PAIRING CODE]: 👉 ${code} 👈\n\n`);
      } catch (err) {
        console.error("Error generating pairing code:", err);
      }
    } else {
      console.log("⚠️ [WARNING]: PHONE_NUMBER env variable is missing on Railway!");
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== disconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('🚀 RIM Digital Bot is connected and running 24/7!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const msgText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const isImage = msg.message.imageMessage;

    const states = getStates();
    const userState = states[from] || { step: "WELCOME" };

    // 1. القائمة الرئيسية والترحيب
    if (userState.step === "WELCOME" || ["ابدأ", "مرحبا", "سلام", "start", "menu", "البداية"].includes(msgText.trim().toLowerCase())) {
      let menuText = `🔥 *مرحباً بك في RIM Digital!* 🔥\nالمتجر الرقمي الأسرع في موريتانيا 🇲🇷\n\n💡 *اختر القسم الذي تريده بإرسال رقمه فقط:*\n\n`;
      for (const [key, val] of Object.entries(catalog.categories)) {
        menuText += `*${key}* - ${val.name}\n`;
      }
      menuText += `\n⚡ نحن بالخدمة دائماً!`;
      
      saveState(from, { step: "SELECT_CATEGORY" });
      await sock.sendMessage(from, { text: menuText });
      return;
    }

    // 2. معالجة اختيار القسم
    if (userState.step === "SELECT_CATEGORY") {
      const chosenCat = catalog.categories[msgText.trim()];
      if (chosenCat) {
        const catKey = chosenCat.key;
        let pText = `📂 *قسم: ${chosenCat.name}*\nالرجاء إرسال رقم العرض المناسب لك:\n\n`;
        
        for (const [key, val] of Object.entries(catalog[catKey])) {
          pText += `*${key}* - ${val.name} 👈 السعر: *${val.price} MRU*\n`;
        }
        pText += `\n🔙 أرسل *0* للعودة للقائمة الرئيسية.`;

        saveState(from, { step: "SELECT_PRODUCT", category: catKey });
        await sock.sendMessage(from, { text: pText });
      } else {
        await sock.sendMessage(from, { text: "⚠️ رقم غير صالح. الرجاء إرسال الرقم المقابل للقسم المطلوب." });
      }
      return;
    }

    // 3. معالجة اختيار العرض/المنتج
    if (userState.step === "SELECT_PRODUCT") {
      const input = msgText.trim();
      if (input === "0") {
        saveState(from, { step: "WELCOME" });
        await sock.sendMessage(from, { text: "جاري العودة..." });
        return;
      }

      const selected = catalog[userState.category]?.[input];
      if (selected) {
        saveState(from, { product: selected.name, price: selected.price });

        if (userState.category === "games") {
          saveState(from, { step: "WAITING_PLAYER_ID" });
          await sock.sendMessage(from, { text: "🎮 ممتاز! الرجاء كتابة *ID اللاعب (Player ID)* الخاص بك الآن بدقة:" });
        } else if (userState.category === "social") {
          saveState(from, { step: "WAITING_USERNAME" });
          await sock.sendMessage(from, { text: "📈 ممتاز! الرجاء كتابة *اسم الحساب (Username)* أو الرابط المطلوب شحنه:" });
        } else {
          saveState(from, { step: "WAITING_PAYMENT_PROOF" });
          await sendPaymentInstructions(sock, from, selected);
        }
      } else {
        await sock.sendMessage(from, { text: "⚠️ رقم غير صحيح، يرجى اختيار رقم من القائمة المعروضة." });
      }
      return;
    }

    // 4. استلام الـ ID للألعاب
    if (userState.step === "WAITING_PLAYER_ID") {
      const playerId = msgText.trim();
      saveState(from, { step: "WAITING_PAYMENT_PROOF", playerId });
      await sendPaymentInstructions(sock, from, { name: userState.product, price: userState.price });
      return;
    }

    // 5. استلام الـ Username للتواصل
    if (userState.step === "WAITING_USERNAME") {
      const username = msgText.trim();
      saveState(from, { step: "WAITING_PAYMENT_PROOF", username });
      await sendPaymentInstructions(sock, from, { name: userState.product, price: userState.price });
      return;
    }

    // 6. استلام إثبات الدفع وتوجيهه للأدمن
    if (userState.step === "WAITING_PAYMENT_PROOF") {
      if (isImage) {
        await sock.sendMessage(from, { text: "🟢 *شكراً لك! تم استلام طلبك وإثبات الدفع بنجاح.*\n\nيقوم فريق الدعم الآن بمراجعة العملية وتفعيل طلبك خلال دقائق معدودة! ⚡" });
        
        // إعداد رسالة التلخيص للأدمن
        let orderSummary = `🚨 *طلب جديد على RIM Digital!* 🚨\n\n` +
                           `📱 *العميل:* wa.me/${from.split('@')[0]}\n` +
                           `📦 *المنتج المطلوب:* ${userState.product}\n` +
                           `💰 *المبلغ المحول:* ${userState.price} MRU\n`;

        if (userState.playerId) orderSummary += `🎮 *معرف اللاعب ID:* \`${userState.playerId}\`\n`;
        if (userState.username) orderSummary += `📈 *اسم الحساب:* \`${userState.username}\`\n`;

        orderSummary += `\n📸 *صورة الإيصال المرفقة بالأسفل 👇*`;

        // إرسال النص للأدمن
        await sock.sendMessage(ADMIN_NUMBER, { text: orderSummary });
        
        // إعادة إرسال صورة التحويل للأدمن لتأكيد العملية
        await sock.sendMessage(ADMIN_NUMBER, { 
          image: { download: msg.message.imageMessage }, 
          caption: `إيصال دفع لطلب العميل: ${userState.product}` 
        });

        clearState(from);
      } else {
        await sock.sendMessage(from, { text: "⚠️ من فضلك، أرسل *صورة إيصال التحويل (لقطة الشاشة)* لإتمام طلبك وتأكيده." });
      }
      return;
    }
  });
}

async function sendPaymentInstructions(sock, to, product) {
  const text = `💳 *طلبك الحالي:* ${product.name}\n` +
               `💰 *السعر المطلوب:* ${product.price} MRU\n\n` +
               `---------------------------------\n` +
               `📌 *طرق الدفع المتاحة:* \n` +
               `الرجاء تحويل المبلغ عبر (بيم بنك / بنكيلي / سداد) إلى الرقم:\n` +
               `👉 *41010750*\n\n` +
               `📸 بعد التحويل، *أرسل لقطة شاشة للإيصال (Screenshot)* مباشرة في هذه المحادثة لتفعيل طلبك فوراً!`;
  await sock.sendMessage(to, { text: text });
}

startBot();

