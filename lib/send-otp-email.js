/**
 * إرسال كود OTP عبر Resend API
 */
export async function sendOtpEmail(toEmail, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // في بيئة التطوير، يظهر الكود في الـ console
    console.log(`[DEV OTP - العربي شتاين] ${toEmail}: ${code}`);
    return { sent: false, dev: true };
  }

  const fromSender = process.env.RESEND_FROM_EMAIL || 'العربي شتاين <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromSender,
        to: toEmail,
        subject: 'كود التحقق الأمني — منصة العربي شتاين (مستر محمد العربي)',
        html: `
          <div dir="rtl" style="font-family:'Cairo',sans-serif,Arial;padding:24px;background:#f8fafc;color:#0f172a;max-width:500px;margin:0 auto;border-radius:12px;border:1px solid #e2e8f0">
            <h2 style="color:#0b132b;margin-bottom:8px">⚛️ منصة العربي شتاين للفيزياء</h2>
            <p style="color:#475569;font-size:15px;margin-bottom:16px">مرحباً بك يا بطل الفيزياء، كود التحقق الأمني لتسجيل دخول جهازك هو:</p>
            <div style="background:#ffffff;padding:16px;border-radius:8px;text-align:center;border:1.5px solid #0284c7;margin-bottom:16px">
              <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0284c7;font-family:monospace">${code}</span>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0">هذا الكود صالح لمدة 5 دقائق فقط. لا تشاركه مع أي شخص لحماية حسابك.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">مع تحيات مستر محمد العربي — مدرس أول الفيزياء للثانوية العامة</p>
          </div>
        `,
      }),
    });

    return { sent: res.ok };
  } catch (err) {
    console.error('فشل إرسال إيميل OTP:', err.message);
    return { sent: false, error: err.message };
  }
}
