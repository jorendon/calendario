import nodemailer from 'nodemailer';
import type { DBTask } from './types.js';

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

export function getEmailConfig() {
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

export interface SendTaskEmailOptions {
  type: 'CREATED' | 'COMPLETED' | 'REMINDER';
  task?: DBTask;
  tasks?: DBTask[];
  calendarName?: string;
  recipients: string[];
  actionBy?: string;
}

export async function sendDirectEmail(to: string[], subject: string, html: string) {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    console.warn('[EMAIL WARNING] No email provider configured in environment variables.');
    return {
      sent: false,
      reason: 'not_configured',
      message: 'No hay credenciales de correo configuradas en Vercel (SMTP_USER/PASS o RESEND_API_KEY).'
    };
  }

  const smtpUser = getSmtpUser();
  const smtpPass = getSmtpPass();
  const resendApiKey = getResendKey();

  // 1. Prefer SMTP (Gmail / Custom SMTP)
  if (config.provider === 'smtp' && smtpUser && smtpPass) {
    try {
      const cleanUser = smtpUser.trim();
      const cleanPass = smtpPass.replace(/\s+/g, '');
      const isGmail = config.smtp.host.includes('gmail') || cleanUser.includes('gmail');

      const transporter = nodemailer.createTransport(
        isGmail
          ? {
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              family: 4, // CRITICAL for AWS Lambda / Vercel to prevent IPv6 hanging
              auth: {
                user: cleanUser,
                pass: cleanPass
              },
              connectionTimeout: 5000,
              greetingTimeout: 5000,
              socketTimeout: 5000
            } as any
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

      // Enforce timeout strictly before Vercel kills the lambda
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
                'Tiempo de espera agotado (6s) al conectar con smtp.gmail.com. Verifica que la contraseña de 16 letras de Google sea correcta.'
              )
            ),
          6500
        )
      );

      const info = (await Promise.race([sendPromise, timeoutPromise])) as any;

      console.log('Email sent successfully via SMTP:', info.messageId);
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      console.error('Failed to send email with SMTP:', err);
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

  // 2. Resend provider via direct API
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
        console.error('Resend API returned error:', data.error || data);
        return {
          sent: false,
          provider: 'resend',
          error: data.message || data.error?.message || JSON.stringify(data),
          details: data
        };
      }

      console.log('Email sent successfully via Resend:', data.id);
      return { sent: true, provider: 'resend', id: data.id };
    } catch (err: any) {
      console.error('Failed to send email with Resend:', err);
      return { sent: false, provider: 'resend', error: err.message || String(err) };
    }
  }

  return { sent: false, reason: 'unknown', error: 'No se pudo inicializar ningún proveedor de correo.' };
}

export async function notifyCalendarMembers(options: SendTaskEmailOptions) {
  const { type, task, tasks, calendarName = 'Hogar & Finanzas Compartidas', recipients, actionBy } = options;

  if (!recipients || recipients.length === 0) {
    console.warn('No recipients specified for email notification.');
    return { sent: false, reason: 'no-recipients' };
  }

  const primaryRecipients = recipients.filter(Boolean);
  let subject = '';
  let htmlContent = '';

  if (type === 'CREATED' && task) {
    subject = `📌 Nueva tarea creada: ${task.title}`;
    htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #818cf8; margin: 0; font-size: 24px;">📅 Calendario Compartido</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Calendario: <strong>${calendarName}</strong></p>
        </div>
        
        <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">${task.title}</h2>
          ${task.description ? `<p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">${task.description}</p>` : ''}
          
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">📅 Fecha límite:</td>
              <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600; font-size: 14px;">${task.due_date} ${task.due_time ? `(${task.due_time})` : ''}</td>
            </tr>
            ${task.amount ? `
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">💵 Monto / Pago:</td>
              <td style="color: #34d399; padding: 6px 0; font-weight: 700; font-size: 16px;">$${Number(task.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${task.currency || 'USD'}</td>
            </tr>` : ''}
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">🏷️ Categoría:</td>
              <td style="color: #e2e8f0; padding: 6px 0; font-size: 14px; text-transform: capitalize;">${task.category}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">👤 Creada por:</td>
              <td style="color: #e2e8f0; padding: 6px 0; font-size: 14px;">${task.created_by}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 24px;">
          Este correo fue enviado a los miembros de este calendario (${primaryRecipients.join(', ')}).
        </p>
      </div>
    `;
  } else if (type === 'COMPLETED' && task) {
    subject = `✅ Tarea completada: ${task.title}`;
    htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #34d399; margin: 0; font-size: 24px;">🎉 ¡Tarea Completada!</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Calendario: <strong>${calendarName}</strong></p>
        </div>
        
        <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px; text-decoration: line-through; text-decoration-color: #34d399;">${task.title}</h2>
          ${task.description ? `<p style="color: #cbd5e1; font-size: 14px;">${task.description}</p>` : ''}
          
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">✨ Marcada como lista por:</td>
              <td style="color: #34d399; padding: 6px 0; font-weight: 700; font-size: 15px;">${actionBy || task.completed_by || 'Un miembro'}</td>
            </tr>
            ${task.amount ? `
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">💵 Monto Pagado:</td>
              <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600; font-size: 14px;">$${Number(task.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${task.currency || 'USD'}</td>
            </tr>` : ''}
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; font-size: 14px;">📅 Fecha de vencimiento:</td>
              <td style="color: #e2e8f0; padding: 6px 0; font-size: 14px;">${task.due_date}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 24px;">
          Notificación enviada a todos los miembros (${primaryRecipients.join(', ')}).
        </p>
      </div>
    `;
  } else if (type === 'REMINDER' && tasks && tasks.length > 0) {
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    subject = `⏰ Recordatorio matutino: ${tasks.length} tarea(s) pendiente(s)`;
    
    const taskRows = tasks.map(t => `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 10px 4px; color: #f8fafc; font-weight: 600;">${t.title}</td>
        <td style="padding: 10px 4px; color: #f43f5e;">${t.due_date}</td>
        <td style="padding: 10px 4px; color: #34d399; font-weight: 700;">${t.amount ? `$${Number(t.amount).toLocaleString()}` : '-'}</td>
      </tr>
    `).join('');

    htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">☀️ Recordatorio de Tareas y Pagos</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Buenos días (${today})</p>
        </div>

        <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">
            Tienes <strong>${tasks.length}</strong> tarea(s) que vencen hoy o continúan pendientes:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #475569; text-align: left; color: #94a3b8;">
                <th style="padding: 6px 4px;">Tarea</th>
                <th style="padding: 6px 4px;">Vencimiento</th>
                <th style="padding: 6px 4px;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${taskRows}
            </tbody>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
          Ingresa a la aplicación para marcarlas como realizadas cuando estén listas.
        </p>
      </div>
    `;
  }

  return sendDirectEmail(primaryRecipients, subject, htmlContent);
}
