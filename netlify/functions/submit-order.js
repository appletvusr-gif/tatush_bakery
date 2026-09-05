exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const orderData = JSON.parse(event.body);

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const JSONBIN_ID = process.env.JSONBIN_ID;
        const JSONBIN_KEY = process.env.JSONBIN_KEY;

        // 1. שליחת הודעה לטלגרם
        const orderText = `🚨 הזמנה חדשה התקבלה!\n\n` +
                          `👤 שם: ${orderData.name}\n` +
                          `📞 טלפון: ${orderData.phone}\n` +
                          `🏠 כתובת: ${orderData.address}\n` +
                          `📅 מועד: ${orderData.slot}\n` +
                          `🛒 פריטים:\n- ${orderData.items.join('\n- ')}\n\n` +
                          `💰 סה"כ: ₪${orderData.total}\n` +
                          `⏰ זמן ביצוע: ${orderData.date}`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: orderText
            })
        });

        // 2. שמירה ב-JSONBin
        const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });

        let existingOrders = [];
        if (getResponse.ok) {
            const data = await getResponse.json();
            if (Array.isArray(data.record)) {
                existingOrders = data.record;
            } else if (data.record && Array.isArray(data.record.orders)) {
                existingOrders = data.record.orders;
            }
        }

        existingOrders.push(orderData);

        await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_KEY
            },
            body: JSON.stringify(existingOrders)
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Server error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
