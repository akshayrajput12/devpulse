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

    return `
      <div style="background-color: #121215; border: 1px solid #23232A; border-radius: 8px; padding: 18px; margin-bottom: 14px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
          <tr>
            <td>
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: bold; background-color: ${color}1E; color: ${color}; border: 1px solid ${color}35; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${label}
              </span>
            </td>
            <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #8F8F99;">
              ${escapeHtml(f.category || "General")}
            </td>
          </tr>
        </table>
        <h3 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #FFFFFF; margin: 0 0 6px 0; padding: 0; line-height: 1.4;">
          ${escapeHtml(f.title)}
        </h3>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9A9A9F; margin: 0 0 12px 0; padding: 0; line-height: 1.6;">
          ${escapeHtml(f.description)}
        </p>
        ${f.file_path ? `
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #88888D; background-color: #0A0A0C; padding: 6px 10px; border-radius: 4px; border: 1px solid #1C1C22; display: inline-block;">
            📁 ${escapeHtml(f.file_path)}${f.line_start ? `:${f.line_start}` : ""}
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
    <body style="margin: 0; padding: 0; background-color: #0B0B0C; color: #ECECEE;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0B0B0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #16161A; border: 1px solid #23232A; border-top: 4px solid #BEF264; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.65);">
              
              <!-- Brand Header -->
              <tr>
                <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #23232A;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="36" style="padding-right: 12px;">
                        <div style="background-color: #BEF264; width: 36px; height: 36px; border-radius: 8px; display: inline-block; text-align: center; line-height: 36px; font-weight: 900; color: #0A0A0B; font-size: 18px; font-family: sans-serif; box-shadow: 0 0 15px rgba(190,242,100,0.35);">
                          D
                        </div>
                      </td>
                      <td>
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #7F7F8A; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; display: block;">
                          DevPulse &middot; AI Diagnostics Engine
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Review Overview Title -->
              <tr>
                <td style="padding: 28px 32px 24px 32px;">
                  <h1 style="font-size: 26px; font-weight: bold; color: #FFFFFF; margin: 0 0 8px 0; letter-spacing: -0.5px; line-height: 1.2;">
                    Diagnostics Complete
                  </h1>
                  <p style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #9C9CA4; margin: 0; padding: 6px 10px; background-color: #0C0C0E; border: 1px solid #1C1C22; border-radius: 4px; word-break: break-all;">
                    ${escapeHtml(title)}
                  </p>
                </td>
              </tr>

              <!-- Stats Cards -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="48%" style="background-color: #121215; border: 1px solid #23232A; border-radius: 8px; padding: 22px; text-align: center;">
                        <span style="display: block; font-size: 46px; font-weight: bold; color: ${scoreColor}; line-height: 1; font-family: 'Courier New', Courier, monospace;">
                          ${score}
                        </span>
                        <span style="display: block; font-size: 9px; font-family: 'Courier New', Courier, monospace; text-transform: uppercase; letter-spacing: 1.5px; color: #6C6C75; margin-top: 6px; font-weight: bold;">
                          HEALTH SCORE
                        </span>
                      </td>
                      <td width="4%">&nbsp;</td>
                      <td width="48%" style="background-color: #121215; border: 1px solid #23232A; border-radius: 8px; padding: 22px; text-align: center;">
                        <span style="display: block; font-size: 46px; font-weight: bold; color: ${issueCount > 0 ? '#FB7185' : '#34D399'}; line-height: 1; font-family: 'Courier New', Courier, monospace;">
                          ${issueCount}
                        </span>
                        <span style="display: block; font-size: 9px; font-family: 'Courier New', Courier, monospace; text-transform: uppercase; letter-spacing: 1.5px; color: #6C6C75; margin-top: 6px; font-weight: bold;">
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
                  <td style="padding: 0 32px 28px 32px;">
                    <div style="background-color: #121215; border: 1px solid #23232A; border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 9px; color: #60A5FA; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; display: block; margin-bottom: 8px;">
                        AI SUMMARY
                      </span>
                      <p style="font-size: 13px; color: #A8A8AD; line-height: 1.7; margin: 0; white-space: pre-wrap;">
                        ${escapeHtml(params.review.summary)}
                      </p>
                    </div>
                  </td>
                </tr>
              ` : ""}

              <!-- Findings Section -->
              <tr>
                <td style="padding: 0 32px 32px 32px;">
                  <h2 style="font-size: 16px; font-weight: bold; color: #FFFFFF; border-bottom: 1px solid #23232A; padding-bottom: 10px; margin: 0 0 16px 0; letter-spacing: -0.2px;">
                    Key Findings ${issueCount > 10 ? '<span style="font-size: 12px; color: #6C6C75; font-weight: normal;">(Showing top 10)</span>' : ''}
                  </h2>
                  ${findingCards || `
                    <div style="text-align: center; padding: 36px; border: 1px dashed #23232A; border-radius: 8px; background-color: #121215;">
                      <p style="font-size: 13px; color: #34D399; margin: 0; font-weight: bold; font-family: monospace;">
                        ✔ No issues detected. Excellent job, clean diagnostics output!
                      </p>
                    </div>
                  `}
                </td>
              </tr>

              <!-- Action Call to Action Button -->
              <tr>
                <td align="center" style="padding: 0 32px 40px 32px;">
                  <a href="${reportUrl}" target="_blank" style="background-color: #BEF264; color: #0A0A0B; font-family: sans-serif; font-size: 13px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(190,242,100,0.25);">
                    OPEN FULL INTERACTIVE REPORT
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 24px 32px; border-top: 1px solid #23232A; background-color: #0D0D10;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #5C5C66; display: block; margin-bottom: 4px;">
                    Review ID: ${params.reviewId}
                  </span>
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #5C5C66; display: block;">
                    Generated by DevPulse AI &bull; <a href="${params.appUrl}" target="_blank" style="color: #BEF264; text-decoration: none;">devpulse.app</a>
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

