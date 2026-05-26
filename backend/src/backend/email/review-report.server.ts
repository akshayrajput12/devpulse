import { sendMail } from "./mailer.server.js";
import { logger } from "../logging/logger.server";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendReviewCompleteEmail(params: {
  requestId: string;
  reviewId: string;
  to?: string | null;
  review: any;
  findings: any[];
  appUrl: string;
}) {
  if (!params.to) {
    logger.warn("email.review_complete_skipped", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      reason: "missing_recipient",
    });
    return;
  }

  const issueCount = params.findings.filter(f => f.severity !== "ok").length;
  const reportUrl = `${params.appUrl.replace(/\/$/, "")}/reviews/${params.reviewId}`;
  const title = params.review.pr_title || params.review.pr_url || "Code Review";

  const severityColors: Record<string, string> = {
    crit: "#FB7185", // Rose
    high: "#FB923C", // Orange
    med: "#FBBF24",  // Amber
    low: "#60A5FA",  // Blue
    ok: "#34D399"    // Emerald
  };

  const severityLabels: Record<string, string> = {
    crit: "CRITICAL",
    high: "HIGH",
    med: "MEDIUM",
    low: "LOW",
    ok: "CLEAN"
  };

  const findingCards = params.findings.slice(0, 10).map(f => {
    const color = severityColors[f.severity] || "#9C9CA4";
    const label = severityLabels[f.severity] || f.severity.toUpperCase();
    const isOk = f.severity === "ok";

    return `
      <div style="background-color: #16161A; border: 1px solid #1F1F25; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px; justify-content: space-between;">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: bold; background-color: ${color}1A; color: ${color}; border: 1px solid ${color}30; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">
            ${label}
          </span>
          <span style="font-family: 'Space Grotesk', sans-serif; font-size: 11px; color: #9C9CA4;">
            ${escapeHtml(f.category || "General")}
          </span>
        </div>
        <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #ECECEE; margin: 0 0 6px 0;">
          ${escapeHtml(f.title)}
        </h3>
        <p style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; color: #9C9CA4; margin: 0 0 10px 0; line-height: 1.5;">
          ${escapeHtml(f.description)}
        </p>
        ${f.file_path ? `
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #5C5C66; background-color: #0F0F12; padding: 6px 10px; border-radius: 4px; display: inline-block;">
            ${escapeHtml(f.file_path)}${f.line_start ? `:${f.line_start}` : ""}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  const score = params.review.health_score ?? 70;
  let scoreColor = "#34D399";
  if (score < 50) scoreColor = "#FB7185";
  else if (score < 80) scoreColor = "#FBBF24";

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>DevPulse Review Complete</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0A0A0B; color: #ECECEE;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0A0B; font-family: 'Space Grotesk', 'Segoe UI', Arial, sans-serif;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #111114; border: 1px solid #1F1F25; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <!-- Brand Header -->
              <tr>
                <td style="padding: 32px 32px 24px 32px; border-b: 1px solid #1F1F25;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="32" style="padding-right: 12px;">
                        <div style="background-color: #BEF264; width: 32px; height: 32px; border-radius: 6px; display: inline-block; text-align: center; line-height: 32px; font-weight: 900; color: #0A0A0B; font-size: 16px;">
                          D
                        </div>
                      </td>
                      <td>
                        <span style="font-family: monospace; font-size: 11px; color: #5C5C66; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; display: block;">
                          DevPulse &middot; AI Code Review
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Review Overview Title -->
              <tr>
                <td style="padding: 0 32px 24px 32px;">
                  <h1 style="font-size: 24px; font-weight: 700; color: #ECECEE; margin: 0 0 8px 0; letter-spacing: -0.5px; line-height: 1.2;">
                    Review Complete
                  </h1>
                  <p style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #9C9CA4; margin: 0; word-break: break-all;">
                    ${escapeHtml(title)}
                  </p>
                </td>
              </tr>

              <!-- Stats Cards -->
              <tr>
                <td style="padding: 0 32px 24px 32px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="48%" style="background-color: #16161A; border: 1px solid #1F1F25; border-radius: 8px; padding: 20px; text-align: center;">
                        <span style="display: block; font-size: 44px; font-weight: 800; color: ${scoreColor}; line-height: 1; font-family: monospace;">
                          ${score}
                        </span>
                        <span style="display: block; font-size: 9px; font-family: monospace; text-transform: uppercase; letter-spacing: 1.5px; color: #5C5C66; margin-top: 6px; font-weight: bold;">
                          HEALTH SCORE
                        </span>
                      </td>
                      <td width="4%">&nbsp;</td>
                      <td width="48%" style="background-color: #16161A; border: 1px solid #1F1F25; border-radius: 8px; padding: 20px; text-align: center;">
                        <span style="display: block; font-size: 44px; font-weight: 800; color: ${issueCount > 0 ? '#FB7185' : '#34D399'}; line-height: 1; font-family: monospace;">
                          ${issueCount}
                        </span>
                        <span style="display: block; font-size: 9px; font-family: monospace; text-transform: uppercase; letter-spacing: 1.5px; color: #5C5C66; margin-top: 6px; font-weight: bold;">
                          TOTAL FINDINGS
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- AI Summary -->
              ${params.review.summary ? `
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <div style="background-color: #16161A; border: 1px solid #1F1F25; border-radius: 8px; padding: 20px;">
                      <span style="font-family: monospace; font-size: 9px; color: #60A5FA; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; display: block; margin-bottom: 8px;">
                        AI SUMMARY
                      </span>
                      <p style="font-size: 13px; color: #9C9CA4; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                        ${escapeHtml(params.review.summary)}
                      </p>
                    </div>
                  </td>
                </tr>
              ` : ""}

              <!-- Findings Section -->
              <tr>
                <td style="padding: 0 32px 32px 32px;">
                  <h2 style="font-size: 16px; font-weight: 700; color: #ECECEE; border-bottom: 1px solid #1F1F25; padding-bottom: 10px; margin: 0 0 16px 0; letter-spacing: -0.2px;">
                    Key Findings ${issueCount > 10 ? '<span style="font-size: 12px; color: #5C5C66; font-weight: normal;">(Showing top 10)</span>' : ''}
                  </h2>
                  ${findingCards || `
                    <div style="text-align: center; padding: 32px; border: 1px dashed #1F1F25; border-radius: 8px;">
                      <p style="font-size: 13px; color: #34D399; margin: 0; font-weight: bold;">
                        No issues detected. Your code is clean!
                      </p>
                    </div>
                  `}
                </td>
              </tr>

              <!-- Action Call to Action Button -->
              <tr>
                <td align="center" style="padding: 0 32px 40px 32px;">
                  <a href="${reportUrl}" target="_blank" style="background-color: #BEF264; color: #0A0A0B; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 6px; display: inline-block; letter-spacing: 0.5px; transition: transform 0.2s;">
                    Open Full Interactive Report
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 24px 32px; border-top: 1px solid #1F1F25; background-color: #0F0F12;">
                  <span style="font-family: monospace; font-size: 10px; color: #5C5C66; display: block; margin-bottom: 4px;">
                    Review ID: ${params.reviewId}
                  </span>
                  <span style="font-family: monospace; font-size: 10px; color: #5C5C66; display: block;">
                    Generated by DevPulse AI &bull; <a href="${params.appUrl}" target="_blank" style="color: #9C9CA4; text-decoration: none;">devpulse.app</a>
                  </span>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const info = await sendMail({
    to: params.to,
    subject: `DevPulse Review Complete: ${title}`,
    html,
    text: `DevPulse Review Complete\n\n${title}\nHealth score: ${score}/100\nFindings: ${issueCount}\n\n${params.review.summary ?? ""}\n\n${reportUrl}`,
  });

  logger.info("email.review_complete_sent", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    to: params.to,
    messageId: info.messageId,
  });
}

