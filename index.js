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

// 🗂️ قاعدة البيانات المنظمة (بدون تكرار أسماء الخدمات أو كلمة سعر في الخيارات)
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
            title: "متابعين انستقرام 📸",
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
            title: "متابعين تيك توك 🎵",
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
            title: "اشتراك سناب شات بلس 👻",
            rows: [
                { title: "3 أشهر", price: "310 MRU" },
                { title: "6 أشهر", price: "650 MRU" },
                { title: "سنة كاملة", price: "1000 MRU" }
            ]
        }
    }
};

// 💳 نص إرشادات الدفع الموريتاني المتوازن والواضح جداً
const paymentInfo = `💳 *طريقة الدفع المعتمدة لدى متجر Rim Digital:*

يرجى تحويل قيمة الطلب إلى الرقم الموحد التالي:
📱 الرقم: *41010750*

وذلك عبر أحد التطبيقات المتاحة لديك:
• *بنكيلي (Bankily)* 📲
• *سداد (Sadad)* 📲
• *بيم بنك (Bim Bank)* 📲

📸 *الخطوة الأخيرة:* بعد إتمام عملية الدفع، يرجى إرسال *لقطة شاشة (Screenshot)* واضحة للإيصال هنا لتأكيد طلبك وتجهيزه فوراً.

🔙 *هل غيّرت رأيك؟* يمكنك في أي وقت كتابة الرمز *#* لإلغاء العملية والعودة للقائمة الرئيسية.`;

