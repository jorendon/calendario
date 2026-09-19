import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEmailConfig, sendDirectEmail } from '../_lib/email';

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
