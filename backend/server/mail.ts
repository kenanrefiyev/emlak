import "server-only";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailResult {
  delivered: boolean;
  driver: "console" | "smtp";
}

/**
 * Mail boundary. MAIL_DRIVER=console (default) prints messages to the server log
 * and reports `delivered: false` so the UI never claims an email was sent.
 * MAIL_DRIVER=smtp uses SMTP_URL (e.g. smtps://user:pass@host:465) and MAIL_FROM.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (process.env.MAIL_DRIVER === "smtp") {
    const url = process.env.SMTP_URL;
    if (!url) throw new Error("MAIL_DRIVER=smtp requires SMTP_URL");
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(url);
    await transport.sendMail({ from: process.env.MAIL_FROM || "Yuva <no-reply@localhost>", ...message });
    return { delivered: true, driver: "smtp" };
  }
  if (process.env.NODE_ENV !== "test") {
    console.info(`[mail:console] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}\n`);
  }
  return { delivered: false, driver: "console" };
}

export function mailConfigured() {
  return process.env.MAIL_DRIVER === "smtp" && Boolean(process.env.SMTP_URL);
}

export function appUrl(path = "") {
  return `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
