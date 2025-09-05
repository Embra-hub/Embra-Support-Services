<?php
// Turn off display errors in production
error_reporting(E_ALL);
ini_set('display_errors', 0);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use TCPDF;

require __DIR__ . '/vendor/autoload.php'; // requires phpmailer/phpmailer and tecnickcom/tcpdf via Composer

function field($key, $default='') {
  return isset($_POST[$key]) ? (is_string($_POST[$key]) ? trim($_POST[$key]) : $_POST[$key]) : $default;
}

$formType         = field('formType', 'generic');
$clientName       = field('clientName');
$clientAddress    = field('clientAddress');
$clientPhone      = field('clientPhone');
$clientEmail      = field('clientEmail'); // newly added
$emergencyContact = field('emergencyContact');
$services         = isset($_POST['services']) ? (is_array($_POST['services']) ? $_POST['services'] : [$_POST['services']]) : [];
$servicesOther    = field('servicesOther');
$date             = field('date');
$signatureDataUrl = field('signature');

// Build services list string
$servicesList = '';
if (!empty($services)) {
  foreach ($services as $s) { $servicesList .= '• ' . htmlspecialchars($s) . "\n"; }
} else {
  $servicesList = '• None selected';
}
if (!empty($servicesOther)) {
  $servicesList .= "\n• Other: " . htmlspecialchars($servicesOther);
}

// Decode signature into temp PNG if provided
$signaturePng = null;
if (!empty($signatureDataUrl) && strpos($signatureDataUrl, 'data:image') === 0) {
  $data = preg_replace('#^data:image/\w+;base64,#i', '', $signatureDataUrl);
  $data = str_replace(' ', '+', $data);
  $signaturePng = sys_get_temp_dir() . '/signature_' . uniqid() . '.png';
  file_put_contents($signaturePng, base64_decode($data));
}

// Create PDF
$pdf = new TCPDF();
$pdf->SetCreator('Embra Support Services');
$pdf->SetAuthor('Embra Support Services');
$pdf->SetTitle('Submission - ' . ucfirst(str_replace('-', ' ', $formType)));
$pdf->SetMargins(15, 15, 15);
$pdf->AddPage();

$logo = __DIR__ . '/img/12.png';
if (file_exists($logo)) {
  $pdf->Image($logo, 15, 10, 35);
  $pdf->SetY(20);
}
$pdf->Ln(20);
$pdf->SetFont('helvetica', 'B', 18);
$pdf->Cell(0, 10, strtoupper(str_replace('-', ' ', $formType)), 0, 1, 'C');
$pdf->Ln(4);
$pdf->SetFont('helvetica', '', 11);

$clientSection = '';
if ($clientName || $clientAddress || $clientPhone || $emergencyContact || $clientEmail) {
  $clientSection .= '<h3>1. Client Information</h3>';
  if ($clientName)       $clientSection .= '<p><b>Full Name:</b> ' . htmlspecialchars($clientName) . '</p>';
  if ($clientAddress)    $clientSection .= '<p><b>Address:</b> ' . nl2br(htmlspecialchars($clientAddress)) . '</p>';
  if ($clientPhone)      $clientSection .= '<p><b>Phone Number:</b> ' . htmlspecialchars($clientPhone) . '</p>';
  if ($clientEmail)      $clientSection .= '<p><b>Email Address:</b> ' . htmlspecialchars($clientEmail) . '</p>';
  if ($emergencyContact) $clientSection .= '<p><b>Emergency Contact:</b> ' . htmlspecialchars($emergencyContact) . '</p>';
}

$html = '';
switch ($formType) {
  case 'client-agreement':
    $html .= $clientSection;
    $html .= '<h3>2. Services to be Provided</h3>';
    $html .= '<pre style="font-family:helvetica; background:#F7F7F7; padding:8px; border:1px solid #EEE;">' . $servicesList . '</pre>';
    $html .= '<h3>3. Terms of Service</h3><p>Services are provided by trained staff supervised by Embra Support Services. Services provided by Embra are non-clinical and designed to support daily living needs.</p>';
    $html .= '<h3>4. Fees & Payment</h3><p>Fees are agreed upon in advance. Invoices may be issued weekly, fortnightly, or monthly. Travel and weekend surcharges may apply.</p>';
    $html .= '<h3>5. Cancellation Policy</h3><p>24 hours’ notice is required for cancellations. Late cancellations may incur a 50% service charge.</p>';
    $html .= '<h3>6. Confidentiality & Data Protection</h3><p>Your information is secured in line with the Data Protection Act. We comply with GDPR and share data only when necessary for your health and wellbeing needs.</p>';
    $html .= '<h3>7. Feedback & Concerns</h3><p>We welcome constructive feedback and resolve issues promptly and respectfully.</p>';
    $html .= '<h3>8. Consent & Agreement</h3><p>I understand and accept the terms and conditions of the service.</p>';
    if ($date) $html .= '<p><b>Date:</b> ' . htmlspecialchars($date) . '</p>';
    break;

  case 'welcome-pack':
    $html .= '<h3>Welcome Pack Submission</h3>' . $clientSection;
    $html .= '<h3>Details</h3><table border="1" cellpadding="6" cellspacing="0">';
    foreach ($_POST as $k => $v) {
      if (in_array($k, ['formType','clientName','clientAddress','clientPhone','clientEmail','emergencyContact','services','servicesOther','date','signature'])) continue;
      $val = is_array($v) ? implode(', ', $v) : $v;
      $html .= '<tr><td><b>'.htmlspecialchars($k).'</b></td><td>'.nl2br(htmlspecialchars($val)).'</td></tr>';
    }
    $html .= '</table>';
    if ($date) $html .= '<p style="margin-top:10px;"><b>Date:</b> ' . htmlspecialchars($date) . '</p>';
    break;

  case 'referral-form':
    $html .= '<h3>Referral Form</h3>' . $clientSection;
    $html .= '<h3>Referral Details</h3><table border="1" cellpadding="6" cellspacing="0">';
    foreach ($_POST as $k => $v) {
      if (in_array($k, ['formType','clientName','clientAddress','clientPhone','clientEmail','emergencyContact','services','servicesOther','date','signature'])) continue;
      $val = is_array($v) ? implode(', ', $v) : $v;
      $html .= '<tr><td><b>'.htmlspecialchars($k).'</b></td><td>'.nl2br(htmlspecialchars($val)).'</td></tr>';
    }
    $html .= '</table>';
    if ($services || $servicesOther) {
      $html .= '<h3>Requested Services</h3>';
      $html .= '<pre style="font-family:helvetica; background:#F7F7F7; padding:8px; border:1px solid #EEE;">' . $servicesList . '</pre>';
    }
    if ($date) $html .= '<p style="margin-top:10px;"><b>Date:</b> ' . htmlspecialchars($date) . '</p>';
    break;

  default:
    $html .= $clientSection;
    $html .= '<h3>Submission Data</h3><pre>' . htmlspecialchars(print_r($_POST, true)) . '</pre>';
}

