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
  'W'  : { x: 257, y: 716, maxWidth:  80, fontSize: 7 },
  'AU' : { x:  57, y: 705, maxWidth:  30, fontSize: 7 },
  'AV' : { x:  92, y: 705, maxWidth:  52, fontSize: 7 },
  'AW' : { x: 150, y: 704, maxWidth:  30, fontSize: 7 },
  'AX' : { x: 150, y: 692, maxWidth:  40, fontSize: 7 },
  'AZ' : { x: 237, y: 692, maxWidth:  40, fontSize: 7 },
  'AY' : { x: 150, y: 680, maxWidth:  55, fontSize: 7 },
  'BA' : { x: 237, y: 680, maxWidth:  55, fontSize: 7 },
  'BB' : { x:  57, y: 668, maxWidth: 130, fontSize: 7 },
  'BC' : { x:  57, y: 656, maxWidth: 130, fontSize: 7 },
  'BD' : { x:  57, y: 644, maxWidth: 130, fontSize: 7 },
  'BE' : { x:  57, y: 633, maxWidth:  10, fontSize: 7, checkbox: true },
  'BF' : { x:  57, y: 609, maxWidth:  10, fontSize: 7, checkbox: true },
  'BG' : { x:  57, y: 581, maxWidth:  10, fontSize: 7, checkbox: true },
  'BH' : { x:  57, y: 548, maxWidth: 130, fontSize: 7 },
  'BI' : { x:  57, y: 537, maxWidth: 130, fontSize: 7 },
  'BJ' : { x:  57, y: 501, maxWidth: 130, fontSize: 7 },
  'C'  : { x:  57, y: 477, maxWidth:  28, fontSize: 7 },
  'D'  : { x:  90, y: 477, maxWidth:  88, fontSize: 7 },
  'E'  : { x: 186, y: 477, maxWidth: 115, fontSize: 7 },
  'F'  : { x: 186, y: 465, maxWidth: 115, fontSize: 7 },
  'G'  : { x:  57, y: 453, maxWidth:  20, fontSize: 7 },
  'H'  : { x:  83, y: 453, maxWidth: 165, fontSize: 7 },
  'I'  : { x:  57, y: 429, maxWidth: 245, fontSize: 7 },
  'P'  : { x:  57, y: 405, maxWidth:  75, fontSize: 7 },
  'Q'  : { x: 143, y: 405, maxWidth: 160, fontSize: 7 },
  'O'  : { x:  57, y: 381, maxWidth: 245, fontSize: 7 },
  'R'  : { x:  57, y: 357, maxWidth:  75, fontSize: 7 },
  'S'  : { x: 143, y: 357, maxWidth: 160, fontSize: 7 },
  'T'  : { x:  57, y: 333, maxWidth:  75, fontSize: 7 },
  'U'  : { x: 143, y: 333, maxWidth:  55, fontSize: 7 },
  'V'  : { x: 208, y: 333, maxWidth:  97, fontSize: 7 },
  'X'  : { x:  57, y: 309, maxWidth:  20, fontSize: 7 },
  'Y'  : { x:  82, y: 309, maxWidth: 115, fontSize: 7 },
  'AF' : { x: 208, y: 309, maxWidth:  95, fontSize: 7 },
  'Z'  : { x:  57, y: 285, maxWidth: 245, fontSize: 7 },
  'AG' : { x:  57, y: 261, maxWidth:  75, fontSize: 7 },
  'AH' : { x: 143, y: 261, maxWidth: 160, fontSize: 7 },
  'AI' : { x:  57, y: 237, maxWidth:  75, fontSize: 7 },
  'AJ' : { x: 143, y: 237, maxWidth:  55, fontSize: 7 },
  'AK' : { x: 208, y: 237, maxWidth:  97, fontSize: 7 },
  'AL' : { x: 316, y: 705, maxWidth:  25, fontSize: 7 },
  'AM' : { x: 343, y: 705, maxWidth:  95, fontSize: 7 },
  'AN' : { x: 453, y: 705, maxWidth: 105, fontSize: 7 },
  'AO' : { x: 453, y: 693, maxWidth: 105, fontSize: 7 },
  'AP' : { x: 316, y: 681, maxWidth: 125, fontSize: 7 },
  'AQ' : { x: 453, y: 681, maxWidth: 105, fontSize: 7 },
  'AR' : { x: 316, y: 646, maxWidth:  45, fontSize: 7 },
  'AS' : { x: 375, y: 646, maxWidth: 183, fontSize: 7 },
  'AT' : { x: 316, y: 621, maxWidth: 245, fontSize: 7 },
  'BK' : { x: 316, y: 585, maxWidth: 165, fontSize: 7 },
  'BL' : { x: 316, y: 561, maxWidth: 165, fontSize: 7 },
  'BN' : { x: 452, y: 556, maxWidth:  10, fontSize: 7, checkbox: true },
  'BO' : { x: 316, y: 537, maxWidth: 125, fontSize: 7 },
  'BP' : { x: 453, y: 534, maxWidth: 105, fontSize: 7 },
  'BQ' : { x: 453, y: 516, maxWidth: 105, fontSize: 7 },
  'BR' : { x: 316, y: 501, maxWidth:  20, fontSize: 7 },
  'BS' : { x: 340, y: 501, maxWidth: 105, fontSize: 7 },
  'BZ' : { x: 316, y: 477, maxWidth: 245, fontSize: 7 },
  'CA' : { x: 316, y: 453, maxWidth:  75, fontSize: 7 },
  'CB' : { x: 403, y: 453, maxWidth: 155, fontSize: 7 },
  'CC' : { x: 316, y: 429, maxWidth: 245, fontSize: 7 },
  'CD' : { x: 403, y: 405, maxWidth: 155, fontSize: 7 },
  'CE' : { x: 316, y: 381, maxWidth:  75, fontSize: 7 },
  'CF' : { x: 403, y: 381, maxWidth:  55, fontSize: 7 },
  'CG' : { x: 467, y: 381, maxWidth:  90, fontSize: 7 },
  'CH' : { x: 316, y: 357, maxWidth:  20, fontSize: 7 },
  'CI' : { x: 340, y: 357, maxWidth: 135, fontSize: 7 },
  'CP' : { x: 489, y: 357, maxWidth:  70, fontSize: 7 },
  'CQ' : { x: 316, y: 333, maxWidth: 125, fontSize: 7 },
  'CR' : { x: 453, y: 333, maxWidth: 105, fontSize: 7 },
  'CS' : { x: 453, y: 321, maxWidth: 105, fontSize: 7 },
  'CU' : { x: 316, y: 309, maxWidth: 100, fontSize: 7 },
  'CV' : { x: 425, y: 309, maxWidth:  75, fontSize: 7 },
  'CT' : { x: 511, y: 309, maxWidth:  55, fontSize: 7 },
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
