import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";

export const config = {
  runtime: "nodejs18.x",
};

function formatKV(page, font, label, value, x, y) {
  const maxWidth = 520;
  const labelText = label + ":";
  page.drawText(labelText, { x, y, size: 11, font, color: rgb(0.15, 0.15, 0.2) });

  const text = String(Array.isArray(value) ? value.join(", ") : value ?? "");
  const textX = x + Math.max(font.widthOfTextAtSize(labelText, 11) + 6, 110);

  const wrapped = wrapText(font, text, 11, maxWidth - (textX - x));
  let dy = 0;
  for (const line of wrapped) {
    page.drawText(line, { x: textX, y: y - dy, size: 11, font, color: rgb(0, 0, 0) });
    dy += 14;
  }
  return dy === 0 ? 0 : dy - 14;
}

function wrapText(font, text, fontSize, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const trial = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function humanizeKey(k) {
  if (!k) return k;
  return k
    .replace(/^_+/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const data = req.body || {};
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawRectangle({
    x: 0,
    y: 792,
    width: 595.28,
    height: 50,
    color: rgb(0.95, 0.96, 0.98),
  });
  page.drawText("Embra Support Services", {
    x: 40,
    y: 812,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.1, 0.2),
  });
  const title = data._form_title || "Website Form";
  page.drawText(title, { x: 40, y: 792, size: 12, font, color: rgb(0.2, 0.2, 0.3) });
  page.drawText(`Submitted: ${dateStr}`, {
    x: 430,
    y: 792,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.4),
  });

  // Body
  let x = 40;
  let y = 760;
  const preferredOrder = [
    "name",
    "fullname",
    "clientName",
    "clientAddress",
    "clientPhone",
    "_replyto",
    "email",
    "phone",
    "emergencyContact",
    "clientGp",
    "services",
    "support",
    "message",
    "notes",
    "otherService",
    "servicesOther",
    "frequency",
    "startDate",
  ];
  const rendered = new Set();

  for (const key of preferredOrder) {
    if (key in data) {
      y -= Math.max(formatKV(page, font, humanizeKey(key), data[key], x, y), 0) + 18;
      rendered.add(key);
      if (y < 80) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = 780;
        x = 40;
      }
    }
  }

  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.85),
  });
  y -= 16;
  page.drawText("All Fields", { x: 40, y, size: 12, font: bold, color: rgb(0.15, 0.15, 0.2) });
  y -= 16;

  for (const [key, value] of Object.entries(data)) {
    if (rendered.has(key)) continue;
    y -= Math.max(formatKV(page, font, humanizeKey(key), value, x, y), 0) + 14;
    if (y < 80) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = 780;
    }
  }

  const pdfBytes = await pdfDoc.save();

  // Send Email via Zoho SMTP
  const toAddress = process.env.ZOHO_TO || "embra@embrasupportservices.com";
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_HOST || "smtp.zoho.com",
    port: Number(process.env.ZOHO_PORT || 465),
    secure: true,
    auth: {
      user: process.env.ZOHO_USER,
      pass: process.env.ZOHO_APP_PASSWORD,
    },
  });

  const subject = New Submission: ${title};

// Plain fallback
  const plain =
    A new submission was received for "${title}".\n +
    Date: ${dateStr}\n +
    Source page: ${data._page_url || "Unknown"}\n +
    Fields: ${Object.keys(data).length};

  // Branded HTML body
  const html = `
    <div style="font-family: Arial, sans-serif; color:#333; padding:20px; border:1px solid #eee;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://yourdomain.com/12.png" alt="Company Logo" style="height:60px;" />
        <h2 style="margin:10px 0; color:#444;">Embra Support Services</h2>
      </div>
      <p>Dear Team,</p>
      <p>A new submission has been received from your website:</p>
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><strong>Form Title</strong></td>
          <td style="padding:8px; border:1px solid #ddd;">${title}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><strong>Date</strong></td>
          <td style="padding:8px; border:1px solid #ddd;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd;"><strong>Fields Submitted</strong></td>
          <td style="padding:8px; border:1px solid #ddd;">${Object.keys(data).length}</td>
        </tr>
      </table>
      <p style="margin-top:20px;">The full details are attached as a PDF.</p>
      <p style="margin-top:20px;">Best regards,<br><strong>Embra Support Services</strong></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.ZOHO_FROM || process.env.ZOHO_USER,
      to: toAddress,
      subject,
      text: plain,
      html, // ✅ branded email body
      attachments: [{ filename: ${title}.pdf, content: Buffer.from(pdfBytes) }],
    });
  } catch (e) {
    console.error("SMTP error:", e);
  }

  // Return PDF to client
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title}.pdf"`);
  res.status(200).end(Buffer.from(pdfBytes));
}