$pdf->writeHTML($html, true, false, true, false, '');

// Signature block
if ($signaturePng && file_exists($signaturePng)) {
  $pdf->Ln(6);
  $pdf->SetFont('helvetica', '', 11);
  $pdf->Cell(0, 8, 'Signature:', 0, 1);
  $pdf->Image($signaturePng, '', '', 60, 20, 'PNG');
}

// Footer
$pdf->Ln(10);
$pdf->SetFont('helvetica', 'I', 9);
$pdf->Cell(0, 10, 'Generated by Embra Support Services • ' . date('Y-m-d H:i'), 0, 1, 'C');

// Save to temp
$pdfFile = sys_get_temp_dir() . '/Embra_' . $formType . '_' . date('Ymd_His') . '.pdf';
$pdf->Output($pdfFile, 'F');

// Email via Zoho SMTP
try {
  $mail = new PHPMailer(true);
  $mail->isSMTP();
  $mail->Host       = 'smtp.zoho.com';
  $mail->SMTPAuth   = true;
  $mail->Username   = 'ZOHO_EMAIL_HERE';     // TODO: set your Zoho email
  $mail->Password   = 'ZOHO_PASSWORD_HERE';  // TODO: set your Zoho App Password
  $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // or use ENCRYPTION_STARTTLS + port 587
  $mail->Port       = 465;

  $mail->setFrom('ZOHO_EMAIL_HERE', 'Embra Support Services');
  $mail->addAddress('ZOHO_EMAIL_HERE'); // send to your inbox

  // Attach the generated PDF
  $mail->addAttachment($pdfFile, 'Embra_' . $formType . '.pdf');
  $mail->isHTML(true);
  $mail->Subject = 'New ' . ucfirst(str_replace('-', ' ', $formType)) . ' Submission - ' . ($clientName ?: 'Client');
  $mail->Body    = 'A new submission has been received. See the attached PDF.';
  $mail->AltBody = 'A new submission has been received. Please see the attached PDF.';
  $mail->send();

  // Send client a copy (if email provided)
  if (!empty($clientEmail) && filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
    $clientMail = new PHPMailer(true);
    $clientMail->isSMTP();
    $clientMail->Host       = 'smtp.zoho.com';
    $clientMail->SMTPAuth   = true;
    $clientMail->Username   = 'ZOHO_EMAIL_HERE';
    $clientMail->Password   = 'ZOHO_PASSWORD_HERE';
    $clientMail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $clientMail->Port       = 465;

    $clientMail->setFrom('ZOHO_EMAIL_HERE', 'Embra Support Services');
    $clientMail->addAddress($clientEmail, $clientName ?: '');
    $clientMail->addAttachment($pdfFile, 'Embra_' . $formType . '.pdf');
    $clientMail->isHTML(true);
    $clientMail->Subject = 'Your Embra Support Services Form Submission';
    $clientMail->Body    = 'Dear ' . htmlspecialchars($clientName ?: 'Client') . ',<br><br>Thank you for completing the form with Embra Support Services.<br>Please find a copy of your completed form attached for your records.<br><br>Kind regards,<br>Embra Support Services Team';
    $clientMail->AltBody = 'Thank you for completing the form. A copy of your completed form is attached.';
    $clientMail->send();
  }

  // Cleanup
  if ($signaturePng && file_exists($signaturePng)) { unlink($signaturePng); }
  if (file_exists($pdfFile)) { unlink($pdfFile); }

  header('Location: contact-success.html');
  exit;
} catch (Exception $e) {
  if ($signaturePng && file_exists($signaturePng)) { unlink($signaturePng); }
  if (file_exists($pdfFile)) { unlink($pdfFile); }
  http_response_code(500);
  echo 'Mailer Error: ' . $e->getMessage();
  exit;
}
