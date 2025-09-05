import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { Buffer } from "buffer";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      clientName,
      clientAddress,
      clientPhone,
      emergencyContact,
      services,
      servicesOther,
      date,
      signature,
    } = req.body;

    // 1. Generate PDF in memory
    const doc = new PDFDocument({ margin: 50 });
    let chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);

      // 2. Setup Zoho SMTP
      let transporter = nodemailer.createTransport({
        host: "smtp.zoho.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.ZOHO_USER,
          pass: process.env.ZOHO_PASS,
        },
      });

      // 3. Send email with PDF
      await transporter.sendMail({
        from: "Embra Support Services" <${process.env.ZOHO_USER}>,
        to: "embra@embrasupportservices.com",
        subject: "New Client Agreement Form Submission",
        text: New client agreement submitted.\n\nName: ${clientName}\nPhone: ${clientPhone}\nDate: ${date},
        attachments: [
          {
            filename: "Client_Agreement.pdf",
            content: pdfBuffer,
          },
        ],
      });

      return res.status(200).json({ success: true });
    });

    // ===== PDF CONTENT =====
    // Logo
    try {
      const logoPath = path.resolve("./public/img/12.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, { fit: [120, 80], align: "center" });
      } else {
        doc.fontSize(14).text("Embra Support Services", { align: "center" });
      }
    } catch {
      doc.fontSize(14).text("Embra Support Services", { align: "center" });
    }
    doc.moveDown(2);

    // Title
    doc.fontSize(20).text("Client Agreement & Contract", { align: "center" });
    doc.moveDown(2);

    // Client Info
    doc.fontSize(14).text("1. Client Information", { underline: true });
    doc.fontSize(12).text(`Full Name: ${clientName}`);
    doc.text(`Address: ${clientAddress}`);
    doc.text(`Phone: ${clientPhone}`);
    doc.text(`Emergency Contact: ${emergencyContact || "N/A"}`);
    doc.moveDown();

    // Services
    doc.fontSize(14).text("2. Services to be Provided", { underline: true });
    doc.fontSize(12);
    if (Array.isArray(services)) {
      services.forEach((s) => doc.text(`- ${s}`));
    } else if (services) {
      doc.text(`- ${services}`);
    }
    if (servicesOther) doc.text(`Other: ${servicesOther}`);
    doc.moveDown();

    // Terms
    doc.fontSize(14).text("3. Terms & Policies", { underline: true });
    doc.fontSize(12).list([
      "Services are provided by trained staff supervised by Embra Support Services.",
      "Services are non-clinical and support daily living needs.",
      "Fees are agreed upon in advance; invoices may be weekly, fortnightly, or monthly.",
      "24 hours’ notice required for cancellations. Late cancellations may incur 50% charge.",
      "Client information is secured per GDPR & Data Protection Act.",
      "We welcome constructive feedback and resolve issues promptly.",
    ]);
    doc.moveDown();

    // Consent
    doc.fontSize(14).text("4. Consent & Agreement", { underline: true });
    doc.fontSize(12).text(
      "I understand and accept the terms and conditions of the service."
    );
    doc.moveDown();

    // Date
    doc.fontSize(12).text(`Date: ${date}`);
    doc.moveDown(2);

    // Signature
    if (signature) {
      const base64Data = signature.replace(/^data:image\/png;base64,/, "");
      const sigBuffer = Buffer.from(base64Data, "base64");
      doc.text("Client Signature:");
      doc.image(sigBuffer, { fit: [200, 80] });
    } else {
      doc.text("Client Signature: _________________________");
    }

    doc.end();
  } catch (err) {
    console.error("Error:", err);

return res.status(500).json({ error: "Server error" });
  }
}
