# 📅 Calendario Compartido de Tareas, Pagos & Recordatorios (PWA)

Una aplicación web progresiva (**PWA**) moderna estilo Google Calendar, diseñada especialmente para **Jonathan** (`Jonathan.rendon@gmail.com`) y **Michelle** (`michrotel@gmail.com`), con soporte para múltiples calendarios, adición dinámica de nuevos usuarios con autenticación, sincronización con **Google Tasks**, persistencia en **Vercel Postgres**, notificaciones simultáneas por correo y **recordatorios matutinos diarios** mediante Vercel Cron.

---

## 🌟 Características Principales

- 📱 **PWA (Progressive Web App)**: Totalmente instalable en la pantalla de inicio en iPhones/iPads, dispositivos Android y computadoras de escritorio.
- 📆 **Vistas de Calendario tipo Google**:
  - **Mes**: Cuadrícula mensual con badges de tareas, montos a pagar y estados.
  - **Semana**: Distribución interactiva de los 7 días.
  - **Día**: Detalle hora a hora de las actividades.
  - **Agenda**: Agrupación inteligente en *Atrasadas*, *Vencen Hoy*, *Próximas* y *Completadas*.
- 💵 **Gestión de Pagos & Facturas**: Campos dedicados para montos (renta, internet, suscripciones) con cálculo automático de totales pendientes.
- ✅ **Completado Colaborativo (DONE)**: Cualquier usuario puede marcar una tarea o pago como realizado con un solo clic (acompañado de una animación de celebración con confeti 🎉).
- ✉️ **Notificaciones por Correo a Ambos en Simultáneo**:
  - Al **crear** una tarea: Correo a ambos miembros con la fecha y monto.
  - Al **marcar como lista**: Correo a ambos avisando quién completó la tarea/pago.
- ⏰ **Recordatorio Diario Matutino Recurrente (Vercel Cron)**:
  - Se ejecuta automáticamente cada mañana a primera hora.
  - Revisa las tareas que vencen hoy y las tareas atrasadas aún sin completar (ej. el pago de la renta).
  - Envía un correo con el resumen a ambos usuarios y se repite **cada día hasta que sea marcada como realizada**.
- 🔄 **Sincronización con Google Tasks**: Botón para importar tareas de Google directamente al calendario.
- 👥 **Multi-Usuario & Multi-Calendario**:
  - Crear calendarios independientes con colores personalizados (*Hogar & Finanzas*, *Personal*, *Trabajo*).
  - Agregar e invitar nuevos usuarios con su respectivo correo.
  - Autenticación con contraseña para todos los usuarios.

---

## 🔐 Credenciales de Acceso Predeterminadas

| Usuario | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Jonathan Rendón** | `Jonathan.rendon@gmail.com` | `Calendario2006*` |
| **Michelle** | `michrotel@gmail.com` | `Calendario2006*` |

*(Los nuevos usuarios que invites podrán ingresar con su correo y la contraseña que les asignes).*

---

## 🚀 Guía de Despliegue en Vercel Paso a Paso (Desde Cero)

Sigue estos pasos sencillos para tener tu aplicación en línea y conectada a tu base de datos:

### Paso 1: Crear una cuenta en Vercel
1. Ve a [vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub (la cuenta `jorendon`).

### Paso 2: Importar el Repositorio
1. En el panel principal de Vercel (Dashboard), haz clic en el botón **"Add New..."** y selecciona **"Project"**.
2. En la lista de repositorios de GitHub, busca **`calendario`** y haz clic en **"Import"**.
3. En la configuración del proyecto:
   - **Framework Preset**: Selecciona **Vite**.
   - **Root Directory**: `./` (dejar por defecto).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Haz clic en **"Deploy"**. (Tu app ya se compilará y tendrá una URL pública tipo `calendario-xxx.vercel.app`).

### Paso 3: Conectar la Base de Datos (Vercel Postgres) con 1 Clic
1. En el proyecto recién creado en Vercel, dirígete a la pestaña superior **"Storage"**.
2. Haz clic en **"Create Database"** y selecciona **"Postgres"** (Neon).
3. Dale un nombre a la base de datos (ej. `calendario-db`) y selecciona la región más cercana (ej. *Washington D.C. - us-east-1*).
4. Acepta los términos y haz clic en **"Create"**.
5. En la siguiente pantalla, haz clic en el botón **"Connect Project"** para vincular la base de datos a tu proyecto `calendario`.
   - *Vercel inyectará automáticamente las variables de entorno `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc.*
6. La aplicación creará automáticamente todas las tablas (`app_users`, `app_calendars`, `app_tasks`) en el primer inicio.

### Paso 4: Configurar el Servicio de Correo Electrónico (Resend)
Para que los correos automáticos se envíen a Michelle y Jonathan:
1. Crea una cuenta gratuita en [resend.com](https://resend.com/).
2. Ve a la sección **API Keys** y haz clic en **"Create API Key"**.
3. Copia tu clave (empieza por `re_...`).
4. Ve a tu proyecto en Vercel -> **Settings** -> **Environment Variables**.
5. Agrega las siguientes variables:
   - **`RESEND_API_KEY`**: Tu clave copiada de Resend.
   - **`EMAIL_FROM`**: `Calendario Compartido <onboarding@resend.dev>` *(o tu dominio si lo verificas en Resend)*.
6. Haz clic en **"Save"**.

### Paso 5: Despliegue Final
1. En Vercel, ve a la pestaña **"Deployments"**, haz clic en los tres puntos `...` del último despliegue y selecciona **"Redeploy"** para que tome las nuevas variables de entorno de la base de datos y correo.

¡Listo! Tu aplicación estará 100% activa en internet.

---

## ⏰ ¿Cómo Funciona el Recordatorio Diario (Vercel Cron)?

El archivo [`vercel.json`](file:///vercel.json) ya viene configurado con el cron job automático:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 12 * * *"
    }
  ]
}
```

- **Horario**: Se activa automáticamente a las 12:00 UTC (7:00 AM / 8:00 AM hora de Florida / Este de EE.UU.).
- **Lógica**: Revisa todas las tareas que vencen en el día y las tareas atrasadas no marcadas como `DONE`. Si hay alguna pendiente (por ejemplo, la renta), despacha un correo a ambos recordándoles el pago.
- Si no se paga hoy, al día siguiente a la misma hora vuelve a enviar el recordatorio, repitiéndose hasta que se presione el botón **"Marcar como LISTA"**.

---

## 📲 Cómo Instalar la PWA en tu Celular

### En iPhone / iPad (Safari):
1. Abre el enlace de tu app en Safari.
2. Toca el botón **Compartir** (el ícono del cuadrado con la flecha hacia arriba en la barra inferior).
3. Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"** (Add to Home Screen).
4. Confirma y ¡listo! Se abrirá como una app nativa a pantalla completa con su propio ícono.

### En Android (Chrome):
1. Abre el enlace en Google Chrome.
2. Te aparecerá automáticamente el banner **"Instalar aplicación"** en la parte inferior, o toca los 3 puntos superiores y selecciona **"Instalar aplicación"**.

---

## 🧪 Pruebas Unitarias con Vitest

El proyecto incluye tests unitarios para verificar la lógica de fechas, cálculo de estados de recordatorios y permisos:

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar pruebas en modo observador
npm run test:watch
``
---

## 💻 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo Vite
npm run dev

# 3. Compilar para producción
npm run build
```
