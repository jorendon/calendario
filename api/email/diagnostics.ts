import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

function getSmtpUser(): string | undefined {
  return (
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER ||
    process.env.MAIL_USER ||
    process.env.EMAIL_USERNAME
  )?.trim();
}

function getSmtpPass(): string | undefined {
  return (
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.MAIL_PASS ||
    process.env.MAIL_PASSWORD
  )?.replace(/\s+/g, '');
}

function getResendKey(): string | undefined {
  return (
    process.env.RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    process.env.RESEND_TOKEN
  )?.trim();
}

function getEmailConfig() {
  const smtpUser = getSmtpUser();
  const smtpPass = getSmtpPass();
  const resendApiKey = getResendKey();
  const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  const isSmtp = Boolean(smtpUser && smtpPass);
  const isResend = Boolean(resendApiKey);

  const detectedEnvKeys = Object.keys(process.env).filter(key =>
    /smtp|mail|resend|gmail/i.test(key)
  );

  return {
    isConfigured: isSmtp || isResend,
    provider: (isSmtp ? 'smtp' : isResend ? 'resend' : 'none') as 'smtp' | 'resend' | 'none',
    detectedEnvKeys,
    smtp: {
      hasUser: Boolean(smtpUser),
      hasPass: Boolean(smtpPass),
      user: smtpUser
        ? smtpUser.includes('@')
          ? smtpUser.replace(/^(.{3}).*(@.*)$/, '$1***$2')
          : smtpUser
        : null,
      host: smtpHost,
      port: smtpPort
    },
    resend: {
      hasKey: Boolean(resendApiKey),
      from: process.env.EMAIL_FROM?.trim() || 'Calendario Compartido <onboarding@resend.dev>'
    }
  };
}

async function sendDirectEmail(to: string[], subject: string, html: string) {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    return {
      sent: false,
      reason: 'not_configured',
      message: 'No hay credenciales de correo configuradas en Vercel.'
    };
  }

  const smtpUser = getSmtpUser();
  const smtpPass = getSmtpPass();
  const resendApiKey = getResendKey();

  // 1. SMTP / Gmail
  if (config.provider === 'smtp' && smtpUser && smtpPass) {
    try {
      const cleanUser = smtpUser.trim();
      const cleanPass = smtpPass.replace(/\s+/g, '');
      const isGmail = config.smtp.host.includes('gmail') || cleanUser.includes('gmail');

      const transporter = nodemailer.createTransport(
        isGmail
          ? ({
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              family: 4,
              auth: {
                user: cleanUser,
                pass: cleanPass
              },
              connectionTimeout: 5000,
              greetingTimeout: 5000,
              socketTimeout: 5000
            } as any)
          : ({
              host: config.smtp.host,
              port: config.smtp.port,
              secure: config.smtp.port === 465,
              family: 4,
              auth: {
                user: cleanUser,
                pass: cleanPass
              },
              connectionTimeout: 5000,
              greetingTimeout: 5000,
              socketTimeout: 5000
            } as any)
      );

      const fromAddress = process.env.EMAIL_FROM?.trim() || `"Calendario Compartido" <${cleanUser}>`;

      const sendPromise = transporter.sendMail({
        from: fromAddress,
        to: to.join(', '),
        subject,
        html
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Tiempo de espera agotado (6s) al conectar con smtp.gmail.com. Verifica las credenciales de Google.'
              )
            ),
          6500
        )
      );

      const info = (await Promise.race([sendPromise, timeoutPromise])) as any;
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      console.error('SMTP test error:', err);
      let friendlyError = err.message || String(err);
      if (
        friendlyError.includes('535') ||
        friendlyError.includes('BadCredentials') ||
        friendlyError.includes('Username and Password not accepted')
      ) {
        friendlyError =
          'Google rechazó la contraseña. Asegúrate de usar una "Contraseña de aplicación" de 16 letras generada en myaccount.google.com/apppasswords, no tu contraseña habitual de Gmail.';
      }
      return { sent: false, provider: 'smtp', error: friendlyError };
    }
  }

  // 2. Resend via direct HTTP API
  if (config.provider === 'resend' && resendApiKey) {
    try {
      const fromAddress = process.env.EMAIL_FROM?.trim() || 'Calendario Compartido <onboarding@resend.dev>';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to,
          subject,
          html
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          sent: false,
          provider: 'resend',
          error: data.message || data.error?.message || JSON.stringify(data),
          details: data
        };
      }

      return { sent: true, provider: 'resend', id: data.id };
    } catch (err: any) {
      return { sent: false, provider: 'resend', error: err.message || String(err) };
    }
  }

  return { sent: false, reason: 'unknown', error: 'No se pudo inicializar ningún proveedor de correo.' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getEmailConfig();

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        config
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      body = body || {};

      const targetEmail = body.targetEmail || 'Jonathan.rendon@gmail.com';

      if (!config.isConfigured) {
        return res.status(200).json({
          success: false,
          reason: 'not_configured',
          message: 'No hay credenciales de correo configuradas en Vercel.',
          troubleshooting: [
            'Opción A (Recomendada - Gmail): Agrega en Vercel SMTP_USER y SMTP_PASS (la contraseña de aplicación de 16 letras de Google). No requiere comprar dominio.',
            'Opción B (Resend): Agrega RESEND_API_KEY y configura tu dominio en resend.com/domains.'
          ],
          config
        });
      }

      const testSubject = `🧪 Prueba de Notificación - Calendario Compartido`;
      const testHtml = `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #818cf8; margin-top: 0;">✅ ¡El sistema de correos está funcionando correctamente!</h2>
          <p style="color: #cbd5e1; font-size: 14px;">
            Este es un correo de prueba enviado desde tu aplicación <strong>Calendario Compartido</strong>.
          </p>
          <div style="background-color: #1e293b; padding: 12px; border-radius: 8px; font-size: 13px; color: #94a3b8; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Proveedor:</strong> ${config.provider.toUpperCase()}</p>
            <p style="margin: 4px 0;"><strong>Destinatario:</strong> ${targetEmail}</p>
            <p style="margin: 4px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #34d399; font-size: 13px; font-weight: 600;">
            A partir de ahora recibirás avisos al crear tareas, completarlas y recordatorios matutinos.
          </p>
        </div>
      `;

      const result = await sendDirectEmail([targetEmail], testSubject, testHtml);

      if (result.sent) {
        return res.status(200).json({
          success: true,
          message: `Correo de prueba enviado exitosamente a ${targetEmail} vía ${result.provider}.`,
          result
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `No se pudo enviar el correo con ${result.provider || config.provider}.`,
          error: result.error || result.reason,
          troubleshooting:
            result.provider === 'resend' && String(result.error).includes('only send testing emails')
              ? 'Resend con dominio de prueba (onboarding@resend.dev) sólo permite enviar al correo registrado en Resend. Para enviar a otros (ej. Jonathan y Michelle a la vez), verifica un dominio en resend.com/domains o usa Gmail (SMTP_USER y SMTP_PASS).'
              : 'Verifica las credenciales en Vercel Environment Variables y que hayas hecho Redeploy.',
          result
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Unhandled error in /api/email/diagnostics:', err);
    return res.status(200).json({
      success: false,
      message: 'Ocurrió un error en el servidor al procesar la solicitud.',
      error: err.message || String(err)
    });
  }
}