// 🏪 القائمة الرئيسية بإرشاد توضيحي واضح لسهولة الاختيار
const mainMenuText = `🏪 *مرحباً بك في متجر Rim Digital!* ✨
يسعدنا خدمتك وتسهيل طلبك تلقائياً وبسرعة فائقة.

يرجى الرد بـ *رقم القسم* الذي تريده لبدء طلبك مباشرة 👇:

[ 1 ] 🎮 ألعاب
[ 2 ] 🎬 أفلام ومسلسلات
[ 3 ] 🎁 بطاقات هدايا
[ 4 ] 🤖 ذكاء اصطناعي
[ 5 ] 💬 تطبيقات التواصل

✍️ *طريقة الاختيار:* فقط اكتب الرقم (مثال: *1*) ثم اضغط إرسال.`;

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
            console.log('\n🟢 البوت المعدل مع الإرشادات المناسبة يعمل بنجاح! 🚀\n');
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
                    await sock.sendMessage(from, { text: `🎮 *يرجى اختيار اللعبة التي ترغب بشحنها:*

[ 1 ] ببجي موبايل 👑
[ 2 ] فري فاير 💎

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب رقم اللعبة (مثلاً: *1*) ثم أرسل.` });
                } else if (text === '2') {
                    session.parentCategory = 'media';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🎬 *يرجى تحديد الخدمة الترفيهية التي تفضلها:*

[ 1 ] نيتفليكس 🍿
[ 2 ] شاهد 🎬
[ 3 ] أمازون برايم 🎥
[ 4 ] تود ⚽

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب رقم الخدمة ثم أرسل.` });
                } else if (text === '3') {
                    session.parentCategory = 'gift';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🎁 *يرجى اختيار نوع بطاقة الهدايا الرقمية:*

[ 1 ] بطاقات iTunes الهدايا 🍏
[ 2 ] بطاقات Google Play 🤖

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.` });
                } else if (text === '4') {
                    session.parentCategory = 'ai';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `🤖 *يرجى اختيار أداة الذكاء الاصطناعي:*

[ 1 ] اشتراكات ChatGPT 🧠
[ 2 ] اشتراكات Gemini AI 🤖

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.` });
                } else if (text === '5') {
                    session.parentCategory = 'social';
                    session.step = 'AWAITING_SUBCATEGORY';
                    await sock.sendMessage(from, { text: `💬 *يرجى تحديد الخدمة التي ترغب بها:*

[ 1 ] متابعين انستقرام 📸
[ 2 ] متابعين تيك توك 🎵
[ 3 ] اشتراك سناب شات بلس 👻

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.` });
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

                    let packMsg = `📦 *باقات [ ${sub.title} ] المتاحة:*\n\n`;
                    sub.rows.forEach((row, index) => {
                        packMsg += `[ ${index + 1} ] ${row.title} -> ${row.price}\n`;
                    });
                    packMsg += `\n[ 0 ] العودة للقائمة السابقة ↩️\n[ # ] العودة للقائمة الرئيسية 🏠\n\n✍️ *الرجاء كتابة رقم الباقة المناسبة لك وإرساله:*`;

                    await sock.sendMessage(from, { text: packMsg });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ اختيار غير صحيح، يرجى كتابة أحد الأرقام المتاحة في القائمة أعلاه." });
                }
                return;
            }

            // 🛑 الخطوة 4: اختيار الباقة وتوليد رقم الطلب (Order ID)
            if (session.step === 'AWAITING_PACKAGE') {
                if (text === '0') {
                    session.step = 'WELCOME';
                    let simulated = '1';
                    if (session.parentCategory === 'media') simulated = '2';
                    else if (session.parentCategory === 'gift') simulated = '3';
                    else if (session.parentCategory === 'ai') simulated = '4';
                    else if (session.parentCategory === 'social') simulated = '5';
                    
                    session.step = 'AWAITING_CATEGORY';
                    if (simulated === '1') await sock.sendMessage(from, { text: `🎮 *يرجى اختيار اللعبة التي ترغب بشحنها:*

[ 1 ] ببجي موبايل 👑
[ 2 ] فري فاير 💎

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب رقم اللعبة (مثلاً: *1*) ثم أرسل.` });
                    if (simulated === '2') await sock.sendMessage(from, { text: `🎬 *يرجى تحديد الخدمة الترفيهية التي تفضلها:*

[ 1 ] نيتفليكس 🍿
[ 2 ] شاهد 🎬
[ 3 ] أمازون برايم 🎥
[ 4 ] تود ⚽

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب رقم الخدمة ثم أرسل.` });
                    if (simulated === '3') await sock.sendMessage(from, { text: `🎁 *يرجى اختيار نوع بطاقة الهدايا الرقمية:*

[ 1 ] بطاقات iTunes الهدايا 🍏
[ 2 ] بطاقات Google Play 🤖

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.` });
                    if (simulated === '4') await sock.sendMessage(from, { text: `🤖 *يرجى اختيار أداة الذكاء الاصطناعي:*

[ 1 ] اشتراكات ChatGPT 🧠
[ 2 ] اشتراكات Gemini AI 🤖

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.` });
                    if (simulated === '5') await sock.sendMessage(from, { text: `💬 *يرجى تحديد الخدمة التي ترغب بها:*

[ 1 ] متابعين انستقرام 📸
[ 2 ] متابعين تيك توك 🎵
[ 3 ] اشتراك سناب شات بلس 👻

[ 0 ] العودة للقائمة الرئيسية ↩️

✍️ اكتب الرقم ثم أرسل.` });
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
                        await sock.sendMessage(from, { text: `✍️ *لقد اخترت شحن [ ${selectedPack.title} ]*\n\nيرجى كتابة *ID اللاعب (الآيدي الخاص بك باللعبة)* بدقة الآن وإرساله في رسالة واحدة.` });
                    } else if (cat === 'social') {
                        session.step = 'AWAITING_USER_INPUT';
                        await sock.sendMessage(from, { text: `✍️ *لقد اخترت خدمة [ ${selectedPack.title} ]*\n\nيرجى كتابة *اسم مستخدم الحساب (Username)* الخاص بك بدقة الآن (بدون كلمة مرور) لتنفيذ الخدمة عليه.` });
                    } else {
                        session.userInput = "لا يتطلب بيانات إضافية";
                        session.step = 'AWAITING_PAYMENT_IMAGE';

                        const summaryText = `📋 *ملخص تفاصيل طلبك:*\n` +
                                            `• *رقم الطلب:* ${session.orderId}\n` +
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

            // 🛑 الخطوة 5: استلام البيانات والتحقق السريع
            if (session.step === 'AWAITING_USER_INPUT' && text !== '') {
                session.userInput = text;
                session.step = 'AWAITING_CONFIRMATION';

                const confirmPrompt = `🔍 *يرجى التأكد من البيانات التي أدخلتها لضمان دقة التنفيذ:*\n\n👤 البيانات التي كتبتَها: *${text}*\n\nيرجى الرد برقم الاختيار المناسب 👇:\n[ 1 ] تأكيد وصحيحة ✅\n[ 2 ] التعديل (إعادة الكتابة) ✍️`;
                await sock.sendMessage(from, { text: confirmPrompt });
                return;
            }

            // 🛑 الخطوة 5 مكرر: معالجة التأكيد
            if (session.step === 'AWAITING_CONFIRMATION') {
                if (text === '1') {
                    session.step = 'AWAITING_PAYMENT_IMAGE';

                    const summaryText = `📋 *ملخص تفاصيل طلبك المؤكد:*\n` +
                                        `• *رقم الطلب:* ${session.orderId}\n` +
                                        `• *الخدمة:* ${session.subCategoryTitle}\n` +
                                        `• *الباقة:* ${session.packageSelected}\n` +
                                        `• *البيانات:* ${session.userInput}\n\n` +
                                        `${paymentInfo}`;

                    await sock.sendMessage(from, { text: summaryText });
                } else if (text === '2') {
                    session.step = 'AWAITING_USER_INPUT';
                    await sock.sendMessage(from, { text: "✍️ حسناً، يرجى كتابة البيانات الصحيحة بدقة الآن وإرسالها:" });
                } else {
                    await sock.sendMessage(from, { text: "⚠️ خيار غير صحيح. يرجى الرد بكتابة الرقم (1) للتأكيد أو الرقم (2) للتعديل." });
                }
                return;
            }

            // 🛑 الخطوة 6: استقبال إيصال الدفع وتنبيه الإدارة فوراً
            if (session.step === 'AWAITING_PAYMENT_IMAGE') {
                if (text === '#') {
                    delete userSessions[from];
                    await sock.sendMessage(from, { text: "🔄 تم إلغاء طلبك السابق بنجاح وجاري إعادتك..." });
                    await sock.sendMessage(from, { text: mainMenuText });
                    userSessions[from] = { step: 'AWAITING_CATEGORY', parentCategory: '', subCategoryKey: '', subCategoryTitle: '', packageSelected: '', userInput: '', orderId: '' };
                    return;
                }

                if (isImage) {
                    // 1. إشعار الزبون بنجاح العملية
                    const finalGoodbyeMsg = `🎉 *تم استلام طلبك رقم [ ${session.orderId} ] وصورة الإيصال بنجاح!* 🎉\n\n` +
                                            `⚡ فريق عمل *Rim Digital* قد استلم التفاصيل وبدأ العمل على تنفيذ طلبك فوراً، و**سوف ننجز الخدمة لك في أقل من 24 ساعة** إن شاء الله. ⏱️✨\n\n` +
                                            `نشكرك جزيل الشكر على ثقتك بنا وطاب يومك بكل خير وسعادة! 👋🌸`;
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
                    await sock.sendMessage(from, { text: "⚠️ يرجى إرسال لقطة الشاشة (الصورة) الخاصة بإيصال تحويل بنكيلي، سداد، أو بيم بنك لتأكيد وتجهيز طلبك.\n\n🔙 أو اكتب *#* للعودة إلى أول رسالة (القائمة الرئيسية) في حال غيّرت رأيك." });
                }
                return;
            }

        } catch (error) {
            console.error("خطأ:", error);
        }
    });
}

startBot().catch(err => console.error("خطأ تشغيل البوت:", err));
