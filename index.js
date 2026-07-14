const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

// كائن لحفظ وتتبع خطوة كل زبون (سجل الجلسات)
const userSessions = {};

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
            
            console.log('[-] انقطع الاتصال:', lastDisconnect.error?.message || 'مشكلة مؤقتة');
            if (shouldReconnect) {
                console.log('[+] جاري إعادة تشغيل البوت تلقائياً...');
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log('\n==============================================');
            console.log('🟢 بوت متجر Rim Digital متصل وجاهز لخدمة الزبائن! 🚀');
            console.log('==============================================\n');
        }
    });

    // 🟢 نظام استقبال الرسائل وتسلسل الخدمات الذكي
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
        const isImage = msg.message.imageMessage; // التحقق من وجود صورة

        // إذا كان المستخدم جديداً تماماً، ننشئ له جلسة جديدة
        if (!userSessions[from]) {
            userSessions[from] = { step: 'WELCOME', service: '', details: '' };
        }

        const session = userSessions[from];

        try {
            // 🛑 الخطوة 1: استقبال أي رسالة وعرض الخدمات
            if (session.step === 'WELCOME') {
                const welcomeMessage = `مرحباً بك في متجر Rim Digital 🏪✨\n\nيسعدنا خدمتك تلقائياً! يرجى اختيار الخدمة المطلوبة بإرسال *رقم الخدمة* فقط:\n\n` +
                                       `1️⃣ شحن ألعاب وحسابات (Free Fire / PUBG) 🎮\n` +
                                       `2️⃣ خدمات الدفع الرقمي والبطاقات 💳\n` +
                                       `3️⃣ اشتراكات برامج وترفيه (Netflix / IPTV) 🍿\n` +
                                       `4️⃣ طلب خاص أو استفسار عام 🛠️\n\n` +
                                       `_يرجى كتابة الرقم (1 أو 2 أو 3 أو 4) للبدء._`;
                
                await sock.sendMessage(from, { text: welcomeMessage });
                session.step = 'AWAITING_SERVICE_SELECTION';
                return;
            }

            // 🛑 الخطوة 2: معالجة اختيار الخدمة وطلب التفاصيل
            if (session.step === 'AWAITING_SERVICE_SELECTION') {
                let serviceName = '';
                if (text === '1') serviceName = 'شحن ألعاب وحسابات 🎮';
                else if (text === '2') serviceName = 'خدمات الدفع الرقمي والبطاقات 💳';
                else if (text === '3') serviceName = 'اشتراكات برامج وترفيه 🍿';
                else if (text === '4') serviceName = 'طلب خاص أو استفسار 🛠️';

                if (serviceName !== '') {
                    session.service = serviceName;
                    session.step = 'AWAITING_DETAILS';
                    
                    const detailsPrompt = `رائع! لقد اخترت خدمة: *[ ${serviceName} ]* ✅\n\n` +
                                          `الآن، يرجى كتابة تفاصيل طلبك بدقة في رسالة واحدة (مثل: رقم الأيدي، نوع الاشتراك، أو الإيميل المراد تفعيله).`;
                    await sock.sendMessage(from, { text: detailsPrompt });
                } else {
                    // في حال أدخل رقماً خاطئاً
                    await sock.sendMessage(from, { text: '❌ يرجى إرسال رقم صحيح من القائمة (1 أو 2 या 3 أو 4).' });
                }
                return;
            }

            // 🛑 الخطوة 3: استلام التفاصيل وطلب الصورة (لقطة الشاشة)
            if (session.step === 'AWAITING_DETAILS') {
                session.details = text;
                session.step = 'AWAITING_IMAGE';

                const imagePrompt = `تم تسجيل تفاصيل طلبك بنجاح! 📝\n\n` +
                                    `يرجى الآن إرسال *صورة (لقطة شاشة Screenshot)* لإثبات عملية الدفع أو تفاصيل حسابك لإتمام العملية. 📸`;
                await sock.sendMessage(from, { text: imagePrompt });
                return;
            }

            // 🛑 الخطوة 4: التحقق من إرسال الصورة وإنهاء الطلب مع رسالة الوداع والتوقيت
            if (session.step === 'AWAITING_IMAGE') {
                if (isImage) {
                    const finalMessage = `🎉 تم استلام طلبك وصورة التأكيد بنجاح!\n\n` +
                                         `📋 *ملخص طلبك:*\n` +
                                         `• الخدمة: ${session.service}\n` +
                                         `• التفاصيل: ${session.details}\n\n` +
                                         `⚡ نود إعلامك بأن فريق العمل قد استلم الطلب الآن، و**سوف ننجز خدمتك في أقل من 24 ساعة** إن شاء الله. ⏱️✨\n\n` +
                                         `شكراً لثقتك بمتجر Rim Digital! وداعاً ويومك سعيد. 👋🌸`;
                    
                    await sock.sendMessage(from, { text: finalMessage });
                    
                    // إعادة تعيين الجلسة للبدء من جديد عند مراسلته لاحقاً
                    delete userSessions[from];
                } else {
                    // إذا أرسل نصاً بدلاً من الصورة
                    await sock.sendMessage(from, { text: '⚠️ من فضلك، أرسل صورة (لقطة شاشة) لكي نتمكن من مراجعة الطلب والمتابعة.' });
                }
                return;
            }

        } catch (error) {
            console.error("حدث خطأ أثناء معالجة الرسالة:", error);
        }
    });
}

startBot().catch(err => console.error("خطأ غير متوقع:", err));
