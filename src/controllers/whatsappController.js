// src/controllers/whatsappController.js
const { globalApiKey } = require('../config')
const axios = require('axios')
const mysql = require('mysql2/promise');
const qrcode = require('qrcode');

/**
 * Save WhatsApp message to DB
 * @param {Object} webhookData
 */
async function handleWhatsappWebhook(webhookData) {
    var result;
    try {
        const db = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        });


        console.log(webhookData);
        if (webhookData && webhookData.dataType &&  webhookData.data && webhookData.data.message  && webhookData.data.message.id &&  !['media', 'loading_screen', 'authenticated', 'ready'].includes(webhookData.dataType)) {
            console.log("If Condition Success");
            const [rows] = await db.query(
                `INSERT
                  IGNORE
                  INTO
                  logs_whatsapp_webhook
                  (
                  is_processed,
                  whatsapp_json,
                  created_at,
                  updated_at
                  )
                  VALUES
                  (
                  0,
                  ?,
                  NOW(),
                  NOW()
                  )`,
                [
                    JSON.stringify(webhookData)
                ]
            );
        }else if(webhookData && webhookData.dataType && webhookData.dataType ==='qr' &&  webhookData.data && webhookData.data.qr){
            qrcode.toString(webhookData.data.qr, { type: 'terminal',small: true }, (err, url) => {
                if (err) throw err;
                console.log(url);
            });
        }
        result =  { success: true };
    } catch (error) {
        console.error('❌ Error saving WhatsApp message:', error);

        // Send mail to admin on failure
        await sendErrorEmailToAdmin(error, webhookData);
        result =  { success: false, error };
    }

    if (!result.success) {
        if(result && result.error) {
            console.error('Failed to save WhatsApp message:', result.error);
        }
    } else {
        console.log('Message saved successfully!');
    }
}

/**
 * Send email to admin when an error occurs
 */
async function sendErrorEmailToAdmin(error, data) {
    try {
        const sendWhatsappWebhookFailMailUrl = process.env.SEND_WHATSAPP_WEBHOOK_FAIL_MAIL_URL;
        axios.post(sendWhatsappWebhookFailMailUrl, [error, data], { headers: { 'x-api-key': globalApiKey } });
        console.log('📧 Admin notified about error.');
    } catch (mailError) {
        console.error('❌ Failed to send error email:', mailError);
    }
}

module.exports = { handleWhatsappWebhook };
