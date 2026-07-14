const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

// كائن لحفظ وتتبع حالة العميل خطوة بخطوة
const userSessions = {};

// 🗂️ قاعدة بيانات الأقسام الفرعية والأسعار لجميع الأقسام الـ 5 المعتمدة على الأرقام بالكامل
const packages = {
    games: {
        "1": {
            title: "شدات ببجي موبايل (UC) 👑",
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
            title: "جواهر فري فاير (Diamonds) 💎",
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
        "1": {
            title: "اشتراكات Netflix / Shahid VIP / TOD / Prime 🍿",
            rows: [
                { title: "Netflix / Shahid / Prime / TOD - شهر", price: "200 MRU" },
                { title: "Netflix / Shahid / Prime / TOD - شهرين", price: "350 MRU" },
                { title: "Netflix / Shahid / Prime / TOD - 3 أشهر", price: "550 MRU" }
            ]
        },
        "2": {
            title: "باقات بريميوم / IPTV 📺",
            rows: [
                { title: "باقة IPTV - شهر واحد", price: "250 MRU" },
                { title: "باقة IPTV - شهرين", price: "400 MRU" },
                { title: "باقة IPTV - 3 أشهر", price: "800 MRU" }
            ]
        }
    },
    gift: {
        "1": {
            title: "بطاقات iTunes الهدايا 🎁",
            rows: [
                { title: "بطاقة iTunes 5$", price: "250 MRU" },
                { title: "بطاقة iTunes 10$", price: "500 MRU" },
                { title: "بطاقة iTunes 20$", price: "1000 MRU" }
            ]
        },
        "2": {
            title: "بطاقات Google Play 🎁",
            rows: [
                { title: "بطاقة Google Play 5$", price: "250 MRU" },
                { title: "بطاقة Google Play 10$", price: "500 MRU" },
                { title: "بطاقة Google Play 20$", price: "1000 MRU" }
            ]
        }
    },
    ai: {
        "1": {
            title: "اشتراكات ChatGPT 🧠",
            rows: [
                { title: "ChatGPT Plus", price: "1000 MRU" },
                { title: "ChatGPT Go", price: "400 MRU" }
            ]
        },
        "2": {
            title: "اشتراكات Gemini AI 🤖",
            rows: [
                { title: "Gemini Plus", price: "318 MRU" },
                { title: "Gemini Advanced", price: "796 MRU" },
                { title: "Gemini Ultra", price: "3980 MRU" }
            ]
        }
    },
    social: {
        "1": {
            title: "متابعين انستقرام (Instagram) 📸",
            rows: [
                { title: "انستقرام 500 متابع", price: "150 MRU" },
                { title: "انستقرام 1000 متابع", price: "300 MRU" },
                { title: "انستقرام 2000 متابع", price: "500 MRU" },
                { title: "انستقرام 5000 متابع", price: "800 MRU" },
                { title: "انستقرام 7000 متابع", price: "1000 MRU" },
                { title: "انستقرام 10000 متابع", price: "1500 MRU" }
            ]
        },
        "2": {
            title: "متابعين تيك توك (TikTok) 🎵",
            rows: [
                { title: "تيك توك 1000 متابع", price: "400 MRU" },
                { title: "تيك توك 2000 متابع", price: "700 MRU" },
                { title: "تيك توك 3000 متابع", price: "10000 MRU" },
                { title: "تيك توك 5000 متابع", price: "16000 MRU" },
                { title: "تيك توك 8000 متابع", price: "23000 MRU" },
                { title: "تيك توك 10000 متابع", price: "29000 MRU" }
            ]
        },
        "3": {
            title: "اشتراك سناب شات بلس (Snapchat+) 👻",
            rows: [
                { title: "سناب بلس - 3 أشهر", price: "310 MRU" },
                { title: "سناب بلس - 6 أشهر", price: "650 MRU" },
                { title: "سناب بلس - سنة كاملة", price: "1000 MRU" }
            ]
        }
    }
};

// 💳 معلومات الدفع الموريتانية المعتمدة لدى متجرك
const paymentInfo = `💳 *طريقة الدفع المعتمدة لدى متجر Rim Digital:*

يرجى تحويل قيمة الطلب إلى الرقم الموحد التالي:
📱 الرقم: *41010750*

وذلك عبر أحد التطبيقات المتاحة لديك:
• *بنكيلي (Bankily)* 📲
• *سداد (Sadad)* 📲
• *بيم بنك (Bim Bank)* 📲

📸 *الخطوة الأخيرة:* بعد إتمام عملية الدفع، يرجى إرسال *لقطة شاشة (Screenshot)* واضحة للإيصال هنا لتأكيد طلبك وتجهيزه فوراً.`;

// القائمة الرئيسية كرسالة نصية مضمونة الظهور 100%
const mainMenuText = `🏪 *مرحباً بك في متجر Rim Digital!* ✨
يسعدنا خدمتك وتسهيل طلبك تلقائياً وبسرعة فائقة.

يرجى الرد بـ *رقم القسم* الذي تريده لبدء طلبك مباشرة 👇:

[ 1 ] 🎮 *ألعاب* (ببجي وفري فاير)
[ 2 ] 🎬 *مسلسلات وأفلام* (نيتفليكس، شاهد، تود، وباقات التلفزيون)
[ 3 ] 🎁 *بطاقات Gift* (بطاقات آيتونز وجوجل بلاي)
[ 4 ] 🤖 *ذكاء اصطناعي* (شات جي بي تي وجيميني)
[ 5 ] 💬 *تطبيقات تواصل* (متابعين واشتراكات تواصل اجتماعي)

✍️ *طريقة الاختيار:* فقط اكتب الرقم (مثلاً: *1*) ثم اضغط إرسال.`;

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
            console.log('\n🟢 البوت الذكي المطور (القوائم النصية الآمنة 100%) يعمل الآن بنجاح! 🚀\n');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const isImage = msg.message.imageMessage;

        // تهيئة الجلسة
        if (!userSessions[from]) {
            userSessions[from] = { step: 'WELCOME', parentCategory: '', subCategoryKey: '', subCategoryTitle: '', packageSelected: '', userInput: '' };
        }

        const session = userSessions[from];

        try {
            // 🛑 الخطوة 1: ترحيب وقائمة نصية مضمونة
            if (session.step === 'WELCOME') {
                await sock.sendMessage(from, { text: mainMenuText });
                session.step = 'AWAITING_CATEGORY';
                return;
            }

            // 🛑 الخطوة 2: اختيار القسم الرئيسي
            if (session.step === 'AWAITING_CATEGORY') {
                if (text === '1') {
                    session.parentCategory = 'games';
                    session.step = 'AWAITING_SUBCATEGORY';
                    const listMsg = `🎮 *يرجى اختيار اللعبة التي ترغب بشحنها:*

[ 1 ] ببجي موبايل (PUBG Mobile) 👑
[ 2 ] فري فاير (Free Fire) 💎

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب رقم اللعبة (مثلاً: *1*) ثم أرسل.`;
                    await sock.sendMessage(from, { text: listMsg });
                } else if (text === '2') {
                    session.parentCategory = 'media';
                    session.step = 'AWAITING_SUBCATEGORY';
                    const listMsg = `🎬 *يرجى تحديد فئة الاشتراك الترفيهي الذي تفضله:*

[ 1 ] اشتراكات Netflix / Shahid / Prime / TOD 🍿
[ 2 ] باقات بريميوم / IPTV 📺

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.`;
                    await sock.sendMessage(from, { text: listMsg });
                } else if (text === '3') {
                    session.parentCategory = 'gift';
                    session.step = 'AWAITING_SUBCATEGORY';
                    const listMsg = `🎁 *يرجى اختيار نوع بطاقة الهدايا الرقمية:*

[ 1 ] بطاقات iTunes الهدايا🍏
[ 2 ] بطاقات Google Play 🤖

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.`;
                    await sock.sendMessage(from, { text: listMsg });
                } else if (text === '4') {
                    session.parentCategory = 'ai';
                    session.step = 'AWAITING_SUBCATEGORY';
                    const listMsg = `🤖 *يرجى اختيار أداة الذكاء الاصطناعي:*

[ 1 ] اشتراكات ChatGPT 🧠
[ 2 ] اشتراكات Gemini AI 🤖

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.`;
                    await sock.sendMessage(from, { text: listMsg });
                } else if (text === '5') {
                    session.parentCategory = 'social';
                    session.step = 'AWAITING_SUBCATEGORY';
                    const listMsg = `💬 *يرجى اختيار منصة التواصل التي ترغب بزيادة المتابعين لها:*

[ 1 ] متابعين انستقرام (Instagram) 📸
[ 2 ] متابعين تيك توك (TikTok) 🎵
[ 3 ] اشتراك سناب شات بلس (Snapchat+) 👻

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.`;
                    await sock.sendMessage(from, { text: listMsg });
                } else {
                    // إذا أرسل كلمة ترحيبية أو أي نص آخر، أعد عرض القائمة
                    await sock.sendMessage(from, { text: mainMenuText });
                }
                return;
            }

            // 🛑 الخطوة 3: اختيار الخدمة الفرعية
            if (session.step === 'AWAITING_SUBCATEGORY') {
                if (text === '0') {
                    session.step = 'WELCOME';
                    await sock.sendMessage(from, { text: mainMenuText });
                    session.step = 'AWAITING_CATEGORY';
                    return;
                }

                const cat = session.parentCategory;
                if (packages[cat] && packages[cat][text]) {
                    session.subCategoryKey = text;
                    const sub = packages[cat][text];
                    session.subCategoryTitle = sub.title;
                    session.step = 'AWAITING_PACKAGE';

                    // عرض الباقات والأسعار على هيئة أرقام واضحة ومكشوفة للجميع
                    let packMsg = `📦 *أسعار وباقات [ ${sub.title} ] بالـ (MRU):*\n\n`;
                    sub.rows.forEach((row, index) => {
                        packMsg += `[ ${index + 1} ] ${row.title} 👈 *السعر: ${row.price}*\n`;
                    });
                    packMsg += `\n[ 0 ] العودة للقائمة السابقة ↩\n\n✍️ *الرجاء كتابة رقم الباقة المناسبة لك وإرساله:*`;

                    await sock.sendMessage(from, { text: packMsg });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ اختيار غير صحيح، يرجى كتابة أحد الأرقام المتاحة في القائمة أعلاه." });
                }
                return;
            }

            // 🛑 الخطوة 4: اختيار الباقة
            if (session.step === 'AWAITING_PACKAGE') {
                if (text === '0') {
                    // رجوع للقسم السابق
                    session.step = 'AWAITING_CATEGORY';
                    let simulatedText = '';
                    if (session.parentCategory === 'games') simulatedText = '1';
                    else if (session.parentCategory === 'media') simulatedText = '2';
                    else if (session.parentCategory === 'gift') simulatedText = '3';
                    else if (session.parentCategory === 'ai') simulatedText = '4';
                    else if (session.parentCategory === 'social') simulatedText = '5';
                    
                    userSessions[from].step = 'AWAITING_CATEGORY';
                    await sock.sendMessage(from, { text: "↩️ جاري الرجوع للقسم السابق..." });
                    
                    if (simulatedText) {
                        session.step = 'AWAITING_CATEGORY';
                        if (simulatedText === '1') {
                            session.parentCategory = 'games'; session.step = 'AWAITING_SUBCATEGORY';
                            await sock.sendMessage(from, { text: `🎮 *يرجى اختيار اللعبة التي ترغب بشحنها:*\n\n[ 1 ] ببجي موبايل (PUBG Mobile) 👑\n[ 2 ] فري فاير (Free Fire) 💎\n\n[ 0 ] العودة للقائمة الرئيسية ↩️` });
                        } else if (simulatedText === '2') {
                            session.parentCategory = 'media'; session.step = 'AWAITING_SUBCATEGORY';
                            await sock.sendMessage(from, { text: `🎬 *يرجى تحديد فئة الاشتراك الترفيهي الذي تفضله:*\n\n[ 1 ] اشتراكات Netflix / Shahid / Prime / TOD 🍿\n[ 2 ] باقات بريميوم / IPTV 📺\n\n[ 0 ] العودة للقائمة الرئيسية ↩️` });
                        } else if (simulatedText === '3') {
                            session.parentCategory = 'gift'; session.step = 'AWAITING_SUBCATEGORY';
                            await sock.sendMessage(from, { text: `🎁 *يرجى اختيار نوع بطاقة الهدايا الرقمية:*\n\n[ 1 ] بطاقات iTunes الهدايا🍏\n[ 2 ] بطاقات Google Play 🤖\n\n[ 0 ] العودة للقائمة الرئيسية ↩️` });
                        } else if (simulatedText === '4') {
                            session.parentCategory = 'ai'; session.step = 'AWAITING_SUBCATEGORY';
                            await sock.sendMessage(from, { text: `🤖 *يرجى اختيار أداة الذكاء الاصطناعي:*\n\n[ 1 ] اشتراكات ChatGPT 🧠\n[ 2 ] اشتراكات Gemini AI 🤖\n\n[ 0 ] العودة للقائمة الرئيسية ↩️` });
                        } else if (simulatedText === '5') {
                            session.parentCategory = 'social'; session.step = 'AWAITING_SUBCATEGORY';
                            await sock.sendMessage(from, { text: `💬 *يرجى اختيار منصة التواصل التي ترغب بزيادة المتابعين لها:*\n\n[ 1 ] متابعين انستقرام (Instagram) 📸\n[ 2 ] متابعين تيك توك (TikTok) 🎵\n[ 3 ] اشتراك سناب شات بلس (Snapchat+) 👻\n\n[ 0 ] العودة للقائمة الرئيسية ↩️` });
                        }
                    }
                    return;
                }

                const cat = session.parentCategory;
                const subKey = session.subCategoryKey;
                const index = parseInt(text) - 1;

                if (packages[cat] && packages[cat][subKey] && packages[cat][subKey].rows[index]) {
                    const selectedPack = packages[cat][subKey].rows[index];
                    session.packageSelected = `${selectedPack.title} - (السعر: ${selectedPack.price})`;

                    // توجيه ذكي حسب القسم الأب
                    if (cat === 'games') {
                        session.step = 'AWAITING_USER_INPUT';
                        const promptText = `✍️ *لقد اخترت شحن [ ${selectedPack.title} ]*\n\nيرجى كتابة *ID اللاعب (الآيدي الخاص بك باللعبة)* بدقة الآن وإرساله في رسالة واحدة.`;
                        await sock.sendMessage(from, { text: promptText });
                    } else if (cat === 'social') {
                        session.step = 'AWAITING_USER_INPUT';
                        const promptText = `✍️ *لقد اخترت خدمة [ ${selectedPack.title} ]*\n\nيرجى كتابة *اسم مستخدم الحساب (Username)* الخاص بك بدقة الآن (بدون كلمة مرور) لتنفيذ الخدمة عليه.`;
                        await sock.sendMessage(from, { text: promptText });
                    } else {
                        // الأقسام الـ 3 المتبقية: دفع مباشر وفوري دون طلب أي بيانات
                        session.userInput = "لا يتطلب بيانات";
                        session.step = 'AWAITING_PAYMENT_IMAGE';

                        const summaryText = `📋 *ملخص تفاصيل طلبك:*\n` +
                                            `• *الخدمة:* ${session.subCategoryTitle}\n` +
                                            `• *الباقة:* ${session.packageSelected}\n\n` +
                                            `${paymentInfo}`;

                        await sock.sendMessage(from, { text: summaryText });
                    }
                } else {
                    await sock.sendMessage(from, { text: "⚠️ رقم باقة غير صحيح، يرجى كتابة أحد الأرقام المعروضة في القائمة." });
                }
                return;
            }

            // 🛑 الخطوة 5: استلام ID أو اسم المستخدم (للألعاب أو سوشيال ميديا)
            if (session.step === 'AWAITING_USER_INPUT' && text !== '') {
                session.userInput = text;
                session.step = 'AWAITING_PAYMENT_IMAGE';

                const summaryText = `📋 *ملخص تفاصيل طلبك:*\n` +
                                    `• *الخدمة:* ${session.subCategoryTitle}\n` +
                                    `• *الباقة:* ${session.packageSelected}\n` +
                                    `• *البيانات:* ${text}\n\n` +
                                    `${paymentInfo}`;

                await sock.sendMessage(from, { text: summaryText });
                return;
            }

            // 🛑 الخطوة 6: استقبال صورة إيصال الدفع وتأكيد الطلب
            if (session.step === 'AWAITING_PAYMENT_IMAGE') {
                if (isImage) {
                    let detailsSummary = `• *الخدمة:* ${session.subCategoryTitle}\n` +
                                         `• *الباقة:* ${session.packageSelected}\n`;
                    
                    if (session.userInput && session.userInput !== "لا يتطلب بيانات") {
                        detailsSummary += `• *البيانات:* ${session.userInput}\n`;
                    }

                    const finalGoodbyeMsg = `🎉 *تم استلام طلبك وصورة إيصال الدفع بنجاح!* 🎉\n\n` +
                                            detailsSummary + `\n` +
                                            `⚡ فريق عمل *Rim Digital* قد استلم التفاصيل وبدأ العمل على تنفيذ طلبك فوراً، و**سوف ننجز الخدمة لك في أقل من 24 ساعة** إن شاء الله. ⏱️✨\n\n` +
                                            `نشكرك جزيل الشكر على ثقتك بنا وطاب يومك بكل خير وسعادة! 👋🌸`;

                    await sock.sendMessage(from, { text: finalGoodbyeMsg });
                    
                    // حذف الجلسة لإتاحة الطلب من جديد
                    delete userSessions[from];
                } else {
                    await sock.sendMessage(from, { text: "⚠️ يرجى إرسال لقطة الشاشة (الصورة) الخاصة بإيصال تحويل بنكيلي، سداد، أو بيم بنك لتأكيد وتجهيز طلبك." });
                }
                return;
            }

        } catch (error) {
            console.error("حدث خطأ في معالجة طلب العميل:", error);
        }
    });
}

startBot().catch(err => console.error("خطأ غير متوقع في التشغيل:", err));
