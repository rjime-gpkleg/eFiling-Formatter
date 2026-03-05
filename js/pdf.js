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
  // --- Page Header ---
  'W'  : { x: 144, y: 723, maxWidth:  106, fontSize: 8 },  // Unique Form Identifier (f1_01)

  // --- Boxes 1-4 (Income Code, Gross, Chapter, Exemptions, Tax Rates) ---
  'AU' : { x:  50, y: 685, maxWidth:   34, fontSize: 8 },  // Box 1 Income Code (f1_03)
  'AV' : { x:  86, y: 685, maxWidth:   56, fontSize: 8 },  // Box 2 Gross Income (f1_04)
  'AW' : { x: 144, y: 709, maxWidth:  163, fontSize: 8 },  // Box 3 Chapter Indicator (f1_05)
  'AX' : { x: 144, y: 697, maxWidth:   84, fontSize: 8 },  // Box 3a Ch3 Exemption Code (f1_06)
  'AY' : { x: 144, y: 685, maxWidth:   85, fontSize: 8 },  // Box 3b Ch3 Tax Rate (f1_07+f1_08)
  'AZ' : { x: 230, y: 697, maxWidth:   77, fontSize: 8 },  // Box 4a Ch4 Exemption Code (f1_09)
  'BA' : { x: 230, y: 685, maxWidth:   78, fontSize: 8 },  // Box 4b Ch4 Tax Rate (f1_10+f1_11)

  // --- Boxes 5-7 ---
  'BB' : { x:  50, y: 673, maxWidth:  257, fontSize: 8 },  // Box 5 Withholding Allowance (f1_12)
  'BC' : { x:  50, y: 661, maxWidth:  257, fontSize: 8 },  // Box 6 Net Income (f1_13)
  'BD' : { x:  50, y: 649, maxWidth:  257, fontSize: 8 },  // Box 7a Federal Tax Withheld (f1_14)
  'BE' : { x: 295, y: 625, maxWidth:   12, fontSize: 8, checkbox: true },  // Box 7b (c1_2)
  'BF' : { x: 295, y: 601, maxWidth:   12, fontSize: 8, checkbox: true },  // Box 7c (c1_3)
  'BG' : { x: 295, y: 565, maxWidth:   12, fontSize: 8, checkbox: true },  // Box 7d (c1_4)

  // --- Boxes 8-11 ---
  'BH' : { x:  50, y: 553, maxWidth:  257, fontSize: 8 },  // Box 8 Tax by Other Agents (f1_15)
  'BI' : { x:  50, y: 517, maxWidth:  156, fontSize: 8 },  // Box 9 Overwithheld Repaid (f1_16)
  'BJ' : { x:  50, y: 493, maxWidth:  257, fontSize: 8 },  // Box 11 Tax Paid by WH Agent (f1_18)

  // --- Box 12 (Withholding Agent) ---
  'C'  : { x:  50, y: 469, maxWidth:   18, fontSize: 8 },  // Box 12a TIN Type
  'D'  : { x:  70, y: 469, maxWidth:  107, fontSize: 8 },  // Box 12a EIN (f1_19)
  'E'  : { x: 180, y: 481, maxWidth:  127, fontSize: 8 },  // Box 12b Ch3 Status (f1_20)
  'F'  : { x: 180, y: 469, maxWidth:  127, fontSize: 8 },  // Box 12c Ch4 Status (f1_21)
  'G'  : { x:  50, y: 445, maxWidth:   16, fontSize: 8 },  // Box 12d Name Type
  'H'  : { x:  68, y: 445, maxWidth:  240, fontSize: 8 },  // Box 12d Name (f1_22)
  'O'  : { x:  50, y: 421, maxWidth:  257, fontSize: 8 },  // Box 12e GIIN (f1_23)
  'P'  : { x:  50, y: 397, maxWidth:   84, fontSize: 8 },  // Box 12f Country Code (f1_24)
  'Q'  : { x: 137, y: 397, maxWidth:  170, fontSize: 8 },  // Box 12g FTIN (f1_25)
  'R'  : { x:  50, y: 373, maxWidth:  257, fontSize: 8 },  // Box 12h Address (f1_26)
  'I'  : { x:  50, y: 349, maxWidth:   84, fontSize: 8 },  // Box 12i Room/Suite (f1_27)
  'S'  : { x: 137, y: 349, maxWidth:  170, fontSize: 8 },  // Box 12j City (f1_28)
  'T'  : { x:  50, y: 325, maxWidth:   84, fontSize: 8 },  // Box 12k State (f1_29)
  'U'  : { x: 137, y: 325, maxWidth:   63, fontSize: 8 },  // Box 12l Country (f1_30)
  'V'  : { x: 202, y: 325, maxWidth:  106, fontSize: 8 },  // Box 12m ZIP (f1_31)

  // --- Box 13 (Recipient) ---
  'X'  : { x:  50, y: 301, maxWidth:   16, fontSize: 8 },  // Box 13a Name Type
  'Y'  : { x:  68, y: 301, maxWidth:  131, fontSize: 8 },  // Box 13a Name (f1_32)
  'AF' : { x: 202, y: 301, maxWidth:  106, fontSize: 8 },  // Box 13b Country Code (f1_33)
  'AG' : { x:  50, y: 277, maxWidth:  257, fontSize: 8 },  // Box 13c Address (f1_34)
  'Z'  : { x:  50, y: 253, maxWidth:   84, fontSize: 8 },  // Box 13d Apt/Suite (f1_35)
  'AH' : { x: 137, y: 253, maxWidth:  170, fontSize: 8 },  // Box 13e City (f1_36)
  'AI' : { x:  50, y: 229, maxWidth:   84, fontSize: 8 },  // Box 13f State (f1_37)
  'AJ' : { x: 137, y: 229, maxWidth:   63, fontSize: 8 },  // Box 13g Country (f1_38)
  'AK' : { x: 202, y: 229, maxWidth:  106, fontSize: 8 },  // Box 13h ZIP (f1_39)
  'AL' : { x: 310, y: 697, maxWidth:   18, fontSize: 8 },  // Box 13i TIN Type
  'AM' : { x: 330, y: 697, maxWidth:  113, fontSize: 8 },  // Box 13i Recipient TIN (f1_40)
  'AN' : { x: 446, y: 709, maxWidth:  127, fontSize: 8 },  // Box 13j Ch3 Status (f1_41)
  'AO' : { x: 446, y: 697, maxWidth:  127, fontSize: 8 },  // Box 13k Ch4 Status (f1_42)
  'AP' : { x: 310, y: 661, maxWidth:  135, fontSize: 8 },  // Box 13l GIIN (f1_43)
  'AQ' : { x: 446, y: 661, maxWidth:  127, fontSize: 8 },  // Box 13m FTIN (f1_44)
  'AR' : { x: 310, y: 637, maxWidth:   56, fontSize: 8 },  // Box 13n LOB Code (f1_45)
  'AS' : { x: 367, y: 637, maxWidth:  207, fontSize: 8 },  // Box 13o Account Number (f1_46)
  'AT' : { x: 331, y: 607, maxWidth:  171, fontSize: 8 },  // Box 13p Date of Birth (f1_47)

  // --- Box 14 (Primary Withholding Agent) ---
  'BK' : { x: 310, y: 577, maxWidth:  264, fontSize: 8 },  // Box 14a Name (f1_48)
  'BL' : { x: 310, y: 553, maxWidth:  135, fontSize: 8 },  // Box 14b EIN (f1_49)

  // --- Box 15 (Intermediary / Flow-Through) ---
  'BN' : { x: 446, y: 553, maxWidth:   12, fontSize: 8, checkbox: true },  // Box 15 Pro-Rata (c1_5)
  'BO' : { x: 310, y: 517, maxWidth:  135, fontSize: 8 },  // Box 15a EIN (f1_50)
  'BP' : { x: 446, y: 535, maxWidth:  127, fontSize: 8 },  // Box 15b Ch3 Status (f1_51)
  'BQ' : { x: 446, y: 517, maxWidth:  127, fontSize: 8 },  // Box 15c Ch4 Status (f1_52)
  'BR' : { x: 310, y: 493, maxWidth:   16, fontSize: 8 },  // Box 15d Name Type
  'BS' : { x: 328, y: 493, maxWidth:  246, fontSize: 8 },  // Box 15d Name (f1_53)
  'BZ' : { x: 310, y: 469, maxWidth:  264, fontSize: 8 },  // Box 15e GIIN (f1_54)
  'CA' : { x: 310, y: 445, maxWidth:   84, fontSize: 8 },  // Box 15f Country Code (f1_55)
  'CB' : { x: 396, y: 445, maxWidth:  178, fontSize: 8 },  // Box 15g FTIN (f1_56)
  'CC' : { x: 310, y: 421, maxWidth:  264, fontSize: 8 },  // Box 15h Address (f1_57)
  'CD' : { x: 396, y: 397, maxWidth:  178, fontSize: 8 },  // Box 15j City (f1_59)
  'CE' : { x: 310, y: 373, maxWidth:   84, fontSize: 8 },  // Box 15k State (f1_60)
  'CF' : { x: 396, y: 373, maxWidth:   63, fontSize: 8 },  // Box 15l Country (f1_61)
  'CG' : { x: 461, y: 373, maxWidth:  113, fontSize: 8 },  // Box 15m ZIP (f1_62)

  // --- Box 16 (Payer) ---
  'CH' : { x: 310, y: 349, maxWidth:   16, fontSize: 8 },  // Box 16a Name Type
  'CI' : { x: 328, y: 349, maxWidth:  151, fontSize: 8 },  // Box 16a Payer Name (f1_63)
  'CP' : { x: 482, y: 349, maxWidth:   91, fontSize: 8 },  // Box 16b Payer TIN (f1_64)
  'CQ' : { x: 310, y: 325, maxWidth:  135, fontSize: 8 },  // Box 16c GIIN (f1_65)
  'CR' : { x: 446, y: 337, maxWidth:  127, fontSize: 8 },  // Box 16d Ch3 Status (f1_66)
  'CS' : { x: 446, y: 325, maxWidth:  127, fontSize: 8 },  // Box 16e Ch4 Status (f1_67)

  // --- Box 17 (State) ---
  'CU' : { x: 310, y: 301, maxWidth:  106, fontSize: 8 },  // Box 17a State WH (f1_68)
  'CV' : { x: 418, y: 301, maxWidth:   84, fontSize: 8 },  // Box 17b Payer State No (f1_69)
  'CT' : { x: 504, y: 301, maxWidth:   70, fontSize: 8 },  // Box 17c Name of State (f1_70)
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

  const out   = await PDFDocument.create();
  const font  = await out.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);

  // Embed page 0 as a reusable XObject -- works even on restricted PDFs
  // because it treats the page as graphics rather than copying page structure.
  let tmplPage;
  try {
    [tmplPage] = await out.embedPdf(templateBytes, [0]);
  } catch (err) {
    throw new Error(
      'Could not embed the PDF template. Try replacing pdfs/f1042s.pdf with a ' +
      'printed copy: open it in a PDF viewer, print to "Microsoft Print to PDF" ' +
      'or "Save as PDF", then replace the file. (pdf-lib: ' + err.message + ')'
    );
  }

  const pageW = tmplPage.width  || 612;
  const pageH = tmplPage.height || 792;

  for (const row of rowObjs) {
    const page = out.addPage([pageW, pageH]);
    // Draw the template form as the page background
    page.drawPage(tmplPage);

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
