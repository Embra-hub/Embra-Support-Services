Embra Support Services – PDF Email Forms
========================================

What this adds
--------------
• All marked forms submit to /api/submit (Vercel serverless).
• A styled PDF is generated from the filled fields.
• The PDF is emailed to embra@embrasupportservices.com via Zoho SMTP.
• The same PDF is returned to the browser so the client can download it immediately.

Where the files are
-------------------
• /api/submit.js          → serverless function (Node.js + pdf-lib + nodemailer)
• /js/emb-form-submit.js  → frontend hook that intercepts form submit and handles download
• .env.example            → copy to .env and set your Zoho app password

What you need to do
-------------------
1) Create a Zoho "App Password" (Zoho Mail → Security → App Passwords).
2) In Vercel → Project → Settings → Environment Variables, add:
   ZOHO_USER=embra@embrasupportservices.com
   ZOHO_APP_PASSWORD=•••••• (your app password)
   ZOHO_FROM=embra@embrasupportservices.com
   ZOHO_TO=embra@embrasupportservices.com
   ZOHO_HOST=smtp.zoho.com
   ZOHO_PORT=465
3) Deploy to Vercel (the /api/submit.js function will be available at /api/submit).

Which forms are enabled
-----------------------
These pages were detected with forms and updated to auto-submit:
- client-agreement.html
- contact.html
- referral-form.html
- welcome-pack.html

How it works
------------
• Each form got the class `emb-auto-pdf` and a hidden `_form_source` field.
• We also attach `data-form-title` = page's <title> to label the PDF.
• The frontend posts JSON to /api/submit and downloads the returned PDF.
• The backend builds a clean A4 PDF and emails it to your Zoho address.

Styling the PDF more
--------------------
To customize the PDF layout further (logos, tables, exact field positions), open /api/submit.js and:
• Use pdf-lib to draw lines/boxes or position fields in sections.
• Embed a PNG/SVG logo by fetching the asset and embedding it (ensure a public URL).
