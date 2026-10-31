import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Generate official PDF receipt for loan repayment
 */
export const generateReceiptPdf = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `receipt-${data.receiptNumber}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const doc = new PDFDocument({ margin: 40, size: 'A5' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header Banner
      doc.rect(0, 0, doc.page.width, 70).fill('#07264a'); // Brand navy 950
      doc.fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('EL-FAITH MICROFINANCE', 40, 20);
      
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#93c5fd')
        .text('Wassa Powuako, Western Region, Ghana | +233 24 556 7890', 40, 42);

      // Receipt Title
      doc.moveDown(3);
      doc.fillColor('#07264a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('OFFICIAL PAYMENT RECEIPT', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#059669') // Emerald green
        .text(`RECEIPT NO: ${data.receiptNumber}`, { align: 'center' });

      doc.moveDown(1);
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.8);

      // Two-column metadata
      const leftX = 45;
      const rightX = 230;
      let y = doc.y;

      const drawRow = (label, value) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b').text(label, leftX, y);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(value, rightX, y);
        y += 18;
      };

      drawRow('Payment Date & Time:', new Date(data.paymentDate).toLocaleString('en-GB'));
      drawRow('Client Full Name:', data.clientName);
      drawRow('Client ID:', data.clientId);
      drawRow('Loan Account Number:', data.loanAccountNumber);
      drawRow('Payment Method:', data.paymentMethod);
      if (data.transactionReference) {
        drawRow('Txn Reference / Ref No:', data.transactionReference);
      }
      drawRow('Receiving Officer / Cashier:', data.cashierName || 'Staff Cashier');

      doc.moveDown(0.5);
      y = doc.y + 10;
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();
      y += 12;

      // Payment Breakdown Table
      doc.rect(40, y, doc.page.width - 80, 22).fill('#f1f5f9');
      doc.fillColor('#07264a').font('Helvetica-Bold').fontSize(9).text('COMPONENT', 50, y + 6);
      doc.text('AMOUNT (GH₵)', doc.page.width - 150, y + 6);
      y += 28;

      const drawTableItem = (name, amount) => {
        doc.font('Helvetica').fontSize(9).fillColor('#334155').text(name, 50, y);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(`GH₵ ${Number(amount).toFixed(2)}`, doc.page.width - 150, y);
        y += 18;
      };

      drawTableItem('Principal Component', data.principalComponent);
      drawTableItem('Interest Component', data.interestComponent);
      if (Number(data.feesComponent) > 0) {
        drawTableItem('Fees / Charges', data.feesComponent);
      }

      // Total Paid Highlight Box
      y += 4;
      doc.rect(40, y, doc.page.width - 80, 28).fill('#ecfdf5'); // Light emerald
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#065f46').text('TOTAL PAID:', 50, y + 8);
      doc.text(`GH₵ ${Number(data.amountPaid).toFixed(2)}`, doc.page.width - 160, y + 8);

      // Outstanding Balance Notice
      y += 38;
      doc.rect(40, y, doc.page.width - 80, 24).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text('Remaining Outstanding Balance:', 50, y + 6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#b91c1c').text(`GH₵ ${Number(data.outstandingBalanceAfter).toFixed(2)}`, doc.page.width - 160, y + 6);

      // Security Footer & Stamp
      y += 45;
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#94a3b8')
        .text('System-generated authentic receipt. No signature required. Keep this receipt safely.', 40, y, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ fileName, filePath, relativeUrl: `/uploads/${fileName}` });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Loan Disbursement Voucher PDF
 */
export const generateDisbursementVoucherPdf = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `voucher-${data.disbursementReference}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.rect(0, 0, doc.page.width, 80).fill('#07264a');
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('EL-FAITH MICROFINANCE', 40, 25);
      doc.fontSize(10).font('Helvetica').fillColor('#93c5fd').text('Wassa Powuako, Western Region, Ghana | Official Loan Disbursement Voucher', 40, 52);

      doc.moveDown(4);
      doc.fillColor('#07264a').fontSize(15).font('Helvetica-Bold').text('LOAN DISBURSEMENT VOUCHER', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`REF: ${data.disbursementReference} | Date: ${new Date(data.disbursedAt).toLocaleDateString('en-GB')}`, { align: 'center' });

      doc.moveDown(1.5);
      let y = doc.y;

      const drawSectionTitle = (title) => {
        doc.rect(40, y, doc.page.width - 80, 20).fill('#e2e8f0');
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10).text(title, 48, y + 5);
        y += 28;
      };

      drawSectionTitle('1. BORROWER & LOAN DETAILS');
      const addField = (lbl, val) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text(lbl, 50, y);
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(val || 'N/A', 220, y);
        y += 16;
      };

      addField('Client Name:', data.clientName);
      addField('Client ID:', data.clientId);
      addField('Ghana Card Number:', data.ghanaCardNumber);
      addField('Phone Number:', data.phone);
      addField('Loan Account Number:', data.loanAccountNumber);
      addField('Loan Product:', data.productName);
      addField('Repayment Term:', `${data.termMonths} Months (${data.repaymentFrequency})`);
      addField('Interest Rate:', `${data.approvedInterestRate}% (${data.interestMethod})`);

      y += 10;
      drawSectionTitle('2. FINANCIAL DISBURSEMENT BREAKDOWN');
      addField('Approved Gross Principal:', `GH₵ ${Number(data.grossPrincipal).toFixed(2)}`);
      addField('Less: Processing Fee (2.5%):', `- GH₵ ${Number(data.processingFeeDeduction).toFixed(2)}`);
      addField('Less: Insurance Fee (1.0%):', `- GH₵ ${Number(data.insuranceFeeDeduction).toFixed(2)}`);
      if (Number(data.otherDeductions) > 0) {
        addField('Less: Other Deductions:', `- GH₵ ${Number(data.otherDeductions).toFixed(2)}`);
      }
      y += 5;
      doc.rect(45, y, doc.page.width - 90, 24).fill('#ecfdf5');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#065f46').text('NET PAYOUT TO CLIENT:', 52, y + 6);
      doc.text(`GH₵ ${Number(data.netDisbursedAmount).toFixed(2)}`, doc.page.width - 200, y + 6);
      y += 35;

      addField('Payment Mode:', data.paymentMethod);
      addField('Destination Account / MoMo No:', data.destinationAccount || 'Over-the-Counter Cash');
      addField('Payment Transaction Ref:', data.transactionReference || 'Handed in Cash');

      y += 15;
      drawSectionTitle('3. AUTHORIZATION & SIGN-OFFS');
      
      const sigY = y + 20;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155');
      
      // Prepared By
      doc.text(`Prepared By: ${data.preparedByName}`, 50, sigY);
      doc.strokeColor('#94a3b8').lineWidth(0.8).moveTo(50, sigY + 30).lineTo(180, sigY + 30).stroke();
      doc.fontSize(7.5).font('Helvetica-Oblique').text('Signature & Date', 50, sigY + 34);

      // Authorized By
      doc.font('Helvetica-Bold').fontSize(8.5).text(`Authorized By: ${data.authorizedByName || 'Manager'}`, 220, sigY);
      doc.strokeColor('#94a3b8').lineWidth(0.8).moveTo(220, sigY + 30).lineTo(350, sigY + 30).stroke();
      doc.fontSize(7.5).font('Helvetica-Oblique').text('Signature & Date', 220, sigY + 34);

      // Disbursed By / Cashier
      doc.font('Helvetica-Bold').fontSize(8.5).text(`Disbursed By: ${data.disbursedByName}`, 390, sigY);
      doc.strokeColor('#94a3b8').lineWidth(0.8).moveTo(390, sigY + 30).lineTo(520, sigY + 30).stroke();
      doc.fontSize(7.5).font('Helvetica-Oblique').text('Cashier Signature & Date', 390, sigY + 34);

      doc.end();

      stream.on('finish', () => {
        resolve({ fileName, filePath, relativeUrl: `/uploads/${fileName}` });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Loan Clearance Certificate PDF
 */
export const generateClearanceCertificatePdf = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `clearance-${data.loanAccountNumber}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Border frame
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(3).strokeColor('#07264a').stroke();
      doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).lineWidth(1).strokeColor('#ca8a04').stroke();

      doc.moveDown(3);
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#07264a').text('EL-FAITH MICROFINANCE', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Wassa Powuako, Western Region, Ghana', { align: 'center' });

      doc.moveDown(2);
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#ca8a04').text('CERTIFICATE OF LOAN CLEARANCE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#475569').text('Full Settlement and Release of Obligations', { align: 'center' });

      doc.moveDown(2.5);
      doc.fontSize(11).font('Helvetica').fillColor('#1e293b').text(
        `This is to officially certify that the loan facility described below, issued to:`,
        { align: 'center' }
      );

      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#07264a').text(data.clientName.toUpperCase(), { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Client ID: ${data.clientId} | Ghana Card: ${data.ghanaCardNumber}`, { align: 'center' });

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(
        `Under Loan Account Number: ${data.loanAccountNumber}, with an initial principal of GH₵ ${Number(data.principalAmount).toFixed(2)}, has been fully repaid, including all associated interest and contractual fees, in accordance with the credit agreement of EL-FAITH MICROFINANCE.`,
        { align: 'justify', indent: 30, lineGap: 4 }
      );

      doc.moveDown(1.5);
      doc.text(
        `As of ${new Date(data.clearedDate || new Date()).toLocaleDateString('en-GB')}, the outstanding balance stands at GH₵ 0.00. The borrower and any associated guarantors are hereby discharged from all obligations pertaining specifically to this loan account.`,
        { align: 'justify', indent: 30, lineGap: 4 }
      );

      doc.moveDown(4);
      const sigY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#07264a').text('Authorized Signatory:', 80, sigY);
      doc.strokeColor('#07264a').lineWidth(1).moveTo(80, sigY + 35).lineTo(250, sigY + 35).stroke();
      doc.font('Helvetica').fontSize(9).fillColor('#475569').text('Super Administrator / Branch Manager', 80, sigY + 40);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#07264a').text('Official Corporate Seal:', 360, sigY);
      doc.circle(420, sigY + 40, 30).lineWidth(1.5).strokeColor('#ca8a04').stroke();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ca8a04').text('EL-FAITH\nMICROFINANCE\nCLEARED', 400, sigY + 28, { align: 'center', width: 40 });

      doc.end();

      stream.on('finish', () => {
        resolve({ fileName, filePath, relativeUrl: `/uploads/${fileName}` });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

