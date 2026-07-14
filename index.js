const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

// كائن لتتبع خطوة كل عميل في المحادثة
const userSessions = {};

// 📝 قائمة الخدمات والأسعار (يمكنك تعديل الأسعار والأسماء من هنا بسهولة)
const shopServices = {
    '1': {
        name: "🎮 ألعاب",
        items: "• فري فاير (100 جوهرة) 💎 ➔ 1.5$\n• ببجي موبايل (60 شدة) 👑 ➔ 1.2$\n• بطاقة فيفا بوينتس ➔ 5$"
    },
    '2': {
        name: "🎬 مسلسلات وأفلام",
        items: "• اشتراك نيتفليكس (شاشة واحدة) 🍿 ➔ 4$\n• اشتراك شاهد VIP شهري 🌟 ➔ 3.5$\n• اشتراك IPTV لمدة سنة 📺 ➔ 15$"
    },
    '3': {
        name: "🎁 بطاقات gift",
        items: "• بطاقة جوجل بلاي 5$ ➔ 6$\n• بطاقة آيتونز 5$ ➔ 6$\n• بطاقة ريزر جولد 100 نقطة ➔ 2$"
    },
    '4': {
        name: "🤖 ذكاء صناعي",
        items: "• حساب ChatGPT Plus مشترك 🧠 ➔ 7$\n• اشتراك Midjourney لمدة شهر 🎨 ➔ 12$"
    },
    '5': {
        name: "💬 تطبيقات تواصل",
        items: "• تليجرام بريميوم شهري ✈️ ➔ 4$\n• ديسكورد نيترو قياسي 👾 ➔ 4.5$"
    }
};

