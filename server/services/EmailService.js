// server/services/EmailService.js
const nodemailer = require('nodemailer');

// Configuração do Transporter (Use variáveis de ambiente!)
// Para Gmail: Use "Senha de App" (App Password), não sua senha normal.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // ex: 'no-reply@gecapix.com'
        pass: process.env.EMAIL_PASS  // ex: 'senha-de-app-google'
    }
});

exports.sendCode = async (to, code) => {
    const mailOptions = {
        from: '"GECA Security" <no-reply@gecapix.com>',
        to: to,
        subject: 'Código de Validação GECA',
        html: `
            <div style="font-family: monospace; padding: 20px; background: #0f172a; color: white;">
                <h2 style="color: #22d3ee;">Validação de Identidade</h2>
                <p>Seu código de acesso ao sistema é:</p>
                <h1 style="background: #1e293b; padding: 10px; border-radius: 8px; display: inline-block; letter-spacing: 5px;">${code}</h1>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">Este código expira em 15 minutos.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};