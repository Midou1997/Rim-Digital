const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

// كائن لحفظ وتتبع حالة العميل خطوة بخطوة
const userSessions = {};

// 🗂️ قاعدة بيانات الأقسام الفرعية والأسعار لجميع الأقسام الـ 5
const packages = {
    // 🎮 قسم الألعاب
    sub_pubg: {
        parent: "games",
        title: "شدات ببجي موبايل (UC) 👑",
        rows: [
            { title: "60 UC", rowId: "pkg_pubg_60", description: "السعر: 50 MRU" },
            { title: "120 UC", rowId: "pkg_pubg_120", description: "السعر: 100 MRU" },
            { title: "325 UC", rowId: "pkg_pubg_325", description: "السعر: 230 MRU" },
            { title: "385 UC", rowId: "pkg_pubg_385", description: "السعر: 280 MRU" },
            { title: "660 UC", rowId: "pkg_pubg_660", description: "السعر: 450 MRU" },
            { title: "720 UC", rowId: "pkg_pubg_720", description: "السعر: 500 MRU" },
            { title: "1800 UC", rowId: "pkg_pubg_1800", description: "السعر: 1100 MRU" },
            { title: "3850 UC", rowId: "pkg_pubg_3850", description: "السعر: 2150 MRU" }
        ]
    },
    sub_ff: {
        parent: "games",
        title: "جواهر فري فاير (Diamonds) 💎",
        rows: [
            { title: "210 Diamonds", rowId: "pkg_ff_210", description: "السعر: 135 MRU" },
            { title: "310 Diamonds", rowId: "pkg_ff_310", description: "السعر: 195 MRU" },
            { title: "530 Diamonds", rowId: "pkg_ff_530", description: "السعر: 330 MRU" },
            { title: "1060 Diamonds", rowId: "pkg_ff_1060", description: "السعر: 600 MRU" },
            { title: "2180 Diamonds", rowId: "pkg_ff_2180", description: "السعر: 1230 MRU" },
            { title: "5600 Diamonds", rowId: "pkg_ff_5600", description: "السعر: 2865 MRU" },
            { title: "11500 Diamonds", rowId: "pkg_ff_11500", description: "السعر: 5670 MRU" }
        ]
    },
    // 🎬 قسم المسلسلات والأفلام
    sub_netflix: {
        parent: "media",
        title: "اشتراكات Netflix / Shahid VIP / TOD / Prime 🍿",
        rows: [
            { title: "Netflix / Shahid / Prime / TOD - شهر", rowId: "pkg_net_1", description: "السعر: 200 MRU" },
            { title: "Netflix / Shahid / Prime / TOD - شهرين", rowId: "pkg_net_2", description: "السعر: 350 MRU" },
            { title: "Netflix / Shahid / Prime / TOD - 3 أشهر", rowId: "pkg_net_3", description: "السعر: 550 MRU" }
        ]
    },
    sub_iptv: {
        parent: "media",
        title: "باقات بريميوم / IPTV 📺",
        rows: [
            { title: "باقة IPTV - شهر واحد", rowId: "pkg_ip_1", description: "السعر: 250 MRU" },
            { title: "باقة IPTV - شهرين", rowId: "pkg_ip_2", description: "السعر: 400 MRU" },
            { title: "باقة IPTV - 3 أشهر", rowId: "pkg_ip_3", description: "السعر: 800 MRU" }
        ]
    },
    // 🎁 قسم البطاقات الرقمية
    sub_itunes: {
        parent: "gift",
        title: "بطاقات iTunes الهدايا 🎁",
        rows: [
            { title: "بطاقة iTunes 5$", rowId: "pkg_it_5", description: "السعر: 250 MRU" },
            { title: "بطاقة iTunes 10$", rowId: "pkg_it_10", description: "السعر: 500 MRU" },
            { title: "بطاقة iTunes 20$", rowId: "pkg_it_20", description: "السعر: 1000 MRU" }
        ]
    },
    sub_gplay: {
        parent: "gift",
        title: "بطاقات Google Play 🎁",
        rows: [
            { title: "بطاقة Google Play 5$", rowId: "pkg_gp_5", description: "السعر: 250 MRU" },
            { title: "بطاقة Google Play 10$", rowId: "pkg_gp_10", description: "السعر: 500 MRU" },
            { title: "بطاقة Google Play 20$", rowId: "pkg_gp_20", description: "السعر: 1000 MRU" }
        ]
    },
    // 🤖 قسم الذكاء الاصطناعي
    sub_chatgpt: {
        parent: "ai",
        title: "اشتراكات ChatGPT 🧠",
        rows: [
            { title: "ChatGPT Plus", rowId: "pkg_gpt_plus", description: "السعر: 1000 MRU" },
            { title: "ChatGPT Go", rowId: "pkg_gpt_go", description: "السعر: 400 MRU" }
        ]
    },
    sub_gemini: {
        parent: "ai",
        title: "اشتراكات Gemini AI 🤖",
        rows: [
            { title: "Gemini Plus", rowId: "pkg_gem_plus", description: "السعر: 318 MRU" },
            { title: "Gemini Advanced", rowId: "pkg_gem_adv", description: "السعر: 796 MRU" },
            { title: "Gemini Ultra", rowId: "pkg_gem_ultra", description: "السعر: 3980 MRU" }
        ]
    },
    // 💬 قسم تطبيقات التواصل (السوشيال ميديا)
    sub_insta: {
        parent: "social",
        title: "متابعين انستقرام (Instagram) 📸",
        rows: [
            { title: "انستقرام 500 متابع", rowId: "pkg_ins_500", description: "السعر: 150 MRU" },
            { title: "انستقرام 1000 متابع", rowId: "pkg_ins_1000", description: "السعر: 300 MRU" },
            { title: "انستقرام 2000 متابع", rowId: "pkg_ins_2000", description: "السعر: 500 MRU" },
            { title: "انستقرام 5000 متابع", rowId: "pkg_ins_5000", description: "السعر: 800 MRU" },
            { title: "انستقرام 7000 متابع", rowId: "pkg_ins_10000", description: "السعر: 1000 MRU" },
            { title: "انستقرام 10000 متابع", rowId: "pkg_ins_15000", description: "السعر: 1500 MRU" }
        ]
    },
    sub_tiktok: {
        parent: "social",
        title: "متابعين تيك توك (TikTok) 🎵",
        rows: [
            { title: "تيك توك 1000 متابع", rowId: "pkg_tk_1000", description: "السعر: 400 MRU" },
            { title: "تيك توك 2000 متابع", rowId: "pkg_tk_2000", description: "السعر: 700 MRU" },
            { title: "تيك توك 3000 متابع", rowId: "pkg_tk_3000", description: "السعر: 10000 MRU" },
            { title: "تيك توك 5000 متابع", rowId: "pkg_tk_5000", description: "السعر: 16000 MRU" },
            { title: "تيك توك 8000 متابع", rowId: "pkg_tk_8000", description: "السعر: 23000 MRU" },
            { title: "تيك توك 10000 متابع", rowId: "pkg_tk_10000", description: "السعر: 29000 MRU" }
        ]
    },
    sub_snap: {
        parent: "social",
        title: "اشتراك سناب شات بلس (Snapchat+) 👻",
        rows: [
            { title: "سناب بلس - 3 أشهر", rowId: "pkg_snp_3", description: "السعر: 310 MRU" },
            { title: "سناب بلس - 6 أشهر", rowId: "pkg_snp_6", description: "السعر: 650 MRU" },
            { title: "سناب بلس - سنة كاملة", rowId: "pkg_snp_12", description: "السعر: 1000 MRU" }
        ]
    }
};