// 💳 معلومات الدفع الخاصة بمتجرك (عدلها حسب حساباتك الحقيقية)
const paymentDetails = `💳 *طريقة الدفع المعتمدة:*\n\n` +
                     `يرجى تحويل مبلغ الطلب عبر أحد الحسابات التالية:\n` +
                     `• *بنكي (موريتانيا):* 123456789\n` +
                     `• *السداد الرقمي / جيب:* 222XXXXXX\n` +
                     `• *بايبال / بطاقة ائتمان:* payment@rimdigital.com\n\n` +
                     `📸 بعد إتمام التحويل، يرجى إرسال *لقطة شاشة (Screenshot)* واضحة للإيصال هنا لتأكيد طلبك وتجهيزه.`;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');
    const phoneNumber = process.env.PHONE_NUMBER;

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: !phoneNumber,
        logger: pino({ level: 'silent' })
    });

    if (phoneNumber && !sock.authState.creds.registered) {
        console.log(`\n[+] تم اكتشاف الرقم المضاف في السيرفر: ${phoneNumber}`);
        console.log("[+] جاري الاتصال الآمن مع سيرفرات واتساب... انتظر 6 ثوانٍ...");
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                let formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n==============================================`);
                console.log(`🔑 كود ربط الواتساب الخاص بك هو: ${formattedCode}`);
                console.log(`==============================================\n`);
            } catch (err) {
                console.error("[-] فشل في توليد كود الرمز:", err.message);
            }
        }, 6000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) 
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut 
                : true;
            if (shouldReconnect) setTimeout(() => startBot(), 5000);
        } else if (connection === 'open') {
            console.log('\n🟢 البوت المتسلسل يعمل الآن بنجاح وبأعلى كفاءة! 🚀\n');
        }
    });

    // استقبال الرسائل وتدفق العملية للعميل
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const isImage = msg.message.imageMessage;

        // بدء جلسة جديدة للعميل في حال تواصله لأول مرة
        if (!userSessions[from]) {
            userSessions[from] = { step: 'WELCOME', selectedService: '', userDetails: '' };
        }

        const session = userSessions[from];

        try {
            // 🛑 1. العميل يرسل أي شيء -> شكر فوري وقائمة الأقسام الـ 5
            if (session.step === 'WELCOME') {
                const welcomeMsg = `أهلاً بك في متجر *Rim Digital*! شكراً لتواصلك معنا 🏪✨\n\n` +
                                   `يرجى اختيار القسم الذي تريده بإرسال *رقم القسم* فقط:\n\n` +
                                   `1️⃣ ألعاب 🎮\n` +
                                   `2️⃣ مسلسلات وأفلام 🎬\n` +
                                   `3️⃣ بطاقات gift 🎁\n` +
                                   `4️⃣ ذكاء صناعي 🤖\n` +
                                   `5️⃣ تطبيقات تواصل 💬\n\n` +
                                   `_اكتب الرقم (1 أو 2 أو 3 أو 4 أو 5) وسأقوم بعرض التفاصيل فوراً._`;
                
                await sock.sendMessage(from, { text: welcomeMsg });
                session.step = 'AWAITING_CATEGORY';
                return;
            }

            // 🛑 2. العميل اختار القسم -> عرض الخدمات والأسعار وطلب البيانات
            if (session.step === 'AWAITING_CATEGORY') {
                if (shopServices[text]) {
                    const selected = shopServices[text];
                    session.selectedService = selected.name;
                    session.step = 'AWAITING_DETAILS';

                    const serviceMsg = `📂 قسم: *[ ${selected.name} ]*\n\n` +
                                       `📋 *إليك الخدمات المتوفرة وأسعارها الحالية:*\n` +
                                       `${selected.items}\n\n` +
                                       `✍️ *الخطوة التالية:* يرجى كتابة اسم الخدمة المطلوبة وتفاصيل حسابك في رسالة واحدة (مثال: شحن فري فاير - ID: 1234567).`;
                    
                    await sock.sendMessage(from, { text: serviceMsg });
                } else {
                    // رسالة تنبيه إذا أرسل شيئاً غير الأرقام المطلوبة
                    await sock.sendMessage(from, { text: "⚠️ عذراً، يرجى كتابة رقم القسم الصحيح فقط (من 1 إلى 5)." });
                }
                return;
            }

            // 🛑 3. استلام البيانات النصية للطلب -> عرض طريقة الدفع وطلب إرسال الصورة
            if (session.step === 'AWAITING_DETAILS' && text !== '') {
                session.userDetails = text;
                session.step = 'AWAITING_PAYMENT';

                const paymentMsg = `✅ تم تسجيل تفاصيل طلبك بنجاح:\n` +
                                   `📝 *الطلب:* ${text}\n\n` +
                                   `${paymentDetails}`;

                await sock.sendMessage(from, { text: paymentMsg });
                return;
            }

            // 🛑 4. استلام صورة التحويل -> رسالة تأكيد الاستلام والوداع (أقل من 24 ساعة)
            if (session.step === 'AWAITING_PAYMENT') {
                if (isImage) {
                    const finalGoodbyeMsg = `🎉 *تم استلام طلبك وإيصال الدفع بنجاح!* 🎉\n\n` +
                                            `• *القسم:* ${session.selectedService}\n` +
                                            `• *التفاصيل:* ${session.userDetails}\n\n` +
                                            `⚡ نود إعلامك بأن فريق العمل قد باشر معالجة طلبك الآن، و**سوف ننجز الخدمة لك في أقل من 24 ساعة** إن شاء الله. ⏱️✨\n\n` +
                                            `نشكرك على اختيارك لـ *Rim Digital*! نراك قريباً ويومك سعيد. 👋🌸`;

                    await sock.sendMessage(from, { text: finalGoodbyeMsg });
                    
                    // حذف الجلسة ليكون العميل جاهزاً للطلب مرة أخرى في المستقبل
                    delete userSessions[from];
                } else {
                    await sock.sendMessage(from, { text: "⚠️ يرجى إرسال لقطة الشاشة (الصورة) الخاصة بإيصال التحويل لنتمكن من مراجعة طلبك وإتمامه فوراً." });
                }
                return;
            }

        } catch (error) {
            console.error("حدث خطأ أثناء معالجة رسالة العميل:", error);
        }
    });
}

startBot().catch(err => console.error("خطأ غير متوقع:", err));
