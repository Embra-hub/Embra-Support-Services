const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const data = req.body;
    const formType = data.formType || "Form Submission";

    // 1. Generate PDF
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);

      // 2. Email PDF using Zoho SMTP
      let transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.ZOHO_USER,
          pass: process.env.ZOHO_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.ZOHO_USER,
        to: process.env.ZOHO_USER,
        subject: `New ${formType} Submission`,
        text: `A new ${formType} has been submitted. See attached PDF.`,
        attachments: [
          { filename: `${formType.replace(/\s+/g, "_").toLowerCase()}.pdf`, content: pdfData }
        ]
      });

      res.status(200).json({ message: 'Success' });
    });

    doc.fontSize(20).text(formType, { align: 'center' });
    doc.moveDown();
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'signature' && key !== 'formType') {
        doc.fontSize(12).text(`${key}: ${value}`);
      }
    });
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