// 💳 معلومات الدفع الموريتانية المعتمدة لدى متجرك
const paymentInfo = `💳 *طريقة الدفع المعتمدة لدى متجر Rim Digital:*\n\n` +
                    `يرجى تحويل قيمة الطلب إلى الرقم الموحد التالي:\n` +
                    `📱 الرقم: *41010750*\n\n` +
                    `وذلك عبر أحد التطبيقات المتاحة لديك:\n` +
                    `• *بنكيلي (Bankily)* 📲\n` +
                    `• *سداد (Sadad)* 📲\n` +
                    `• *بيم بنك (Bim Bank)* 📲\n\n` +
                    `📸 *الخطوة الأخيرة:* بعد إتمام عملية الدفع، يرجى إرسال *لقطة شاشة (Screenshot)* واضحة للإيصال هنا لتأكيد طلبك وتجهيزه فوراً.`;

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
            console.log('\n🟢 البوت المطور (بنكيلي - سداد - بيم بنك) يعمل بنجاح! 🚀\n');
        }
    });

    // إدارة خطوات المحادثة بديناميكية ذكية
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        
        const listResponse = msg.message.listResponseMessage;
        const selectedRowId = listResponse?.singleSelectReply?.selectedRowId;
        const selectedTitle = listResponse?.title;
        const isImage = msg.message.imageMessage;

        // تهيئة الجلسة
        if (!userSessions[from]) {
            userSessions[from] = { step: 'WELCOME', parentCategory: '', subCategory: '', packageSelected: '', userInput: '' };
        }

        const session = userSessions[from];

        try {
            // 🛑 1. العميل يرسل أي رسالة -> ترحيب وعرض الأقسام الخمسة كاملة
            if (session.step === 'WELCOME' && !selectedRowId) {
                const welcomeList = {
                    text: "أهلاً بك في متجر *Rim Digital*! شكراً جزيلاً لتواصلك معنا وثقتك بنا 🏪✨\n\n" +
                           "يسعدنا خدمتك تلقائياً وتسهيل طلبك. يرجى الضغط على الزر أدناه واختيار القسم الذي تريده لبدء طلبك مباشرة 👇:",
                    title: "🏪 متجر Rim Digital",
                    buttonText: "اختر القسم من هنا 📋",
                    footer: "خدمة سريعة وآمنة على مدار الساعة",
                    sections: [
                        {
                            title: "📂 أقسام المتجر المتاحة",
                            rows: [
                                { title: "العاب", rowId: "cat_games", description: "ببجي موبايل وفري فاير 🎮" },
                                { title: "مسلسلات افلام", rowId: "cat_media", description: "نيتفليكس، شاهد، وتود وباقات التلفزيون 🎬" },
                                { title: "بطاقات gift", rowId: "cat_gift", description: "بطاقات آيتونز وجوجل بلاي 🎁" },
                                { title: "ذكاء صناعي", rowId: "cat_ai", description: "حسابات شات جي بي تي وجيميني 🤖" },
                                { title: "تطبيقات تواصل", rowId: "cat_social", description: "متابعين واشتراكات تواصل اجتماعي 💬" }
                            ]
                        }
                    ]
                };

                await sock.sendMessage(from, welcomeList);
                session.step = 'AWAITING_CATEGORY';
                return;
            }

            // 🛑 2. تحديد القسم الفرعي المناسب
            if (session.step === 'AWAITING_CATEGORY' && selectedRowId) {
                if (selectedRowId === 'cat_games') {
                    session.parentCategory = 'games';
                    session.step = 'AWAITING_SUBCATEGORY';

                    const gamesList = {
                        text: "🎮 *يرجى اختيار اللعبة التي ترغب في شحنها من القائمة أدناه:*",
                        title: "الألعاب المتوفرة",
                        buttonText: "اختر اللعبة 🎮",
                        sections: [
                            {
                                title: "اختر لتبدأ الشحن",
                                rows: [
                                    { title: "PUBG Mobile (ببجي)", rowId: "sub_pubg", description: "شحن شدات ببجي" },
                                    { title: "Free Fire (فري فاير)", rowId: "sub_ff", description: "شحن جواهر فري فاير" }
                                ]
                            }
                        ]
                    };
                    await sock.sendMessage(from, gamesList);

                } else if (selectedRowId === 'cat_social') {
                    session.parentCategory = 'social';
                    session.step = 'AWAITING_SUBCATEGORY';

                    const socialList = {
                        text: "💬 *يرجى اختيار التطبيق الذي ترغب بالاستفادة من خدماته:*",
                        title: "تطبيقات التواصل",
                        buttonText: "اختر التطبيق 💬",
                        sections: [
                            {
                                title: "اختر المنصة",
                                rows: [
                                    { title: "انستغرام (Instagram)", rowId: "sub_insta", description: "شراء وزيادة متابعين" },
                                    { title: "تيك توك (TikTok)", rowId: "sub_tiktok", description: "شراء وزيادة متابعين" },
                                    { title: "سناب شات (Snapchat)", rowId: "sub_snap", description: "اشتراكات سناب بلس +" }
                                ]
                            }
                        ]
                    };
                    await sock.sendMessage(from, socialList);

                } else if (selectedRowId === 'cat_media') {
                    session.parentCategory = 'media';
                    session.step = 'AWAITING_SUBCATEGORY';

                    const mediaList = {
                        text: "🎬 *يرجى تحديد فئة الاشتراك الترفيهي الذي تفضله:*",
                        title: "ترفيه ومسلسلات",
                        buttonText: "اختر نوع الاشتراك 🎬",
                        sections: [
                            {
                                title: "الخيارات المتاحة",
                                rows: [
                                    { title: "Netflix / Shahid / Prime / TOD", rowId: "sub_netflix", description: "اشتراكات أفلام ومسلسلات منوعة" },
                                    { title: "IPTV / باقات بريميوم", rowId: "sub_iptv", description: "باقات تشغيل القنوات التلفزيونية" }
                                ]
                            }
                        ]
                    };
                    await sock.sendMessage(from, mediaList);

                } else if (selectedRowId === 'cat_gift') {
                    session.parentCategory = 'gift';
                    session.step = 'AWAITING_SUBCATEGORY';

                    const giftList = {
                        text: "🎁 *يرجى اختيار نوع بطاقة الهدايا الرقمية التي تبحث عنها:*",
                        title: "بطاقات الهدايا",
                        buttonText: "اختر بطاقتك 🎁",
                        sections: [
                            {
                                title: "البطاقات المتوفرة",
                                rows: [
                                    { title: "بطاقات iTunes", rowId: "sub_itunes", description: "متجر آبل" },
                                    { title: "بطاقات Google Play", rowId: "sub_gplay", description: "متجر أندرويد" }
                                ]
                            }
                        ]
                    };
                    await sock.sendMessage(from, giftList);

                } else if (selectedRowId === 'cat_ai') {
                    session.parentCategory = 'ai';
                    session.step = 'AWAITING_SUBCATEGORY';

                    const aiList = {
                        text: "🤖 *يرجى اختيار أداة الذكاء الاصطناعي التي ترغب بالاشتراك بها:*",
                        title: "أدوات الذكاء الاصطناعي",
                        buttonText: "اختر الأداة 🤖",
                        sections: [
                            {
                                title: "الأدوات المتوفرة",
                                rows: [
                                    { title: "ChatGPT", rowId: "sub_chatgpt", description: "مساعد OpenAI الذكي" },
                                    { title: "Gemini AI", rowId: "sub_gemini", description: "مساعد Google المتطور" }
                                ]
                            }
                        ]
                    };
                    await sock.sendMessage(from, aiList);
                }
                return;
            }

            // 🛑 3. العميل حدد الخدمة الفرعية -> عرض قائمة الأسعار والباقات بالـ MRU
            if (session.step === 'AWAITING_SUBCATEGORY' && selectedRowId) {
                if (packages[selectedRowId]) {
                    const selectedPack = packages[selectedRowId];
                    session.subCategory = selectedPack.title;
                    session.parentCategory = selectedPack.parent; // تأكيد تصنيف القسم الأب
                    session.step = 'AWAITING_PACKAGE';

                    const packageList = {
                        text: `📦 *إليك الباقات والأسعار الرسمية لخدمة [ ${selectedPack.title} ] بالـ (MRU):*\n\nيرجى الضغط أدناه واختيار الباقة التي تريدها 👇:`,
                        title: "الباقات المتاحة",
                        buttonText: "اختر الباقة المناسبة 🛍️",
                        sections: [
                            {
                                title: "اختر الباقة للشراء",
                                rows: selectedPack.rows
                            }
                        ]
                    };
                    await sock.sendMessage(from, packageList);
                }
                return;
            }

            // 🛑 4. العميل حدد الباقة -> تصفية ذكية بناءً على القسم الرئيسي المختار
            if (session.step === 'AWAITING_PACKAGE' && selectedRowId) {
                session.packageSelected = selectedTitle;

                // أ. إذا كانت اللعبة -> اسأله عن ID اللاعب
                if (session.parentCategory === 'games') {
                    session.step = 'AWAITING_USER_INPUT';
                    const promptText = `✍️ *لقد اخترت شحن [ ${selectedTitle} ]*\n\nيرجى كتابة *ID اللاعب (الآيدي الخاص بك باللعبة)* بدقة الآن وإرساله في رسالة واحدة.`;
                    await sock.sendMessage(from, { text: promptText });
                
                // ب. إذا كان سوشيال ميديا -> اسأله عن اسم المستخدم
                } else if (session.parentCategory === 'social') {
                    session.step = 'AWAITING_USER_INPUT';
                    const promptText = `✍️ *لقد اخترت خدمة [ ${selectedTitle} ]*\n\nيرجى كتابة *اسم مستخدم الحساب (Username)* الخاص بك بدقة الآن (بدون كلمة مرور) وإرساله في رسالة واحدة لتنفيذ الخدمة عليه.`;
                    await sock.sendMessage(from, { text: promptText });
                
                // ج. للأقسام الثلاثة الأخرى (أفلام، بطاقات، ذكاء اصطناعي) -> تجاوز السؤال واعرض الدفع فوراً دون أي إيميل أو حساب!
                } else {
                    session.userInput = "لا يتطلب بيانات";
                    session.step = 'AWAITING_PAYMENT_IMAGE';

                    const summaryText = `📋 *ملخص تفاصيل طلبك:*\n` +
                                        `• *الخدمة:* ${session.subCategory}\n` +
                                        `• *الباقة:* ${session.packageSelected}\n\n` +
                                        `${paymentInfo}`;

                    await sock.sendMessage(from, { text: summaryText });
                }
                return;
            }

            // 🛑 5. استقبال مدخلات العميل (ID أو اسم مستخدم) -> الانتقال المباشر للدفع
            if (session.step === 'AWAITING_USER_INPUT' && text !== '' && !selectedRowId) {
                session.userInput = text;
                session.step = 'AWAITING_PAYMENT_IMAGE';

                const summaryText = `📋 *ملخص تفاصيل طلبك:*\n` +
                                    `• *الخدمة:* ${session.subCategory}\n` +
                                    `• *الباقة:* ${session.packageSelected}\n` +
                                    `• *البيانات المرسلة:* ${text}\n\n` +
                                    `${paymentInfo}`;

                await sock.sendMessage(from, { text: summaryText });
                return;
            }

            // 🛑 6. استقبال صورة التحويل من العميل -> إرسال الشكر والوداع وحذف الجلسة
            if (session.step === 'AWAITING_PAYMENT_IMAGE') {
                if (isImage) {
                    // تكوين ملخص ديناميكي يظهر البيانات فقط إذا كانت متوفرة (للألعاب وسوشيال ميديا)
                    let detailsSummary = `• *الخدمة:* ${session.subCategory}\n` +
                                         `• *الباقة:* ${session.packageSelected}\n`;
                    
                    if (session.userInput && session.userInput !== "لا يتطلب بيانات") {
                        detailsSummary += `• *البيانات:* ${session.userInput}\n`;
                    }

                    const finalGoodbyeMsg = `🎉 *تم استلام طلبك وصورة إيصال الدفع بنجاح!* 🎉\n\n` +
                                            detailsSummary + `\n` +
                                            `⚡ فريق عمل *Rim Digital* قد استلم التفاصيل وبدأ العمل على تنفيذ طلبك فوراً، و**سوف ننجز الخدمة لك في أقل من 24 ساعة** إن شاء الله. ⏱️✨\n\n` +
                                            `نشكرك جزيل الشكر على ثقتك بنا وطاب يومك بكل خير وسعادة! 👋🌸`;

                    await sock.sendMessage(from, { text: finalGoodbyeMsg });
                    
                    // تنظيف الجلسة لاستقبال طلبات جديدة من نفس العميل
                    delete userSessions[from];
                } else {
                    await sock.sendMessage(from, { text: "⚠️ يرجى إرسال لقطة الشاشة (الصورة) الخاصة بإيصال تحويل بنكيلي، سداد، أو بيم بنك لتأكيد وتجهيز طلبك." });
                }
                return;
            }

        } catch (error) {
            console.error("حدث خطأ في التدفق المنطقي للبوت المحدث:", error);
        }
    });
}

startBot().catch(err => console.error("خطأ غير متوقع:", err));
