const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

// كائن لحفظ وتتبع حالة العميل خطوة بخطوة
const userSessions = {};

// رقم الإدارة الخاص بك لاستقبال الإشعارات وإيصالات الدفع فوراً
const adminJid = '22241010750@s.whatsapp.net';

// 🗂️ قاعدة البيانات: مختارة ومختصرة بألفاظ واضحة جداً (بدون تكرار وبدون كلمة سعر)
const packages = {
    games: {
        "1": {
            title: "ببجي 👑",
            rows: [
                { title: "60 UC", price: "50 MRU" },
                { title: "120 UC", price: "100 MRU" },
                { title: "325 UC", price: "230 MRU" },
                { title: "385 UC", price: "280 MRU" },
                { title: "660 UC", price: "450 MRU" },
                { title: "720 UC", price: "500 MRU" },
                { title: "1800 UC", price: "1100 MRU" },
                { title: "3850 UC", price: "2150 MRU" }
            ]
        },
        "2": {
            title: "فري فاير 💎",
            rows: [
                { title: "210 Diamonds", price: "135 MRU" },
                { title: "310 Diamonds", price: "195 MRU" },
                { title: "530 Diamonds", price: "330 MRU" },
                { title: "1060 Diamonds", price: "600 MRU" },
                { title: "2180 Diamonds", price: "1230 MRU" },
                { title: "5600 Diamonds", price: "2865 MRU" },
                { title: "11500 Diamonds", price: "5670 MRU" }
            ]
        }
    },
    media: {
        "1": { title: "نيتفليكس 🍿", rows: [{ title: "شهر", price: "200 MRU" }, { title: "شهرين", price: "350 MRU" }, { title: "3 أشهر", price: "550 MRU" }] },
        "2": { title: "شاهد 🎬", rows: [{ title: "شهر", price: "200 MRU" }, { title: "شهرين", price: "350 MRU" }, { title: "3 أشهر", price: "550 MRU" }] },
        "3": { title: "أمازون 🎥", rows: [{ title: "شهر", price: "200 MRU" }, { title: "شهرين", price: "350 MRU" }, { title: "3 أشهر", price: "550 MRU" }] },
        "4": { title: "تود ⚽", rows: [{ title: "شهر", price: "250 MRU" }, { title: "شهرين", price: "400 MRU" }, { title: "3 أشهر", price: "800 MRU" }] }
    },
    gift: {
        "1": { title: "آيتونز 🎁", rows: [{ title: "5$", price: "250 MRU" }, { title: "10$", price: "500 MRU" }, { title: "20$", price: "1000 MRU" }] },
        "2": { title: "جوجل بلاي 🎁", rows: [{ title: "5$", price: "250 MRU" }, { title: "10$", price: "500 MRU" }, { title: "20$", price: "1000 MRU" }] }
    },
    ai: {
        "1": { title: "شات جي بي تي 🧠", rows: [{ title: "Plus", price: "1000 MRU" }, { title: "Go", price: "400 MRU" }] },
        "2": { title: "جيميني 🤖", rows: [{ title: "Plus", price: "318 MRU" }, { title: "Advanced", price: "796 MRU" }, { title: "Ultra", price: "3980 MRU" }] }
    },
    social: {
        "1": {
            title: "انستقرام 📸",
            rows: [
                { title: "500 متابع", price: "150 MRU" },
                { title: "1000 متابع", price: "300 MRU" },
                { title: "2000 متابع", price: "500 MRU" },
                { title: "5000 متابع", price: "800 MRU" },
                { title: "7000 متابع", price: "1000 MRU" },
                { title: "10000 متابع", price: "1500 MRU" }
            ]
        },
        "2": {
            title: "تيك توك 🎵",
            rows: [
                { title: "1000 متابع", price: "400 MRU" },
                { title: "2000 متابع", price: "700 MRU" },
                { title: "3000 متابع", price: "10000 MRU" },
                { title: "5000 متابع", price: "16000 MRU" },
                { title: "8000 متابع", price: "23000 MRU" },
                { title: "10000 متابع", price: "29000 MRU" }
            ]
        },
        "3": {
            title: "سناب بلس 👻",
            rows: [
                { title: "3 أشهر", price: "310 MRU" },
                { title: "6 أشهر", price: "650 MRU" },
                { title: "سنة كاملة", price: "1000 MRU" }
            ]
        }
    }
};

