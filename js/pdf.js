// js/pdf.js — IRS 1042-S PDF form population using pdf-lib
// Requires PDFLib to be loaded via CDN before this script.
// Fetches pdfs/f1042s.pdf as the template, copies page 0 (Copy A)
// for each record, overlays field values as text, and downloads
// a multi-page PDF (one page per record).
'use strict';

// ─── Field coordinate map ─────────────────────────────────────────────────────
// Maps schema column letters (A–DE) to positions on the 1042-S form.
// PDF coordinate origin is bottom-left; page is US Letter (612 × 792 pt).
// x = distance from left edge, y = distance from bottom edge.
// *** Coordinates are approximate — calibrate after first test run ***
//
// To adjust: open the downloaded PDF, note which values are misaligned,
// then edit the x/y values below for those columns.

const FIELD_COORDS = {
  // ── Form header ───────────────────────────────────────────────────────────
  'B':  { x: 60,  y: 754, maxWidth: 40,  fontSize: 7 },  // Tax Year
  'W':  { x: 438, y: 754, maxWidth: 120, fontSize: 7 },  // Unique Form Identifier

  // ── Income & Tax (Boxes 1–11) ─────────────────────────────────────────────
  'AU': { x: 56,  y: 716, maxWidth: 30,  fontSize: 7 },  // Box 1  Income Code
  'AV': { x: 118, y: 716, maxWidth: 80,  fontSize: 7 },  // Box 2  Gross Income
  'AW': { x: 280, y: 716, maxWidth: 20,  fontSize: 7 },  // Box 3  Chapter Indicator
  'AX': { x: 350, y: 716, maxWidth: 30,  fontSize: 7 },  // Box 3a Exemption Code
  'AY': { x: 430, y: 716, maxWidth: 50,  fontSize: 7 },  // Box 3b Tax Rate
  'AZ': { x: 350, y: 700, maxWidth: 30,  fontSize: 7 },  // Box 4a Exemption Code
  'BA': { x: 430, y: 700, maxWidth: 50,  fontSize: 7 },  // Box 4b Tax Rate
  'BB': { x: 56,  y: 700, maxWidth: 60,  fontSize: 7 },  // Box 5  WH Allowance
  'BC': { x: 180, y: 700, maxWidth: 60,  fontSize: 7 },  // Box 6  Net Income
  'BD': { x: 56,  y: 684, maxWidth: 80,  fontSize: 7 },  // Box 7a Federal Tax WH
  // Checkboxes: draw "X" if value is "Y"
  'BE': { x: 224, y: 684, maxWidth: 10,  fontSize: 7, checkbox: true }, // Box 7b
  'BF': { x: 276, y: 684, maxWidth: 10,  fontSize: 7, checkbox: true }, // Box 7c
  'BG': { x: 328, y: 684, maxWidth: 10,  fontSize: 7, checkbox: true }, // Box 7d
  'BH': { x: 390, y: 684, maxWidth: 80,  fontSize: 7 },  // Box 8  Tax by Other Agents
  'BI': { x: 56,  y: 668, maxWidth: 80,  fontSize: 7 },  // Box 9  Overwithheld repaid
  'BJ': { x: 200, y: 668, maxWidth: 80,  fontSize: 7 },  // Box 11 Tax Paid by WHA

  // ── Withholding Agent (Boxes 12a–12o) ─────────────────────────────────────
  'C':  { x: 56,  y: 646, maxWidth: 30,  fontSize: 7 },  // Box 12a TIN Type
  'D':  { x: 130, y: 646, maxWidth: 80,  fontSize: 7 },  // Box 12b EIN
  'E':  { x: 295, y: 646, maxWidth: 30,  fontSize: 7 },  // Box 12c Ch3 Status
  'F':  { x: 380, y: 646, maxWidth: 30,  fontSize: 7 },  // Box 12d Ch4 Status
  'P':  { x: 460, y: 646, maxWidth: 40,  fontSize: 7 },  // Box 12e Country Code
  'G':  { x: 56,  y: 630, maxWidth: 15,  fontSize: 7 },  // Box 12f Name Type
  'H':  { x: 90,  y: 630, maxWidth: 160, fontSize: 7 },  // Box 12g Name Line 1
  'I':  { x: 90,  y: 618, maxWidth: 160, fontSize: 7 },  // Box 12h Name Line 2
  'R':  { x: 56,  y: 606, maxWidth: 180, fontSize: 7 },  // Box 12i Address
  'S':  { x: 56,  y: 594, maxWidth: 120, fontSize: 7 },  // Box 12j City
  'T':  { x: 295, y: 594, maxWidth: 30,  fontSize: 7 },  // Box 12k State
  'V':  { x: 380, y: 594, maxWidth: 60,  fontSize: 7 },  // Box 12l ZIP
  'U':  { x: 460, y: 594, maxWidth: 40,  fontSize: 7 },  // Box 12m Country
  'O':  { x: 56,  y: 582, maxWidth: 100, fontSize: 7 },  // Box 12n GIIN
  'Q':  { x: 200, y: 582, maxWidth: 120, fontSize: 7 },  // Box 12o Foreign Tax ID

  // ── Recipient (Boxes 13a–13p) ─────────────────────────────────────────────
  'X':  { x: 56,  y: 506, maxWidth: 15,  fontSize: 7 },  // Box 13a Name Type
  'Y':  { x: 90,  y: 506, maxWidth: 160, fontSize: 7 },  // Box 13b Name Line 1
  'Z':  { x: 90,  y: 494, maxWidth: 160, fontSize: 7 },  // Box 13c Name Line 2
  'AF': { x: 460, y: 494, maxWidth: 40,  fontSize: 7 },  // Box 13d Country Code
  'AL': { x: 56,  y: 482, maxWidth: 50,  fontSize: 7 },  // Box 13e TIN Type
  'AM': { x: 140, y: 482, maxWidth: 100, fontSize: 7 },  // Box 13e TIN
  'AN': { x: 295, y: 482, maxWidth: 30,  fontSize: 7 },  // Box 13f Ch3 Status
  'AO': { x: 380, y: 482, maxWidth: 30,  fontSize: 7 },  // Box 13g Ch4 Status
  'AP': { x: 56,  y: 470, maxWidth: 120, fontSize: 7 },  // Box 13h GIIN
  'AQ': { x: 200, y: 470, maxWidth: 120, fontSize: 7 },  // Box 13i Foreign Tax ID
  'AR': { x: 380, y: 470, maxWidth: 30,  fontSize: 7 },  // Box 13j LOB Code
  'AG': { x: 56,  y: 458, maxWidth: 180, fontSize: 7 },  // Box 13k Address
  'AH': { x: 56,  y: 446, maxWidth: 120, fontSize: 7 },  // Box 13l City
  'AI': { x: 295, y: 446, maxWidth: 30,  fontSize: 7 },  // Box 13m State
  'AK': { x: 380, y: 446, maxWidth: 60,  fontSize: 7 },  // Box 13n ZIP
  'AJ': { x: 460, y: 446, maxWidth: 40,  fontSize: 7 },  // Box 13o Country
  'AS': { x: 56,  y: 434, maxWidth: 120, fontSize: 7 },  // Box 13k Account No.
  'AT': { x: 250, y: 434, maxWidth: 80,  fontSize: 7 },  // Box 13l Date of Birth

  // ── Primary Withholding Agent (Box 14) ────────────────────────────────────
  'BK': { x: 56,  y: 404, maxWidth: 200, fontSize: 7 },  // Box 14a Name
  'BL': { x: 380, y: 404, maxWidth: 100, fontSize: 7 },  // Box 14b EIN

  // ── Intermediary / Flow-Through (Box 15) ──────────────────────────────────
  'BN': { x: 56,  y: 386, maxWidth: 15,  fontSize: 7, checkbox: true }, // Box 15 Pro-Rata
  'BO': { x: 130, y: 374, maxWidth: 80,  fontSize: 7 },  // Box 15a EIN
  'BP': { x: 295, y: 374, maxWidth: 30,  fontSize: 7 },  // Box 15b Ch3 Status
  'BQ': { x: 380, y: 374, maxWidth: 30,  fontSize: 7 },  // Box 15c Ch4 Status
  'BR': { x: 56,  y: 362, maxWidth: 15,  fontSize: 7 },  // Box 15d Name Type
  'BS': { x: 90,  y: 362, maxWidth: 180, fontSize: 7 },  // Box 15e Name Line 1
  'BZ': { x: 56,  y: 350, maxWidth: 120, fontSize: 7 },  // Box 15f GIIN
  'CA': { x: 200, y: 350, maxWidth: 40,  fontSize: 7 },  // Box 15g Country
  'CB': { x: 300, y: 350, maxWidth: 120, fontSize: 7 },  // Box 15h Foreign Tax ID
  'CC': { x: 56,  y: 338, maxWidth: 180, fontSize: 7 },  // Box 15i Address
  'CD': { x: 56,  y: 326, maxWidth: 120, fontSize: 7 },  // Box 15j City
  'CE': { x: 295, y: 326, maxWidth: 30,  fontSize: 7 },  // Box 15k State
  'CG': { x: 380, y: 326, maxWidth: 60,  fontSize: 7 },  // Box 15l ZIP
  'CF': { x: 460, y: 326, maxWidth: 40,  fontSize: 7 },  // Box 15m Country

  // ── Payer (Box 16) ────────────────────────────────────────────────────────
  'CH': { x: 56,  y: 300, maxWidth: 15,  fontSize: 7 },  // Box 16a Name Type
  'CI': { x: 90,  y: 300, maxWidth: 180, fontSize: 7 },  // Box 16a Name Line 1
  'CP': { x: 56,  y: 288, maxWidth: 100, fontSize: 7 },  // Box 16b TIN
  'CQ': { x: 200, y: 288, maxWidth: 120, fontSize: 7 },  // Box 16c GIIN
  'CR': { x: 380, y: 288, maxWidth: 30,  fontSize: 7 },  // Box 16d Ch3 Status
  'CS': { x: 460, y: 288, maxWidth: 30,  fontSize: 7 },  // Box 16e Ch4 Status

  // ── State Tax (Box 17) ────────────────────────────────────────────────────
  'CU': { x: 56,  y: 260, maxWidth: 100, fontSize: 7 },  // Box 17a State WH
  'CV': { x: 220, y: 260, maxWidth: 120, fontSize: 7 },  // Box 17b Payer State No.
  'CT': { x: 400, y: 260, maxWidth: 60,  fontSize: 7 },  // Box 17c State Name
};

