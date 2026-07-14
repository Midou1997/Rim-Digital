const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

async function startBot() {
    // 1. إعداد حفظ الجلسة في مجلد session_auth المرتبط بالـ Volume في Railway
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');

    // 2. جلب رقم الهاتف من متغيرات البيئة تلقائياً
    const phoneNumber = process.env.PHONE_NUMBER;

    // 3. إنشاء اتصال الواتساب
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: !phoneNumber, // يطبع QR كخيار احتياطي إذا لم يوجد رقم
        logger: pino({ level: 'silent' }) // إيقاف السجلات المزعجة لتسهيل قراءة كود الربط
    });

    // 4. طلب كود الربط من سيرفرات واتساب مع تأخير ذكي 6 ثوانٍ لاستقرار الشبكة
    if (phoneNumber && !sock.authState.creds.registered) {
        console.log(`\n[+] تم اكتشاف الرقم المضاف في السيرفر: ${phoneNumber}`);
        console.log("[+] جاري الاتصال الآمن مع سيرفرات واتساب... انتظر 6 ثوانٍ...");
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                // تنسيق كود الربط ليكون مقروءاً وسهلاً للنسخ (مثال: ABCD-EFGH)
                let formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n==============================================`);
                console.log(`🔑 كود ربط الواتساب الخاص بك هو: ${formattedCode}`);
                console.log(`==============================================\n`);
            } catch (err) {
                console.error("[-] فشل في توليد كود الربط، سيعيد السيرفر المحاولة تلقائياً:", err.message);
            }
        }, 6000);
    }

    // 5. حفظ بيانات الجلسة تلقائياً
    sock.ev.on('creds.update', saveCreds);

    // 6. إدارة حالة الاتصال وإعادة التشغيل التلقائي عند الانقطاع
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) 
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut 
                : true;
            
            console.log('[-] انقطع الاتصال بسبب:', lastDisconnect.error?.message || 'مشكلة شبكة مؤقتة');
            if (shouldReconnect) {
                console.log('[+] جاري إعادة تشغيل البوت تلقائياً خلال 5 ثوانٍ...');
                setTimeout(() => startBot(), 5000);
            } else {
                console.log('[-] تم تسجيل الخروج من واتساب. يرجى مسح الجلسة القديمة وإعادة الربط.');
            }
        } else if (connection === 'open') {
            console.log('\n==============================================');
            console.log('🟢 تم تشغيل بوت Rim Digital بنجاح وهو متصل الآن! 🚀');
            console.log('==============================================\n');
        }
    });

    // 7. استقبال الرسائل والرد التلقائي (تعديل بسيط لخدمة زبائن متجرك)
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // نظام رد تلقائي ترحيبي بسيط (يمكنك تعديله وتطويره لاحقاً)
        if (text.toLowerCase() === 'السلام عليكم' || text.toLowerCase() === 'مرحبا' || text.toLowerCase() === 'هلا') {
            await sock.sendMessage(from, { 
                text: 'وعليكم السلام ورحمة الله وبركاته! مرحباً بك في متجر Rim Digital 🏪. كيف يمكننا مساعدتك اليوم؟ 🤖✨' 
            });
        }
    });
}

startBot().catch(err => console.error("خطأ غير متوقع في البوت:", err));