// 💳 نص الدفع المختصر والواضح جداً للشارع الموريتاني
const paymentInfo = `💳 طريقة الدفع:
حوّل للرقم: *41010750*
(بنكيلي - سداد - بيم بنك)

📸 أرسل صورة الإيصال هنا لتأكيد طلبك.`;

// 🏪 القائمة الرئيسية المختصرة
const mainMenuText = `✨ **Rim Digital** ✨

[ 1 ] ألعاب 🎮
[ 2 ] أفلام ومسلسلات 🎬
[ 3 ] بطاقات هدايا 🎁
[ 4 ] ذكاء اصطناعي 🤖
[ 5 ] زيادة متابعين 💬

✍️ اكتب رقم القسم وأرسل.`;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');
    const phoneNumber = process.env.PHONE_NUMBER;

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: !phoneNumber,
        logger: pino({ level: 'silent' })
    });

    if (phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                let formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n🔑 كود ربط الواتساب الخاص بك هو: ${formattedCode}\n`);
            } catch (err) {
                console.error("[-] فشل توليد الكود:", err.message);
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
            console.log('\n🟢 البوت الاحترافي المختصر يعمل الآن بنجاح! 🚀\n');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const isImage = msg.message.imageMessage;

        if (!userSessions[from]) {
            userSessions[from] = { step: 'WELCOME', parentCategory: '', subCategoryKey: '', subCategoryTitle: '', packageSelected: '', userInput: '', orderId: '' };
        }

        const session = userSessions[from];

        try {
            // 🛑 ميزة الهروب السريع: العودة للقائمة الرئيسية من أي مكان عند كتابة # (ما عدا خطوة إدخال البيانات المباشرة)
            if (text === '#' && session.step !== 'AWAITING_USER_INPUT') {
                delete userSessions[from];
                await sock.sendMessage(from, { text: mainMenuText });
                userSessions[from] = { step: 'AWAITING_CATEGORY', parentCategory: '', subCategoryKey: '', subCategoryTitle: '', packageSelected: '', userInput: '', orderId: '' };
                return;
            }

            // 🛑 الخطوة 1: القائمة الرئيسية
            if (session.step === 'WELCOME') {
                await sock.sendMessage(from, { text: mainMenuText });
                session.step = 'AWAITING_CATEGORY';
                return;
            }

            // 🛑 الخطوة 2: الأقسام الرئيسية
            if (session.step === 'AWAITING_CATEGORY') {
                if (text === '1') {
                    session.parentCategory = 'games';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🎮 اختر اللعبة:\n\n[ 1 ] ببجي 👑\n[ 2 ] فري فاير 💎\n\n[ 0 ] رجوع للبداية ↩️` });
                } else if (text === '2') {
                    session.parentCategory = 'media';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🎬 اختر الخدمة:\n\n[ 1 ] نيتفليكس 🍿\n[ 2 ] شاهد 🎬\n[ 3 ] أمازون 🎥\n[ 4 ] تود ⚽\n\n[ 0 ] رجوع للبداية ↩️` });
                } else if (text === '3') {
                    session.parentCategory = 'gift';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🎁 اختر نوع البطاقة:\n\n[ 1 ] آيتونز 🎁\n[ 2 ] جوجل بلاي 🎁\n\n[ 0 ] رجوع للبداية ↩️` });
                } else if (text === '4') {
                    session.parentCategory = 'ai';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🤖 اختر الأداة:\n\n[ 1 ] شات جي بي تي 🧠\n[ 2 ] جيميني 🤖\n\n[ 0 ] رجوع للبداية ↩️` });
                } else if (text === '5') {
                    session.parentCategory = 'social';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `💬 اختر المنصة:\n\n[ 1 ] انستقرام 📸\n[ 2 ] تيك توك 🎵\n[ 3 ] سناب بلس 👻\n\n[ 0 ] رجوع للبداية ↩️` });
                } else {
                    await sock.sendMessage(from, { text: mainMenuText });
                }
                return;
            }

            // 🛑 الخطوة 3: الخدمات الفرعية
            if (session.step === 'AWAITING_SUBCATEGORY') {
                if (text === '0') {
                    delete userSessions[from];
                    await sock.sendMessage(from, { text: mainMenuText });
                    userSessions[from] = { step: 'AWAITING_CATEGORY', parentCategory: '', subCategoryKey: '', subCategoryTitle: '', packageSelected: '', userInput: '', orderId: '' };
                    return;
                }

                const cat = session.parentCategory;
                if (packages[cat] && packages[cat][text]) {
                    session.subCategoryKey = text;
                    const sub = packages[cat][text];
                    session.subCategoryTitle = sub.title;
                    session.step = 'AWAITING_PACKAGE';

                    let packMsg = `📦 باقات [ ${sub.title} ] المتاحة:\n\n`;
                    sub.rows.forEach((row, index) => {
                        packMsg += `[ ${index + 1} ] ${row.title} -> ${row.price}\n`;
                    });
                    packMsg += `\n[ 0 ] رجوع للخلف ↩️\n[ # ] القائمة الرئيسية 🏠\n\n✍️ اكتب رقم الباقة المناسبة:`;

                    await sock.sendMessage(from, { text: packMsg });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ رقم غير صحيح، اختر من القائمة." });
                }
                return;
            }

            // 🛑 الخطوة 4: اختيار الباقة وتوليد رقم الطلب (Order ID)
            if (session.step === 'AWAITING_PACKAGE') {
                if (text === '0') {
                    session.step = 'WELCOME';
                    // محاكاة سريعة للرجوع للقسم السابق المناسب
                    let simulated = '1';
                    if (session.parentCategory === 'media') simulated = '2';
                    else if (session.parentCategory === 'gift') simulated = '3';
                    else if (session.parentCategory === 'ai') simulated = '4';
                    else if (session.parentCategory === 'social') simulated = '5';
                    
                    session.step = 'AWAITING_CATEGORY';
                    if (simulated === '1') await sock.sendMessage(from, { text: `🎮 اختر اللعبة:\n\n[ 1 ] ببجي 👑\n[ 2 ] فري فاير 💎\n\n[ 0 ] رجوع للبداية ↩️` });
                    if (simulated === '2') await sock.sendMessage(from, { text: `🎬 اختر الخدمة:\n\n[ 1 ] نيتفليكس 🍿\n[ 2 ] شاهد 🎬\n[ 3 ] أمازون 🎥\n[ 4 ] تود ⚽\n\n[ 0 ] رجوع للبداية ↩️` });
                    if (simulated === '3') await sock.sendMessage(from, { text: `🎁 اختر نوع البطاقة:\n\n[ 1 ] آيتونز 🎁\n[ 2 ] جوجل بلاي 🎁\n\n[ 0 ] رجوع للبداية ↩️` });
                    if (simulated === '4') await sock.sendMessage(from, { text: `🤖 اختر الأداة:\n\n[ 1 ] شات جي بي تي 🧠\n[ 2 ] جيميني 🤖\n\n[ 0 ] رجوع للبداية ↩️` });
                    if (simulated === '5') await sock.sendMessage(from, { text: `💬 اختر المنصة:\n\n[ 1 ] انستقرام 📸\n[ 2 ] تيك توك 🎵\n[ 3 ] سناب بلس 👻\n\n[ 0 ] رجوع للبداية ↩️` });
                    session.step = 'AWAITING_SUBCATEGORY';
                    return;
                }

                const cat = session.parentCategory;
                const subKey = session.subCategoryKey;
                const index = parseInt(text) - 1;

                if (packages[cat] && packages[cat][subKey] && packages[cat][subKey].rows[index]) {
                    const selectedPack = packages[cat][subKey].rows[index];
                    session.packageSelected = `${selectedPack.title} -> ${selectedPack.price}`;
                    
                    // توليد رقم طلب تلقائي واحترافي للعميل فوراً
                    session.orderId = 'RD-' + Math.floor(1000 + Math.random() * 9000);

                    if (cat === 'games') {
                        session.step = 'AWAITING_USER_INPUT';
                        await sock.sendMessage(from, { text: `✍️ اخترت: ${selectedPack.title}\n\nأرسل الآن *آيدي (ID) اللاعب* بدقة:` });
                    } else if (cat === 'social') {
                        session.step = 'AWAITING_USER_INPUT';
                        await sock.sendMessage(from, { text: `✍️ اخترت: ${selectedPack.title}\n\nأرسل الآن *اسم المستخدم (Username)* للحساب:` });
                    } else {
                        session.userInput = "لا يتطلب بيانات";
                        session.step = 'AWAITING_PAYMENT_IMAGE';

                        const summaryText = `📋 **تفاصيل طلبك:**\n` +
                                            `• رقم الطلب: *${session.orderId}*\n` +
                                            `• الخدمة: ${session.subCategoryTitle}\n` +
                                            `• الباقة: ${session.packageSelected}\n\n` +
                                            `${paymentInfo}`;

                        await sock.sendMessage(from, { text: summaryText });
                    }
                } else {
                    await sock.sendMessage(from, { text: "⚠️ اختيار غير صحيح." });
                }
                return;
            }

            // 🛑 الخطوة 5: استلام البيانات والتحقق السريع
            if (session.step === 'AWAITING_USER_INPUT' && text !== '') {
                session.userInput = text;
                session.step = 'AWAITING_CONFIRMATION';

                const confirmPrompt = `🔍 **تأكيد البيانات:**\n\nالتي كتبتها: *${text}*\n\n[ 1 ] صحيحة ومتأكد ✅\n[ 2 ] تعديل وكتابة من جديد ✍️`;
                await sock.sendMessage(from, { text: confirmPrompt });
                return;
            }

            // 🛑 الخطوة 5 مكرر: معالجة التأكيد
            if (session.step === 'AWAITING_CONFIRMATION') {
                if (text === '1') {
                    session.step = 'AWAITING_PAYMENT_IMAGE';

                    const summaryText = `📋 **تفاصيل طلبك المؤكد:**\n` +
                                        `• رقم الطلب: *${session.orderId}*\n` +
                                        `• الخدمة: ${session.subCategoryTitle}\n` +
                                        `• الباقة: ${session.packageSelected}\n` +
                                        `• البيانات: ${session.userInput}\n\n` +
                                        `${paymentInfo}`;

                    await sock.sendMessage(from, { text: summaryText });
                } else if (text === '2') {
                    session.step = 'AWAITING_USER_INPUT';
                    await sock.sendMessage(from, { text: "✍️ أرسل البيانات الصحيحة الآن:" });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ اكتب (1) للتأكيد أو (2) للتعديل." });
                }
                return;
            }

            // 🛑 الخطوة 6: استقبال إيصال الدفع وتنبيه الإدارة فوراً
            if (session.step === 'AWAITING_PAYMENT_IMAGE') {
                if (isImage) {
                    // 1. إشعار الزبون بنجاح العملية
                    const finalGoodbyeMsg = `🎉 **تم استلام طلبك رقم [ ${session.orderId} ] بنجاح!**\n\n` +
                                            `⏱️ سيتم تنفيذ وتجهيز طلبك في أقل من 24 ساعة.\n\n` +
                                            `شكراً لثقتك بمتجرنا! 👋✨`;
                    await sock.sendMessage(from, { text: finalGoodbyeMsg });

                    // 2. إرسال إشعار فوري ومفصل إلى رقمك الخاص (الإدارة)
                    const customerPhone = from.split('@')[0];
                    const adminReportText = `🆕 **وصلك طلب جديد ومؤكد!**\n\n` +
                                           `🔢 رقم الطلب: *${session.orderId}*\n` +
                                           `📱 رقم هاتف الزبون: +${customerPhone}\n` +
                                           `• الخدمة: ${session.subCategoryTitle}\n` +
                                           `• الباقة: ${session.packageSelected}\n` +
                                           `• البيانات: ${session.userInput}\n\n` +
                                           `👇 صورة إيصال الدفع المرفقة من الزبون تجدها بالأسفل:`;
                    
                    await sock.sendMessage(adminJid, { text: adminReportText });
                    
                    // توجيه صورة الإيصال مباشرة لك
                    await sock.sendMessage(adminJid, { forward: msg });

                    // تصفير الجلسة للزبون
                    delete userSessions[from];
                } else {
                    await sock.sendMessage(from, { text: "⚠️ يرجى إرسال صورة إيصال التحويل (بنكيلي/سداد/بيم بنك) لتأكيد طلبك.\n\n🔙 أو اكتب *#* للغاء والعودة للبداية." });
                }
                return;
            }

        } catch (error) {
            console.error("خطأ:", error);
        }
    });
}

startBot().catch(err => console.error("خطأ تشغيل البوت:", err));
