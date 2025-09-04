import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export const config = {
  runtime: "nodejs18.x",
};

function formatKV(doc, page, font, label, value, x, y) {
  const maxWidth = 520;
  const labelText = label + ":";
  page.drawText(labelText, { x, y, size: 11, font, color: rgb(0.15,0.15,0.2) });
  const text = String(Array.isArray(value) ? value.join(", ") : value ?? "");
  const textX = x + Math.max(font.widthOfTextAtSize(labelText, 11) + 6, 110);
  const wrapped = wrapText(font, text, 11, maxWidth - (textX - x));
  let dy = 0;
  for (const line of wrapped) {
    page.drawText(line, { x: textX, y: y - dy, size: 11, font, color: rgb(0,0,0) });
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
  return k.replace(/^_+/, "").replace(/[_\-]+/g," ").replace(/\b\w/g, ch => ch.toUpperCase());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const data = req.body || {};
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const title = data._form_title || "Website Form";

  // 1) Build PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add logo
  try {
    const logoPath = path.join(process.cwd(), "public", "12.png");
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    page.drawImage(logoImage, { x: 230, y: 760, width: 120, height: 50 });
  } catch (e) {
    console.warn("Logo not found:", e);
  }

  // Date
  page.drawText(`Submission Date: ${dateStr}`, { x: 210, y: 740, size: 11, font, color: rgb(0.3,0.3,0.4) });

  // Fields
  let x = 40;
  let y = 710;
  const preferredOrder = ["name","fullname","clientName","clientAddress","clientPhone","_replyto","email","phone","message","notes"];
  const rendered = new Set();
  for (const key of preferredOrder) {
    if (key in data) {
      y -= Math.max(formatKV(pdfDoc, page, font, humanizeKey(key), data[key], x, y), 0) + 18;
      rendered.add(key);
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (rendered.has(key)) continue;
    y -= Math.max(formatKV(pdfDoc, page, font, humanizeKey(key), value, x, y), 0) + 14;
  }

  // Footer
  page.drawLine({ start: { x: 40, y: 50 }, end: { x: 555, y: 50 }, thickness: 0.5, color: rgb(0.7,0.7,0.7) });
  page.drawText("Embra Support Services", { x: 200, y: 35, size: 12, font: bold });
  page.drawText("Providing reliable homecare solutions", { x: 180, y: 20, size: 10, font });
  page.drawText("✉ embra@embrasupportservices.com", { x: 200, y: 8, size: 10, font });

  const pdfBytes = await pdfDoc.save();

  // 2) Email
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_HOST || "smtp.zoho.com",
    port: Number(process.env.ZOHO_PORT || 465),
    secure: true,
    auth: { user: process.env.ZOHO_USER, pass: process.env.ZOHO_APP_PASSWORD },
  });

  const toAddress = process.env.ZOHO_TO || "embra@embrasupportservices.com";
  const clientEmail = data.email || data._replyto;

  try {
    // Send to you
    await transporter.sendMail({
      from: process.env.ZOHO_FROM || process.env.ZOHO_USER,
      to: toAddress,
      subject: New Submission: ${title},

text: A new submission was received on ${dateStr}.,
      attachments: [{ filename: ${title}.pdf, content: Buffer.from(pdfBytes) }],
    });

    // Send to client
    if (clientEmail) {
      await transporter.sendMail({
        from: process.env.ZOHO_FROM || process.env.ZOHO_USER,
        to: clientEmail,
        subject: Thank You for Contacting Embra Support Services,
        html: `<p>Dear ${data.name || "Client"},</p>
               <p>Thank you for reaching out to <strong>Embra Support Services</strong>. We have received your submission and attached a copy for your records. Our team will be in touch shortly.</p>
               <p>Warm regards,<br>Embra Support Services Team</p>`,
        attachments: [{ filename: ${title}.pdf, content: Buffer.from(pdfBytes) }],
      });
    }
  } catch (e) {
    console.error("SMTP error:", e);
  }

  // Return PDF for download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title}.pdf"`);
  res.status(200).send(Buffer.from(pdfBytes));
}
