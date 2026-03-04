// js/presets.js — Source format presets for column auto-mapping
'use strict';

// Each preset maps a template column letter → the expected source column header (exact string).
// The app scans the uploaded CSV's headers for these strings and sets the mapping.
//
// Source file analysed:
//   C:\Users\rjimenez\Downloads\test1042s.xls
//   Sheet: IRS-1042S  |  Header row: 6  |  Data starts: row 7
//   Section headers on row 5; rows 1-4 are metadata.
//   When exporting this workbook as CSV, set "Header Row" to 6 in the Upload step.
//
// Source columns with NO template equivalent (intentionally unmapped):
//   Col 4:  "Income Description"           — SurePrep descriptive field
//   Col 18: "Total Withholding Credit"     — SurePrep computed field
//   Cols 31, 47, 72: "Foreign Province"   — not in 1042-S template
//   Col 56: "Amended"                      — SurePrep flag, not a template column
//   Col 57: "Amendment No."               — SurePrep field
//   Cols 58-64: "Schedule NEC Information" — SurePrep-specific section (Line Option,
//               Tax Rate Override, Description, Date Acquired/Sold, Sales Price,
//               Cost or Other Basis); not part of 1042-S template columns A–DE

const PRESETS = [
  {
    id: 'sureprep-1042s',
    name: 'SurePrep – IRS 1042-S Export',
    description: 'Matches the IRS-1042S sheet export. If exporting the full workbook, set Header Row to 6.',
    suggestedHeaderRow: 6,

    // Template col → exact source column header string
    headers: {

      // ── Form ──────────────────────────────────────────────────────────────
      'W':  'Unique Form Identifier',

      // ── Income & Tax ──────────────────────────────────────────────────────
      'AU': 'Income Code',
      'AV': 'Gross Income',
      'AW': 'Chapter Indicator',
      'AX': 'Chapter 3 Exemption Code',
      'AY': 'Chapter 3 Tax Rate',
      'AZ': 'Chapter 4 Exemption Code',
      'BA': 'Chapter 4 Tax Rate',
      'BB': 'Withholding Allowance',
      'BC': 'Net Income',
      'BD': 'Federal Tax Witheld',   // note: source has typo "Witheld"
      'BE': 'Tax Not Deposited with IRS - Escrow Procedures Applied',
      'BF': 'Withholding in Subsequent Year for Partnership Interest',
      'BH': 'Tax Withholding by Other Agent',
      'BI': 'Amount Repaid to Recipient',
      'BJ': 'Tax Paid by Withholding Agent',

      // ── Withholding Agent (source cols 2, 20-30) ─────────────────────────
      // Col 2 "Withholding Agent Name" → Business Name Line 1
      // (set G="B" manually or via a default; cannot be inferred from source)
      'H':  'Withholding Agent Name',
      'D':  'EIN',                   // first "EIN" col (source col 20)
      'E':  'Chapter 3 Status Code', // first occurrence (source col 21)
      'F':  'Chapter 4 Status Code', // first occurrence (source col 22)
      'O':  'GIIN',                  // first occurrence (source col 23)
      'P':  'Country Code',          // first "Country Code" (source col 24) — tax country
      'Q':  'Foreign Tax ID',        // first occurrence (source col 25)
      'R':  'Street Address',        // first occurrence (source col 26)
      'S':  'City',                  // first occurrence (source col 27)
      'T':  'State',                 // first occurrence (source col 28)
      'V':  'ZIP or Postal Code',    // first occurrence (source col 29)
      'U':  'Foreign Country Code',  // first occurrence (source col 30) — address country
      // source col 31 "Foreign Province" — no template equivalent

      // ── Primary Withholding Agent (source cols 32-34) ────────────────────
      // "Name" source col 32 → Box 14a name; note: source uses duplicate header names,
      // so the preset resolver uses occurrence-order (see resolvePreset below).
      'BK': { header: 'Name',          occurrence: 1 },
      'BL': { header: 'EIN',           occurrence: 2 },
      'BN': 'Pro-Rata Basis Reporting',

      // ── Intermediary (source cols 35-47) ─────────────────────────────────
      'BO': { header: 'EIN',           occurrence: 3 },
      'BP': { header: 'Chapter 3 Status Code', occurrence: 2 },
      'BQ': { header: 'Chapter 4 Status Code', occurrence: 2 },
      'BS': { header: 'Name',          occurrence: 2 },
      'BZ': { header: 'GIIN',          occurrence: 2 },
      'CA': { header: 'Country Code',  occurrence: 2 },
      'CB': { header: 'Foreign Tax ID',occurrence: 2 },
      'CC': { header: 'Street Address',occurrence: 2 },
      'CD': { header: 'City',          occurrence: 2 },
      'CE': { header: 'State',         occurrence: 2 },
      'CG': { header: 'ZIP or Postal Code', occurrence: 2 },
      'CF': { header: 'Foreign Country Code', occurrence: 2 },

      // ── Payer (source cols 48-55) ────────────────────────────────────────
      // source col 47 "Foreign Province" — no template equivalent
      // source cols 56-57: "Amended", "Amendment No." — no template equivalent
      // source cols 58-64: Schedule NEC section — no template equivalent
      'CI': { header: 'Name',          occurrence: 3 },
      'CP': 'TIN',
      'CQ': { header: 'GIIN',          occurrence: 3 },
      'CR': { header: 'Chapter 3 Status Code', occurrence: 3 },
      'CS': { header: 'Chapter 4 Status Code', occurrence: 3 },
      'CV': 'State Tax No.',
      'CU': 'State Income Tax Withheld',
      'CT': 'Name of State',

      // ── Recipient (source cols 65-80) ────────────────────────────────────
      // "Name" source col 65 → Business/Entity Name Line 1
      // (set X="B" manually; combined names like "ENRIQUE ROY" may need splitting)
      // source col 72 "Foreign Province" — no template equivalent
      'Y':  { header: 'Name',          occurrence: 4 },
      'AF': { header: 'Country Code',  occurrence: 3 },
      'AG': { header: 'Street Address',occurrence: 3 },
      'AH': { header: 'City',          occurrence: 3 },
      'AI': { header: 'State',         occurrence: 3 },
      'AK': { header: 'ZIP or Postal Code', occurrence: 3 },
      'AJ': { header: 'Foreign Country Code', occurrence: 3 },
      'AM': 'U.S. TIN',
      'AN': { header: 'Chapter 3 Status Code', occurrence: 4 },
      'AO': { header: 'Chapter 4 Status Code', occurrence: 4 },
      'AP': { header: 'GIIN',          occurrence: 4 },
      'AQ': { header: 'Foreign Tax ID',occurrence: 3 },
      'AR': 'LOB Code',
      'AS': 'Account No.',
      'AT': 'Date of Birth',
    },

    // Fields that are not in the source but have known fixed values for this format.
    // These will be written as static defaults in the corrected CSV output.
    defaults: {
      'A': '1042-S',
      'B': '2025',
      'C': 'EIN',
    },

    // Notes shown to the user when this preset is applied.
    notes: [
      'Col A (Form Type), B (Tax Year), C (TIN Type) will be set automatically.',
      '"Withholding Agent Name" is mapped to the Business Name field (Col H). Ensure Col G (Name Type) is set to "B" in your data or the corrected CSV.',
      '"Recipient Name" (Col Y) maps to Business/Entity Name Line 1. If recipients are individuals, set Col X (Recipient Name Type) to "I" and split the name into First/Last Name fields.',
      'Chapter Indicator source values like "Chapter 3" will need to be "3" or "4" — check and correct before filing.',
      '"Name of State" should be a 2-letter abbreviation (e.g., FL not Florida).',
      'Duplicate header names (EIN, Name, GIIN, etc.) are resolved by their left-to-right order within their section.',
    ],
  },
];

// ─── Preset resolver ──────────────────────────────────────────────────────────
// Given a preset and the actual CSV headers array, returns a mapping object
// { colLetter: headerIndex (-1 if not found) }
function resolvePreset(preset, headers) {
  // Build occurrence counters: header string → [indices in order]
  const occurrenceMap = {};
  headers.forEach((h, i) => {
    const key = String(h).trim();
    if (!occurrenceMap[key]) occurrenceMap[key] = [];
    occurrenceMap[key].push(i);
  });

  const result = {};
  for (const [col, spec] of Object.entries(preset.headers)) {
    let headerStr, occurrence;
    if (typeof spec === 'string') {
      headerStr = spec; occurrence = 1;
    } else {
      headerStr = spec.header; occurrence = spec.occurrence;
    }
    const indices = occurrenceMap[headerStr.trim()] || [];
    result[col] = indices[occurrence - 1] !== undefined ? indices[occurrence - 1] : -1;
  }
  return result;
}
