import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(
      `\n[EMAIL → ${opts.to}]\nAssunto: ${opts.subject}\n${opts.text}\n`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "GastoClaro <noreply@gastoclaro.com>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const link = `${baseUrl}/verify-email?token=${token}`;
  const subject = "Confirme seu e-mail — GastoClaro";
  const text = `Olá, ${name}!\n\nConfirme seu e-mail clicando no link abaixo:\n${link}\n\nEste link expira em 24 horas.\n\nSe você não criou uma conta no GastoClaro, ignore este e-mail.`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;background:#fff;border-radius:16px;">
      <h2 style="color:#18181b;margin-bottom:8px;">Confirme seu e-mail</h2>
      <p style="color:#52525b;">Olá, <strong>${name}</strong>!</p>
      <p style="color:#52525b;">Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta no <strong>GastoClaro</strong>.</p>
      <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#d4a017,#b8860b);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
        Confirmar e-mail
      </a>
      <p style="color:#71717a;font-size:13px;">Este link expira em <strong>24 horas</strong>. Se você não criou uma conta no GastoClaro, ignore este e-mail.</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
      <p style="color:#a1a1aa;font-size:12px;word-break:break-all;">Ou cole este endereço no navegador:<br><a href="${link}" style="color:#d4a017;">${link}</a></p>
    </div>
  `;
  return sendEmail({ to: email, subject, html, text });
}
