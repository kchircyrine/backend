const nodemailer = require('nodemailer');
const config = require('../config/mailer');

const transport = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.MAILGUN_USER,
        pass: config.MAILGUN_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = {
    sendEmail(from, to, subject, html) {
        return new Promise((resolve, reject) => {
            transport.sendMail({from, subject, to, html}, (err, info) => {
                if (err) reject(err);
                else {

                    resolve(info);
                    transport.close();
                }
            });
        });
    },
    sendOrder(from, to, subject, html, attachments) {
        var mailOptions = {
            from: from,
            to: to,
            subject: subject,
            attachments: attachments,
            html: html
        };

        return new Promise((resolve, reject) => {
            transport.sendMail(mailOptions, (err, info) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(info);
                    transport.close();
                }

            });
        });
    }
}