// ─── Core export functions ─────────────────────────────────────────────────────

async function buildFilledPDF(rowObjs) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  // Load IRS form template
  let templateBytes;
  try {
    const resp = await fetch('./pdfs/f1042s.pdf');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    templateBytes = await resp.arrayBuffer();
  } catch (err) {
    throw new Error('Could not load PDF template (pdfs/f1042s.pdf): ' + err.message);
  }

  const template = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const out      = await PDFDocument.create();
  const font     = await out.embedFont(StandardFonts.Helvetica);
  const black    = rgb(0, 0, 0);

  for (const row of rowObjs) {
    // Copy Copy-A page (index 0) from template into output
    const [page] = await out.copyPagesFrom(template, [0]);
    out.addPage(page);

    for (const [col, coords] of Object.entries(FIELD_COORDS)) {
      let val = String(row[col] ?? '').trim();
      if (!val) continue;

      // Checkboxes: only draw "X" if the value is "Y"
      if (coords.checkbox) {
        if (val.toUpperCase() !== 'Y') continue;
        val = 'X';
      }

      page.drawText(val, {
        x:        coords.x,
        y:        coords.y,
        size:     coords.fontSize ?? 8,
        font,
        color:    black,
        maxWidth: coords.maxWidth ?? 120,
        lineHeight: coords.fontSize ?? 8,
      });
    }
  }

  return out.save(); // returns Uint8Array
}

async function downloadPDF(rowObjs, filename) {
  let bytes;
  try {
    bytes = await buildFilledPDF(rowObjs);
  } catch (err) {
    alert('PDF generation failed: ' + err.message);
    return;
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename || `1042S_${new Date().toISOString().slice(0,10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
