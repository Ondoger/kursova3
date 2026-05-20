import { Resend } from "resend";

/*
 * Email delivery wrapper.
 *
 * If RESEND_API_KEY is configured → real email via Resend.
 * In dev we also include the code in the API response so the developer
 * can complete the flow without a mailbox.
 *
 * The exported function returns { delivered: bool, devCode?: string }.
 * Callers MUST NOT echo `devCode` to clients in production.
 */

let resendClient = null;
function getClient() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendClient = new Resend(key);
  return resendClient;
}

const FROM = process.env.EMAIL_FROM || "GitQuest <onboarding@resend.dev>";

function isProd() {
  return process.env.NODE_ENV === "production";
}

function renderCodeEmail({ code, purpose, name }) {
  const purposeText =
    purpose === "signup"
      ? "Підтвердження реєстрації"
      : purpose === "reset"
        ? "Скидання пароля"
        : "Код доступу";

  const text = [
    `Привіт${name ? `, ${name}` : ""}!`,
    "",
    `Твій код для GitQuest: ${code}`,
    `Він діє 10 хвилин. Введи його у формі на сайті.`,
    "",
    "Якщо ти не запитував цей код, просто проігноруй цей лист.",
    "",
    "— GitQuest",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#c9d1d9">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0d1117;padding:40px 0">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:20px;color:#c9d1d9;font-weight:600">${purposeText}</h1>
        <p style="margin:0 0 24px;color:#8b949e;font-size:14px;line-height:1.5">
          Привіт${name ? `, <strong style="color:#c9d1d9">${escapeHtml(name)}</strong>` : ""}! Введи цей код на сайті GitQuest, щоб продовжити.
        </p>
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:18px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:8px;color:#58a6ff;margin-bottom:24px">
          ${code}
        </div>
        <p style="margin:0 0 8px;color:#8b949e;font-size:13px">Код діє 10 хвилин.</p>
        <p style="margin:0;color:#6e7681;font-size:12px;line-height:1.5">
          Якщо ти не запитував цей код — просто проігноруй цей лист, ніяких дій з твоїм акаунтом не відбулося.
        </p>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;color:#6e7681;font-size:11px">— GitQuest · Educational platform on top of GitHub</p>
  </td></tr>
</table>
</body></html>`;

  return { subject: `${purposeText}: ${code}`, text, html };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send a verification code email.
 * Returns { delivered, devCode? } — devCode is only set in non-prod;
 * never expose it in prod.
 */
export async function sendCodeEmail({ to, code, purpose = "signup", name }) {
  const client = getClient();
  const { subject, text, html } = renderCodeEmail({ code, purpose, name });

  if (!client) {
    console.log("\n────────────────────────────────────────");
    console.log("[email] RESEND_API_KEY not set, code:");
    console.log(`  to:      ${to}`);
    console.log(`  purpose: ${purpose}`);
    console.log(`  code:    ${code}`);
    console.log("────────────────────────────────────────\n");
    return { delivered: false, devCode: isProd() ? undefined : code };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM,
      to,
      subject,
      text,
      html,
    });
    if (error) {
      console.error("[email] resend error:", error);
      // Don't bubble Resend errors to the user — log and fall back to dev code
      // outside prod so the flow is testable.
      if (!isProd()) {
        console.log(`[email] dev fallback code for ${to}: ${code}`);
        return { delivered: false, devCode: code };
      }
      return { delivered: false };
    }
    console.log("[email] sent", data?.id, "to", to);
    return { delivered: true, devCode: isProd() ? undefined : code };
  } catch (e) {
    console.error("[email] send threw:", e);
    if (!isProd()) {
      console.log(`[email] dev fallback code for ${to}: ${code}`);
      return { delivered: false, devCode: code };
    }
    return { delivered: false };
  }
}
