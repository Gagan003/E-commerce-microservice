require("dotenv").config();
const axios = require("axios");

async function sendSMS(phone, message) {

    try {

        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "v3",
                message: message,
                language: "english",
                flash: 0,
                numbers: phone
            },
            {
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("SMS sent:", response.data);

    } catch (error) {
        console.error("SMS error:", error.response?.data || error.message);
    }
}


module.exports = { sendSMS };