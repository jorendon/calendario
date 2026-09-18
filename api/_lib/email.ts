import { Resend } from 'resend';
import { DBTask } from './types';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.EMAIL_FROM || 'Calendario Compartido <onboarding@resend.dev>';

export interface SendTaskEmailOptions {
  type: 'CREATED' | 'COMPLETED' | 'REMINDER';
  task?: DBTask;
  tasks?: DBTask[];
  calendarName?: string;
  recipients: string[];
  actionBy?: string;
}

export async function notifyCalendarMembers(options: SendTaskEmailOptions) {
  const { type, task, tasks, calendarName = 'Hogar & Finanzas Compartidas', recipients, actionBy } = options;

  if (!recipients || recipients.length === 0) {
    console.warn('No recipients specified for email notification.');
    return { sent: false, reason: 'no-recipients' };
  }

  let subject = '';
  let htmlContent = '';

  const primaryRecipients = recipients.filter(Boolean);

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
          Este correo fue enviado a todos los miembros de este calendario (${primaryRecipients.join(', ')}).
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
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Buenos días Jonathan y Michelle (${today})</p>
        </div>

        <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">
            Tienes <strong>${tasks.length}</strong> tarea(s) que vencen hoy o continúan pendientes. Este recordatorio llegará cada mañana hasta que se completen:
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

  // If Resend API key is configured, send the actual email
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to: primaryRecipients,
        subject,
        html: htmlContent
      });
      console.log('Email sent successfully via Resend:', response);
      return { sent: true, provider: 'resend', id: response.data?.id };
    } catch (error) {
      console.error('Failed to send email with Resend:', error);
      return { sent: false, error: String(error) };
    }
  } else {
    console.log(`[LOCAL DEV EMAIL] Subject: "${subject}" to [${primaryRecipients.join(', ')}]`);
    return { sent: true, provider: 'simulated-local', recipients: primaryRecipients, subject };
  }
}
