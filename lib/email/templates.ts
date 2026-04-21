/**
 * 纯 HTML 邮件模板（无额外依赖）
 * ----------------------------------------------
 * 保持极简 + inline 样式以兼容各邮件客户端。
 */

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #1f2937;
  max-width: 560px;
  margin: 0 auto;
  padding: 24px;
`

function wrap(title: string, body: string, cta?: { href: string; label: string }) {
  const ctaHtml = cta
    ? `<p style="margin-top:24px">
         <a href="${cta.href}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">${cta.label}</a>
       </p>`
    : ""
  return `
<!doctype html>
<html>
  <body style="background:#f9fafb;margin:0;padding:24px">
    <div style="${baseStyles}background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      ${body}
      ${ctaHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:12px;color:#6b7280;margin:0">
        You are receiving this because you enabled email notifications.
        Manage your preferences in account settings.
      </p>
    </div>
  </body>
</html>`
}

export function taskCompletedEmail(args: {
  name?: string | null
  taskUrl: string
  videoUrl?: string | null
}) {
  const name = args.name?.split(" ")[0] ?? "there"
  return {
    subject: "Your video is ready",
    html: wrap(
      "Your video is ready",
      `<p style="margin:0">Hi ${name}, your AI video has finished rendering.</p>
       <p style="margin:8px 0 0">Tap below to preview and download.</p>`,
      { href: args.taskUrl, label: "View result" },
    ),
  }
}

export function taskFailedEmail(args: {
  name?: string | null
  taskUrl: string
  errorMessage?: string | null
}) {
  const name = args.name?.split(" ")[0] ?? "there"
  const safeError = args.errorMessage
    ? `<p style="margin:8px 0 0;color:#6b7280;font-size:14px">Reason: ${args.errorMessage}</p>`
    : ""
  return {
    subject: "Your video task failed",
    html: wrap(
      "Your video task failed",
      `<p style="margin:0">Hi ${name}, something went wrong while rendering your video.</p>
       ${safeError}
       <p style="margin:8px 0 0">We have refunded the credits automatically.</p>`,
      { href: args.taskUrl, label: "Open task" },
    ),
  }
}
