
const { subscribeToQueue } = require("./broker");
const { sendEmail } = require("../email");
const { sendSMS } = require("../sms");

module.exports = function () {

    // USER REGISTERED
    subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED", async (data) => {

        const name = `${data.fullName.firstName} ${data.fullName.lastName || ""}`;

        const emailHTMLTemplate = `
        <h1>Welcome to Our Service!</h1>
        <p>Dear ${name},</p>
        <p>Thank you for registering with us. We're excited to have you on board!</p>
        <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(
            data.email,
            "Welcome to Our Service",
            "Thank you for registering with us!",
            emailHTMLTemplate
        );

        if (data.phone) {
            await sendSMS(
                data.phone,
                `Hi ${data.fullName.firstName}, welcome to our platform 🎉`
            );
        }

    });


    // PAYMENT INITIATED
    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", async (data) => {

        const emailHTMLTemplate = `
        <h1>Payment Initiated</h1>
        <p>Dear ${data.username},</p>
        <p>Your payment of ${data.currency} ${data.amount} for order ID ${data.orderId} has been initiated.</p>
        <p>We will notify you once the payment is completed.</p>
        <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(
            data.email,
            "Payment Initiated",
            "Your payment is being processed",
            emailHTMLTemplate
        );

        if (data.phone) {
            await sendSMS(
                data.phone,
                `Payment initiated for order ${data.orderId}. Amount: ${data.currency} ${data.amount}`
            );
        }

    });


    // PAYMENT COMPLETED
    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {

        const emailHTMLTemplate = `
        <h1>Payment Successful!</h1>
        <p>Dear ${data.username},</p>
        <p>We have received your payment of ${data.currency} ${data.amount} for order ID ${data.orderId}.</p>
        <p>Thank you for your purchase!</p>
        <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(
            data.email,
            "Payment Successful",
            "We have received your payment",
            emailHTMLTemplate
        );

        if (data.phone) {
            await sendSMS(
                data.phone,
                `Payment successful for order ${data.orderId}. Thank you for your purchase!`
            );
        }

    });


    // PAYMENT FAILED
    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data) => {

        const emailHTMLTemplate = `
        <h1>Payment Failed</h1>
        <p>Dear ${data.username},</p>
        <p>Your payment for order ID ${data.orderId} has failed.</p>
        <p>Please try again or contact support.</p>
        <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(
            data.email,
            "Payment Failed",
            "Your payment could not be processed",
            emailHTMLTemplate
        );

        if (data.phone) {
            await sendSMS(
                data.phone,
                `Payment failed for order ${data.orderId}. Please try again.`
            );
        }

    });


    // PRODUCT CREATED
    subscribeToQueue("PRODUCT_NOTIFICATION.PRODUCT_CREATED", async (data) => {

        const emailHTMLTemplate = `
        <h1>New Product Available!</h1>
        <p>Dear ${data.username},</p>
        <p>A new product has been launched. Check it out now!</p>
        <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(
            data.email,
            "New Product Launched",
            "Check out our latest product",
            emailHTMLTemplate
        );

        if (data.phone) {
            await sendSMS(
                data.phone,
                `New product launched! Check it out on our platform.`
            );
        }

    });

};