// js/schema.js — 1042-S TY2025 Column Definitions & Validation Rules
'use strict';

// ─── Status code lists ────────────────────────────────────────────────────────
const CH3_WA   = ['05','06','07','08','09','10','11','12','13','14','15','16','17',
                  '18','19','20','21','22','23','24','25','26','27','28','29','30',
                  '31','32','35','36','37','38','39','40','41'];
const CH3_RECIP = ['00', ...CH3_WA];
const CH4_ALL  = ['01','02','03','04','05','06','07','08','09','10','11','12','13',
                  '14','15','16','17','18','19','20','21','22','23','24','25','26',
                  '27','28','29','30','31','32','33','34','35','36','37','38','39',
                  '40','41','42','43','44','45','46','47','48','49','50'];
const INCOME   = ['01','02','03','04','05','06','07','08','09','10','11','12','13',
                  '14','15','16','17','18','19','20','21','22','23','24','25','26',
                  '27','28','29','30','31','32','33','34','35','36','37','38','39',
                  '40','41','42','43','44','50','51','52','53','54','55','56','57',
                  '58','59','60','61'];
const CH3_EX   = ['00','01','02','03','04','05','06','07','08','10','11','12','22','23','24'];
const CH3_RATE = ['0000','.0200','.0400','.0490','.0495','.0500','.0700','.0800',
                  '.1000','.1200','.1250','.1400','.1500','.1750','.2000','.2100',
                  '.2400','.2500','.2750','.2800','.3000','.3700'];
const CH4_EX   = ['00','13','14','15','16','17','18','19','20','21'];
const CH4_RATE = ['.0000','0000','.3000'];
const LOB      = ['02','03','04','05','06','07','08','09','10','11','12'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const blank    = v => !v || String(v).trim() === '';
const adjSp    = v => /  /.test(v);
const spaceOK  = v => String(v) === String(v).trim() && !adjSp(v);

function chkName(v, max, re) {
  if (blank(v)) return null;
  v = String(v);
  if (v.length > max)  return `Exceeds ${max}-char limit (${v.length})`;
  if (!spaceOK(v))     return 'No leading, trailing, or adjacent spaces';
  if (re && !re.test(v)) return 'Contains invalid characters';
  return null;
}
function chkMoney(v) {
  if (blank(v)) return null;
  const s = String(v).replace(/[$,]/g,'');
  const n = Number(s);
  if (isNaN(n))   return 'Must be a valid number';
  if (n < 0)      return 'Cannot be negative';
  if (/[eE]/.test(s) && !/^[A-Za-z]/.test(s)) return 'Scientific notation detected';
  const parts = s.split('.');
  if (parts[1] && parts[1].length > 2) return 'Max 2 decimal places';
  return null;
}
function chkYN(v)        { if (blank(v)) return null; return (v==='Y'||v==='N') ? null : 'Must be "Y" or "N"'; }
function chkEIN(v)       { if (blank(v)) return null; return /^\d{2}-\d{7}$/.test(v) ? null : 'Must be in XX-XXXXXXX format'; }
function chkCode(v, lst) { if (blank(v)) return null; return lst.includes(String(v)) ? null : `Must be one of: ${lst.join(', ')}`; }
function chkCountry(v)   { if (blank(v)) return null; return /^[A-Z]{2}$/.test(v) ? null : 'Must be a 2-letter country code (uppercase)'; }
function chkAddress(v)   {
  if (blank(v)) return null;
  v = String(v);
  if (v.length > 35)   return 'Max 35 chars';
  if (!spaceOK(v))     return 'No leading, trailing, or adjacent spaces';
  if (!/^[A-Za-z0-9\-\/ ]*$/.test(v)) return 'Alphanumeric + hyphen/slash/space only';
  return null;
}
function chkCity(v) {
  if (blank(v)) return null;
  v = String(v);
  if (v.length > 40)   return 'Max 40 chars';
  if (!spaceOK(v))     return 'No leading, trailing, or adjacent spaces';
  if (!/^[A-Za-z ]*$/.test(v)) return 'Alphabet + space only';
  return null;
}
function chkState(v, isUS) {
  if (blank(v)) return null;
  v = String(v);
  if (isUS)  return /^[A-Z]{2}$/.test(v) ? null : '2-letter state abbreviation required';
  if (v.length > 17)   return 'Max 17 chars (foreign)';
  if (!spaceOK(v))     return 'No leading, trailing, or adjacent spaces';
  if (!/^[A-Z0-9 ]*$/.test(v)) return 'Alphanumeric + space only (foreign)';
  return null;
}
function chkZIP(v, isUS) {
  if (blank(v)) return null;
  v = String(v);
  if (isUS) { const d = v.replace(/-/g,''); return /^\d{5}$|^\d{9}$|^\d{12}$/.test(d) ? null : 'Must be 5, 9, or 12 digits'; }
  if (v.length > 9) return 'Max 9 chars (foreign)';
  if (!/^[A-Z0-9]*$/.test(v)) return 'Alphanumeric only (foreign)';
  return null;
}
function chkGIIN(v)    { if (blank(v)) return null; v=String(v); if(v.length>19) return 'Max 19 chars'; if(!spaceOK(v)) return 'No leading or adjacent spaces'; return null; }
function chkFTIN(v)    { if (blank(v)) return null; v=String(v); if(v.length>50) return 'Max 50 chars'; if(!spaceOK(v)) return 'No adjacent spaces'; return null; }
function chkAcct(v)    { if (blank(v)) return null; v=String(v); if(v.length>30) return 'Max 30 chars'; if(!spaceOK(v)) return 'No adjacent spaces'; return null; }
function chkDate(v)    { if (blank(v)) return null; if (/^\d{4,5}$/.test(String(v).trim())) return 'Excel serial date — will auto-convert'; return /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? null : 'Must be MM/DD/YYYY'; }
function chkStateNum(v){ if (blank(v)) return null; v=String(v); if(v.length>24) return 'Max 24 chars'; if(!/^[A-Za-z0-9]*$/.test(v)) return 'Alphanumeric only, no spaces/special chars'; return null; }
function chkSpcData(v) { if (blank(v)) return null; v=String(v); if(v.length>60) return 'Max 60 chars'; if(!spaceOK(v)) return 'No leading or adjacent spaces'; return null; }
function chkAddlName(v){ if (blank(v)) return null; v=String(v); if(v.length>75) return 'Max 75 chars'; if(!spaceOK(v)) return 'No leading, trailing, or adjacent spaces'; if(!/^[A-Za-z0-9 \-#()&']*$/.test(v)) return 'Invalid characters'; return null; }

// ─── Auto-fix helpers ─────────────────────────────────────────────────────────
const fixSp  = v => v ? String(v).trim().replace(/\s+/g,' ') : v;
const fixUp  = v => v ? String(v).toUpperCase().trim() : v;
const fixEIN = v => { if (!v) return v; const d=String(v).replace(/\D/g,''); return d.length===9 ? `${d.slice(0,2)}-${d.slice(2)}` : v; };
const fixSSN = v => { if (!v) return v; const d=String(v).replace(/\D/g,''); return d.length===9 ? `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}` : v; };
function fixMoney(v) {
  if (!v && v!==0) return v;
  const s = String(v).replace(/[$,]/g,'');
  const n = Number(s);
  if (isNaN(n)) return v;
  return n%1===0 ? String(n) : parseFloat(n.toFixed(2)).toString();
}
function fixDate(v) {
  if (!v) return v;
  const s = String(v).trim();
  // Excel serial date (Windows epoch: 1 = Jan 1 1900)
  if (/^\d{4,5}$/.test(s)) {
    const serial = parseInt(s);
    const ms = (serial - 25569) * 86400 * 1000; // convert to Unix ms
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getUTCMonth()+1).padStart(2,'0');
      const dd = String(d.getUTCDate()).padStart(2,'0');
      return `${mm}/${dd}/${d.getUTCFullYear()}`;
    }
  }
  // Try generic parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  }
  return v;
}
function fixCH4Rate(v) {
  if (!v) return v;
  const n = parseFloat(String(v).replace(/[$,%]/g,'').trim());
  if (isNaN(n)) return v;
  const pct = n > 1 ? n/100 : n; // handle "30" or "30%" → 0.30
  if (Math.abs(pct) < 0.0001) return '.0000';
  if (Math.abs(pct - 0.30) < 0.0001) return '.3000';
  return v;
}
function fixCH3Rate(v) {
  if (!v) return v;
  // already valid?
  if (CH3_RATE.includes(String(v))) return v;
  const n = parseFloat(String(v).replace(/[$,%]/g,'').trim());
  if (isNaN(n)) return v;
  const pct = n > 1 ? n/100 : n;
  const target = CH3_RATE.find(r => Math.abs(parseFloat(r) - pct) < 0.00001);
  return target || v;
}
function fixCode2(v) { return v ? String(v).trim().padStart(2,'0') : v; }

// Country check for address context
function isUS(countryVal) { return blank(countryVal) || String(countryVal).trim().toUpperCase() === 'US'; }

// ─── Schema columns (A–DE) ───────────────────────────────────────────────────
// Each entry: { col, name, group, required, validate(v,row), autofix(v,row) }
// validate returns null (ok) or error string.
// autofix returns corrected value (or same value if no fix possible).

const SCHEMA_COLUMNS = [

// ── Withholding Agent ────────────────────────────────────────────────────────
{ col:'A',  name:'Form Type',                                  group:'Withholding Agent', required:false,
  validate: ()=>null, autofix: ()=>'1042-S' },

{ col:'B',  name:'Tax Year',                                   group:'Withholding Agent', required:false,
  validate: ()=>null, autofix: ()=>'2025' },

{ col:'C',  name:'Withholding Agent TIN Type',                 group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : v==='EIN' ? null : 'Must be "EIN"',
  autofix:  () => 'EIN' },

{ col:'D',  name:'Withholding Agent EIN',                      group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : chkEIN(v),
  autofix:  v => fixEIN(v) },

{ col:'E',  name:'Ch. 3 Status Code (Withholding Agent)',      group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : chkCode(v, CH3_WA),
  autofix:  v => fixCode2(v) },

{ col:'F',  name:'Ch. 4 Status Code (Withholding Agent)',      group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : chkCode(v, CH4_ALL),
  autofix:  v => fixCode2(v) },

{ col:'G',  name:'Withholding Agent Name Type',                group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : (v==='B'||v==='I') ? null : 'Must be "B" or "I"',
  autofix:  v => fixUp(v) },

{ col:'H',  name:'Withholding Agent Business/Entity Name Line 1', group:'Withholding Agent', required:false,
  validate: (v,r) => { if(r?.G==='B'&&blank(v)) return 'Required when Name Type is "B"'; return chkName(v,40,/^[A-Za-z0-9 \-#()&']*$/); },
  autofix:  v => fixSp(v) },

{ col:'I',  name:'Withholding Agent Business/Entity Name Line 2', group:'Withholding Agent', required:false,
  validate: v => chkName(v,40,/^[A-Za-z0-9 \-#()&'\/%]*$/),
  autofix:  v => fixSp(v) },

{ col:'J',  name:'Withholding Agent First Name',               group:'Withholding Agent', required:false,
  validate: (v,r) => { if(r?.G==='I'&&blank(v)) return 'Required when Name Type is "I"'; if(!blank(r?.L)&&blank(v)) return 'Required when Last Name is provided'; return chkName(v,20,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'K',  name:'Withholding Agent Middle Name',              group:'Withholding Agent', required:false,
  validate: v => chkName(v,20,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'L',  name:'Withholding Agent Last Name',                group:'Withholding Agent', required:false,
  validate: (v,r) => { if(r?.G==='I'&&blank(v)) return 'Required when Name Type is "I"'; if(!blank(r?.J)&&blank(v)) return 'Required when First Name is provided'; return chkName(v,20,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'M',  name:'Withholding Agent Suffix',                   group:'Withholding Agent', required:false,
  validate: v => chkName(v,20,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'N',  name:'Additional Withholding Agent Name',          group:'Withholding Agent', required:false,
  validate: v => chkAddlName(v),
  autofix:  v => fixSp(v) },

{ col:'O',  name:'Withholding Agent GIIN',                     group:'Withholding Agent', required:false,
  validate: v => chkGIIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'P',  name:'Withholding Agent Country Code (Tax)',       group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : chkCountry(v),
  autofix:  v => fixUp(v) },

{ col:'Q',  name:'Withholding Agent Foreign Tax ID Number',    group:'Withholding Agent', required:false,
  validate: v => chkFTIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'R',  name:'Withholding Agent Address (Number and Street)', group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : chkAddress(v),
  autofix:  v => fixSp(v) },

{ col:'S',  name:'Withholding Agent City/Town',                group:'Withholding Agent', required:false,
  validate: (v,r) => { if(isUS(r?.U)&&blank(v)) return 'Required for domestic addresses'; return chkCity(v); },
  autofix:  v => fixSp(v) },

{ col:'T',  name:'Withholding Agent State/Territory',          group:'Withholding Agent', required:false,
  validate: (v,r) => { if(isUS(r?.U)&&blank(v)) return 'Required for domestic addresses'; return chkState(v, isUS(r?.U)); },
  autofix:  v => fixUp(v) },

{ col:'U',  name:'Withholding Agent Country (Address)',        group:'Withholding Agent', required:true,
  validate: v => blank(v) ? 'Required' : chkCountry(v),
  autofix:  v => fixUp(v) },

{ col:'V',  name:'Withholding Agent ZIP/Postal Code',          group:'Withholding Agent', required:false,
  validate: (v,r) => { if(isUS(r?.U)&&blank(v)) return 'Required for domestic addresses'; return chkZIP(v, isUS(r?.U)); },
  autofix:  v => v },

// ── Form ID ───────────────────────────────────────────────────────────────────
{ col:'W',  name:'Unique Form Identifier',                     group:'Form ID', required:true,
  validate: v => { if(blank(v)) return 'Required'; const s=String(v).trim(); if(!/^\d{10}$/.test(s)) return 'Must be exactly 10 digits'; if(s==='0000000000') return 'Must not be all zeros'; return null; },
  autofix:  v => v },

// ── Recipient ─────────────────────────────────────────────────────────────────
{ col:'X',  name:'Box 13a – Recipient Name Type',              group:'Recipient', required:true,
  validate: v => blank(v) ? 'Required' : (v==='B'||v==='I') ? null : 'Must be "B" or "I"',
  autofix:  v => fixUp(v) },

{ col:'Y',  name:'Recipient Business/Entity Name Line 1',      group:'Recipient', required:false,
  validate: (v,r) => { if(r?.X==='B'&&blank(v)) return 'Required when Recipient Name Type is "B"'; return chkName(v,40,/^[A-Za-z0-9 \-#()&']*$/); },
  autofix:  v => fixSp(v) },

{ col:'Z',  name:'Recipient Business/Entity Name Line 2',      group:'Recipient', required:false,
  validate: v => chkName(v,40,/^[A-Za-z0-9 \-#()&'\/%]*$/),
  autofix:  v => fixSp(v) },

{ col:'AA', name:'Recipient First Name',                       group:'Recipient', required:false,
  validate: (v,r) => { if(r?.X==='I'&&blank(v)) return 'Required when Name Type is "I"'; if(!blank(r?.AC)&&blank(v)) return 'Required when Last Name is provided'; return chkName(v,20,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'AB', name:'Recipient Middle Name',                      group:'Recipient', required:false,
  validate: v => chkName(v,20,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'AC', name:'Recipient Last Name',                        group:'Recipient', required:false,
  validate: (v,r) => { if(r?.X==='I'&&blank(v)) return 'Required when Name Type is "I"'; if(!blank(r?.AA)&&blank(v)) return 'Required when First Name is provided'; return chkName(v,20,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'AD', name:'Recipient Suffix',                           group:'Recipient', required:false,
  validate: v => chkName(v,20,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'AE', name:'Additional Recipient Name',                  group:'Recipient', required:false,
  validate: v => chkAddlName(v),
  autofix:  v => fixSp(v) },

{ col:'AF', name:"Box 13b – Recipient's Country Code (Tax)",   group:'Recipient', required:false,
  validate: v => chkCountry(v),
  autofix:  v => fixUp(v) },

{ col:'AG', name:'Box 13c – Recipient Address (Number and Street)', group:'Recipient', required:false,
  validate: v => chkAddress(v),
  autofix:  v => fixSp(v) },

{ col:'AH', name:'Recipient City/Town',                        group:'Recipient', required:false,
  validate: (v,r) => { if(isUS(r?.AJ)&&blank(v)) return 'Required for domestic addresses'; return chkCity(v); },
  autofix:  v => fixSp(v) },

{ col:'AI', name:'Recipient State/Territory',                  group:'Recipient', required:false,
  validate: (v,r) => { if(isUS(r?.AJ)&&blank(v)) return 'Required for domestic addresses'; return chkState(v, isUS(r?.AJ)); },
  autofix:  v => fixUp(v) },

{ col:'AJ', name:'Recipient Country (Address)',                group:'Recipient', required:false,
  validate: v => chkCountry(v),
  autofix:  v => fixUp(v) },

{ col:'AK', name:'Recipient ZIP/Postal Code',                  group:'Recipient', required:false,
  validate: (v,r) => { if(isUS(r?.AJ)&&blank(v)) return 'Required for domestic addresses'; return chkZIP(v, isUS(r?.AJ)); },
  autofix:  v => v },

{ col:'AL', name:'Recipient TIN Type',                         group:'Recipient', required:false,
  validate: v => { if(blank(v)) return null; return ['SSN','EIN','ATIN','ITIN','QI-EIN','UND'].includes(v) ? null : 'Must be SSN, EIN, ATIN, ITIN, QI-EIN, or UND'; },
  autofix:  v => v ? String(v).toUpperCase().trim() : v },

{ col:'AM', name:"Box 13e – Recipient's U.S. TIN",             group:'Recipient', required:false,
  validate: (v,r) => {
    if (blank(v)) return null;
    const t = r?.AL;
    if (t==='EIN'||t==='QI-EIN') return chkEIN(v);
    if (t==='SSN'||t==='ITIN'||t==='ATIN') return /^\d{3}-\d{2}-\d{4}$/.test(v) ? null : `Must be XXX-XX-XXXX for ${t}`;
    if (t==='UND') return /^\d{9}$/.test(v) ? null : 'Must be 9 digits for UND';
    if (!/^[\d\-]{9,11}$/.test(v)) return 'Digits and dashes only';
    return null;
  },
  autofix: (v,r) => { if(!v) return v; const t=r?.AL; if(t==='EIN'||t==='QI-EIN') return fixEIN(v); if(t==='SSN'||t==='ITIN'||t==='ATIN') return fixSSN(v); return v; } },

{ col:'AN', name:'Box 13f – Recipient Ch. 3 Status Code',      group:'Recipient', required:false,
  validate: v => chkCode(v, CH3_RECIP),
  autofix:  v => fixCode2(v) },

{ col:'AO', name:'Box 13g – Recipient Ch. 4 Status Code',      group:'Recipient', required:false,
  validate: v => chkCode(v, CH4_ALL),
  autofix:  v => fixCode2(v) },

{ col:'AP', name:"Box 13h – Recipient's GIIN",                  group:'Recipient', required:false,
  validate: v => chkGIIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'AQ', name:"Box 13i – Recipient's Foreign Tax ID Number", group:'Recipient', required:false,
  validate: v => chkFTIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'AR', name:'Box 13j – LOB Code',                         group:'Recipient', required:false,
  validate: v => chkCode(v, LOB),
  autofix:  v => fixCode2(v) },

{ col:'AS', name:"Box 13k – Recipient's Account Number",        group:'Recipient', required:false,
  validate: v => chkAcct(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'AT', name:"Box 13l – Recipient's Date of Birth",         group:'Recipient', required:false,
  validate: v => chkDate(v),
  autofix:  v => fixDate(v) },

// ── Income & Tax ──────────────────────────────────────────────────────────────
{ col:'AU', name:'Box 1 – Income Code',                        group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : chkCode(v, INCOME),
  autofix:  v => fixCode2(v) },

{ col:'AV', name:'Box 2 – Gross Income',                       group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'AW', name:'Box 3 – Chapter Indicator',                  group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : (v==='3'||v==='4') ? null : 'Must be "3" or "4"',
  autofix:  v => v },

{ col:'AX', name:'Box 3a – Ch. 3 Exemption Code',              group:'Income & Tax', required:false,
  validate: (v,r) => { if(r?.AW==='3'&&blank(v)) return 'Required when Chapter Indicator is 3'; return chkCode(v, CH3_EX); },
  autofix:  v => fixCode2(v) },

{ col:'AY', name:'Box 3b – Ch. 3 Tax Rate',                    group:'Income & Tax', required:false,
  validate: (v,r) => { if(!blank(r?.AX)&&blank(v)) return 'Required when Ch. 3 Exemption Code is entered'; return chkCode(v, CH3_RATE); },
  autofix:  v => fixCH3Rate(v) },

{ col:'AZ', name:'Box 4a – Ch. 4 Exemption Code',              group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : chkCode(v, CH4_EX),
  autofix:  v => fixCode2(v) },

{ col:'BA', name:'Box 4b – Ch. 4 Tax Rate',                    group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : chkCode(v, CH4_RATE),
  autofix:  v => fixCH4Rate(v) },

{ col:'BB', name:'Box 5 – Withholding Allowance',              group:'Income & Tax', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'BC', name:'Box 6 – Net Income',                         group:'Income & Tax', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'BD', name:'Box 7a – Federal Tax Withheld',              group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'BE', name:'Box 7b – Federal Tax Not Deposited (Escrow)', group:'Income & Tax', required:false,
  validate: v => chkYN(v),
  autofix:  v => v ? String(v).toUpperCase() : v },

{ col:'BF', name:'Box 7c – Withholding in Subsequent Year',    group:'Income & Tax', required:false,
  validate: v => chkYN(v),
  autofix:  v => v ? String(v).toUpperCase() : v },

{ col:'BG', name:'Box 7d – QI/WFP/WFT Revising Reporting',    group:'Income & Tax', required:false,
  validate: v => chkYN(v),
  autofix:  v => v ? String(v).toUpperCase() : v },

{ col:'BH', name:'Box 8 – Tax Withheld by Other Agents',       group:'Income & Tax', required:true,
  validate: v => blank(v) ? 'Required' : chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'BI', name:'Box 9 – Overwithheld Tax Repaid to Recipient', group:'Income & Tax', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'BJ', name:'Box 11 – Tax Paid by Withholding Agent',     group:'Income & Tax', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

// ── Primary Withholding Agent ─────────────────────────────────────────────────
{ col:'BK', name:"Box 14a – Primary Withholding Agent's Name", group:'Primary WA', required:false,
  validate: v => chkName(v,40,/^[A-Za-z0-9 \-#()&']*$/),
  autofix:  v => fixSp(v) },

{ col:'BL', name:"Box 14b – Primary Withholding Agent's EIN",  group:'Primary WA', required:false,
  validate: v => chkEIN(v),
  autofix:  v => fixEIN(v) },

{ col:'BM', name:"Additional Primary Withholding Agent's Name", group:'Primary WA', required:false,
  validate: v => chkAddlName(v),
  autofix:  v => fixSp(v) },

// ── Intermediary / Flow-Through ───────────────────────────────────────────────
{ col:'BN', name:'Box 15 – Pro-Rata Basis Reporting',          group:'Intermediary', required:false,
  validate: v => chkYN(v),
  autofix:  v => v ? String(v).toUpperCase() : v },

{ col:'BO', name:"Box 15a – Intermediary/FT Entity EIN",       group:'Intermediary', required:false,
  validate: v => chkEIN(v),
  autofix:  v => fixEIN(v) },

{ col:'BP', name:'Box 15b – Intermediary Ch. 3 Status Code',   group:'Intermediary', required:false,
  validate: v => chkCode(v, CH3_WA),
  autofix:  v => fixCode2(v) },

{ col:'BQ', name:'Box 15c – Intermediary Ch. 4 Status Code',   group:'Intermediary', required:false,
  validate: v => chkCode(v, CH4_ALL),
  autofix:  v => fixCode2(v) },

{ col:'BR', name:'Box 15d – Intermediary/FT Entity Name Type', group:'Intermediary', required:false,
  validate: v => { if(blank(v)) return null; return (v==='B'||v==='I') ? null : 'Must be "B" or "I"'; },
  autofix:  v => fixUp(v) },

{ col:'BS', name:'Intermediary/FT Business/Entity Name Line 1', group:'Intermediary', required:false,
  validate: (v,r) => { if(r?.BR==='B'&&blank(v)) return 'Required when Intermediary Name Type is "B"'; return chkName(v,40,/^[A-Za-z0-9 \-#()&']*$/); },
  autofix:  v => fixSp(v) },

{ col:'BT', name:'Intermediary/FT Business/Entity Name Line 2', group:'Intermediary', required:false,
  validate: v => chkName(v,40,/^[A-Za-z0-9 \-#()&'\/%]*$/),
  autofix:  v => fixSp(v) },

{ col:'BU', name:'Intermediary/FT First Name',                 group:'Intermediary', required:false,
  validate: (v,r) => { if(r?.BR==='I'&&blank(v)) return 'Required when Intermediary Name Type is "I"'; return chkName(v,10,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'BV', name:'Intermediary/FT Middle Name',                group:'Intermediary', required:false,
  validate: v => chkName(v,10,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'BW', name:'Intermediary/FT Last Name',                  group:'Intermediary', required:false,
  validate: (v,r) => { if(r?.BR==='I'&&blank(v)) return 'Required when Intermediary Name Type is "I"'; return chkName(v,10,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'BX', name:'Intermediary/FT Suffix',                     group:'Intermediary', required:false,
  validate: v => chkName(v,5,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'BY', name:'Additional Intermediary/FT Name',            group:'Intermediary', required:false,
  validate: v => chkAddlName(v),
  autofix:  v => fixSp(v) },

{ col:'BZ', name:"Box 15e – Intermediary/FT GIIN",             group:'Intermediary', required:false,
  validate: v => chkGIIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'CA', name:'Box 15f – Intermediary Country Code (Tax)',  group:'Intermediary', required:false,
  validate: v => chkCountry(v),
  autofix:  v => fixUp(v) },

{ col:'CB', name:'Box 15g – Intermediary Foreign Tax ID Number', group:'Intermediary', required:false,
  validate: v => chkFTIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'CC', name:'Box 15h – Intermediary Address (Number and Street)', group:'Intermediary', required:false,
  validate: v => chkAddress(v),
  autofix:  v => fixSp(v) },

{ col:'CD', name:'Intermediary/FT City/Town',                  group:'Intermediary', required:false,
  validate: v => chkCity(v),
  autofix:  v => fixSp(v) },

{ col:'CE', name:'Intermediary/FT State/Territory',            group:'Intermediary', required:false,
  validate: (v,r) => chkState(v, isUS(r?.CF)),
  autofix:  v => fixUp(v) },

{ col:'CF', name:'Intermediary/FT Country (Address)',          group:'Intermediary', required:false,
  validate: v => chkCountry(v),
  autofix:  v => fixUp(v) },

{ col:'CG', name:'Intermediary/FT ZIP/Postal Code',            group:'Intermediary', required:false,
  validate: (v,r) => chkZIP(v, isUS(r?.CF)),
  autofix:  v => v },

// ── Payer ─────────────────────────────────────────────────────────────────────
{ col:'CH', name:"Box 16a – Payer's Name Type",                group:'Payer', required:false,
  validate: v => { if(blank(v)) return null; return (v==='B'||v==='I') ? null : 'Must be "B" or "I"'; },
  autofix:  v => fixUp(v) },

{ col:'CI', name:"Payer's Business/Entity Name Line 1",        group:'Payer', required:false,
  validate: (v,r) => { if(r?.CH==='B'&&blank(v)) return 'Required when Payer Name Type is "B"'; return chkName(v,40,/^[A-Za-z0-9 \-#()&']*$/); },
  autofix:  v => fixSp(v) },

{ col:'CJ', name:"Payer's Business/Entity Name Line 2",        group:'Payer', required:false,
  validate: v => chkName(v,40,/^[A-Za-z0-9 \-#()&'\/%]*$/),
  autofix:  v => fixSp(v) },

{ col:'CK', name:"Payer's First Name",                         group:'Payer', required:false,
  validate: (v,r) => { if(r?.CH==='I'&&blank(v)) return 'Required when Payer Name Type is "I"'; return chkName(v,10,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'CL', name:"Payer's Middle Name",                        group:'Payer', required:false,
  validate: v => chkName(v,10,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'CM', name:"Payer's Last Name",                          group:'Payer', required:false,
  validate: (v,r) => { if(r?.CH==='I'&&blank(v)) return 'Required when Payer Name Type is "I"'; return chkName(v,10,/^[A-Za-z \-]*$/); },
  autofix:  v => fixSp(v) },

{ col:'CN', name:"Payer's Suffix",                             group:'Payer', required:false,
  validate: v => chkName(v,5,/^[A-Za-z \-]*$/),
  autofix:  v => fixSp(v) },

{ col:'CO', name:"Additional Payer's Name",                    group:'Payer', required:false,
  validate: v => chkAddlName(v),
  autofix:  v => fixSp(v) },

{ col:'CP', name:"Box 16b – Payer's TIN",                      group:'Payer', required:false,
  validate: v => { if(blank(v)) return null; return /^[\d\-]+$/.test(v) ? null : 'Digits and dashes only'; },
  autofix:  v => v },

{ col:'CQ', name:"Box 16c – Payer's GIIN",                     group:'Payer', required:false,
  validate: v => chkGIIN(v),
  autofix:  v => v ? String(v).trim() : v },

{ col:'CR', name:'Box 16d – Payer Ch. 3 Status Code',          group:'Payer', required:false,
  validate: v => chkCode(v, CH3_WA),
  autofix:  v => fixCode2(v) },

{ col:'CS', name:'Box 16e – Payer Ch. 4 Status Code',          group:'Payer', required:false,
  validate: v => chkCode(v, CH4_ALL),
  autofix:  v => fixCode2(v) },

// ── State 1 ───────────────────────────────────────────────────────────────────
{ col:'CT', name:'State 1 – Box 17c – State',                  group:'State Filing', required:false,
  validate: v => { if(blank(v)) return null; return /^[A-Z]{2}$/.test(v) ? null : '2-letter abbreviation required'; },
  autofix:  v => fixUp(v) },

{ col:'CU', name:'State 1 – Box 17a – State Income Tax Withheld', group:'State Filing', required:false,
  validate: (v,r) => { if(!blank(r?.CT)&&blank(v)&&blank(r?.CW)&&blank(r?.CX)) return 'At least one payment amount required when State 1 is selected'; return chkMoney(v); },
  autofix:  v => fixMoney(v) },

{ col:'CV', name:"State 1 – Box 17b – State/Payer's State Number", group:'State Filing', required:false,
  validate: v => chkStateNum(v),
  autofix:  v => v },

{ col:'CW', name:'State 1 – State Income',                     group:'State Filing', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'CX', name:'State 1 – Local Income Tax Withheld',        group:'State Filing', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'CY', name:'State 1 – Special Data Entries',             group:'State Filing', required:false,
  validate: v => chkSpcData(v),
  autofix:  v => v ? String(v).trim() : v },

// ── State 2 ───────────────────────────────────────────────────────────────────
{ col:'CZ', name:'State 2 – State',                            group:'State Filing', required:false,
  validate: v => { if(blank(v)) return null; return /^[A-Z]{2}$/.test(v) ? null : '2-letter abbreviation required'; },
  autofix:  v => fixUp(v) },

{ col:'DA', name:'State 2 – State Tax Withheld',               group:'State Filing', required:false,
  validate: (v,r) => { if(!blank(r?.CZ)&&blank(v)&&blank(r?.DC)&&blank(r?.DD)) return 'At least one payment amount required when State 2 is selected'; return chkMoney(v); },
  autofix:  v => fixMoney(v) },

{ col:'DB', name:"State 2 – State/Payer's State Number",       group:'State Filing', required:false,
  validate: v => chkStateNum(v),
  autofix:  v => v },

{ col:'DC', name:'State 2 – State Income',                     group:'State Filing', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'DD', name:'State 2 – Local Income Tax Withheld',        group:'State Filing', required:false,
  validate: v => chkMoney(v),
  autofix:  v => fixMoney(v) },

{ col:'DE', name:'State 2 – Special Data Entries',             group:'State Filing', required:false,
  validate: v => chkSpcData(v),
  autofix:  v => v ? String(v).trim() : v },

]; // end SCHEMA_COLUMNS

// Quick lookup map
const SCHEMA_MAP = Object.fromEntries(SCHEMA_COLUMNS.map(c => [c.col, c]));

// ─── Formatting hints (shown as tooltips in the mapping UI) ──────────────────
const SCHEMA_HINTS = {
  'A':  'Always "1042-S" — auto-filled on export',
  'B':  'Tax year e.g. "2025" — auto-filled on export',
  'C':  'Must be "EIN" — auto-filled on export',
  'D':  'Format: XX-XXXXXXX (9 digits; dashes auto-inserted)',
  'E':  '2-digit code 05–41 (Withholding Agent Ch. 3 status)',
  'F':  '2-digit code 01–50 (Withholding Agent Ch. 4 status)',
  'G':  '"B" = Business/Entity  |  "I" = Individual',
  'H':  'Up to 40 chars — alphanumeric + - # ( ) & \' — required when G = "B"',
  'I':  'Up to 40 chars — same chars as Line 1 plus / %',
  'J':  'Up to 20 chars, letters and hyphens — required when G = "I"',
  'K':  'Up to 20 chars, letters and hyphens',
  'L':  'Up to 20 chars, letters and hyphens — required when G = "I"',
  'M':  'Up to 20 chars, letters and hyphens',
  'N':  'Up to 40 chars — additional WA name line',
  'O':  'GIIN format: XXXXXX.XXXXX.SL.NNN (19 chars with dots)',
  'P':  '2-letter ISO country code for TAX purposes (e.g. US)',
  'Q':  'Foreign Tax Identification Number — up to 50 chars',
  'R':  'Up to 35 chars — alphanumeric + - / space — no leading/trailing spaces',
  'S':  'Up to 40 chars — letters and spaces only',
  'T':  'Domestic: 2-letter state abbrev (e.g. FL). Foreign: up to 17 alphanumeric chars.',
  'U':  '2-letter ISO country code for MAILING ADDRESS (e.g. US)',
  'V':  'Domestic: 5-digit ZIP (XXXXX). Foreign: up to 9 chars.',
  'W':  'Exactly 10 digits — must not be all zeros — uniquely identifies each form',
  'X':  '"B" = Business/Entity  |  "I" = Individual',
  'Y':  'Up to 40 chars — alphanumeric + - # ( ) & \' — required when X = "B"',
  'Z':  'Up to 40 chars — same chars as Line 1 plus / %',
  'AA': 'Up to 20 chars, letters and hyphens — required when X = "I"',
  'AB': 'Up to 20 chars, letters and hyphens',
  'AC': 'Up to 20 chars, letters and hyphens — required when X = "I"',
  'AD': 'Up to 20 chars, letters and hyphens',
  'AE': 'Up to 40 chars — additional recipient name line',
  'AF': '2-letter ISO country code for recipient TAX purposes',
  'AG': 'Up to 35 chars — alphanumeric + - / space',
  'AH': 'Up to 40 chars — letters and spaces only',
  'AI': 'Domestic: 2-letter state abbrev. Foreign: up to 17 alphanumeric chars.',
  'AJ': '2-letter ISO country code for recipient MAILING ADDRESS',
  'AK': 'Domestic: 5-digit ZIP. Foreign: up to 9 chars.',
  'AL': 'SSN | EIN | ATIN | ITIN | QI-EIN | UND',
  'AM': 'SSN/ITIN/ATIN → XXX-XX-XXXX  |  EIN/QI-EIN → XX-XXXXXXX  |  UND → 9 digits',
  'AN': '2-digit code 00–41 (Recipient Ch. 3 status)',
  'AO': '2-digit code 01–50 (Recipient Ch. 4 status)',
  'AP': 'GIIN format: XXXXXX.XXXXX.SL.NNN',
  'AQ': 'Foreign Tax ID — up to 50 chars',
  'AR': '2-digit LOB code: 02–12 (Limitation on Benefits; blank if no treaty)',
  'AS': 'Up to 20 chars — alphanumeric + limited special chars',
  'AT': 'Format: MM/DD/YYYY (Excel serial dates are auto-converted)',
  'AU': '2-digit income code: 01–61 (see IRS Pub. 515 for code list)',
  'AV': 'Dollar amount — up to 2 decimal places — no $ or commas (e.g. 1500.00)',
  'AW': '"3" for Chapter 3  |  "4" for Chapter 4',
  'AX': '2-digit code: 00,01–08,10–12,22–24 — required when AW = 3',
  'AY': 'Rate e.g. ".1500" for 15% — required when AX has a value  |  Valid: 0000,.0200,.0400…,.3700',
  'AZ': '2-digit code: 00,13–21 — always required',
  'BA': '".0000", "0000", or ".3000" — always required',
  'BB': 'Dollar amount — use "0" if not applicable',
  'BC': 'Dollar amount — gross income minus withholding allowance',
  'BD': 'Dollar amount — required; use "0" if no federal tax withheld',
  'BE': '"Y" or "N" — escrow procedures applied (Box 7b)',
  'BF': '"Y" or "N" — withholding paid in subsequent year (Box 7c)',
  'BG': '"Y" or "N" — QI/WFP/WFT revising its reporting (Box 7d)',
  'BH': 'Dollar amount — required; use "0" if no tax withheld by other agents',
  'BI': 'Dollar amount — overwithheld tax repaid to recipient (Box 9)',
  'BJ': 'Dollar amount — tax WA paid but did not withhold from recipient (Box 11)',
  'BK': 'Up to 40 chars — name of primary WA if different from the WA',
  'BL': 'Format: XX-XXXXXXX — EIN of primary withholding agent',
  'BM': 'Up to 40 chars — additional name line for primary WA',
  'BN': '"Y" or "N" — pro-rata basis reporting indicator',
  'BO': 'Format: XX-XXXXXXX — EIN of intermediary or flow-through entity',
  'BP': '2-digit code: 05–41 (Intermediary Ch. 3 status)',
  'BQ': '2-digit code: 01–50 (Intermediary Ch. 4 status)',
  'BR': '"B" = Business/Entity  |  "I" = Individual',
  'BS': 'Up to 40 chars — required when BR = "B"',
  'BT': 'Up to 40 chars — Line 2 continuation',
  'BU': 'Up to 10 chars, letters and hyphens — required when BR = "I"',
  'BV': 'Up to 10 chars, letters and hyphens',
  'BW': 'Up to 10 chars, letters and hyphens — required when BR = "I"',
  'BX': 'Up to 5 chars, letters and hyphens',
  'BY': 'Up to 40 chars — additional intermediary name line',
  'BZ': 'GIIN format: XXXXXX.XXXXX.SL.NNN',
  'CA': '2-letter ISO country code for TAX purposes',
  'CB': 'Foreign Tax ID — up to 50 chars',
  'CC': 'Up to 35 chars — alphanumeric + - / space',
  'CD': 'Up to 40 chars — letters and spaces only',
  'CE': 'Domestic: 2-letter state abbrev. Foreign: up to 17 alphanumeric chars.',
  'CF': '2-letter ISO country code for MAILING ADDRESS',
  'CG': 'Domestic: 5-digit ZIP. Foreign: up to 9 chars.',
  'CH': '"B" = Business/Entity  |  "I" = Individual',
  'CI': 'Up to 40 chars — required when CH = "B"',
  'CJ': 'Up to 40 chars — Line 2 continuation',
  'CK': 'Up to 10 chars, letters and hyphens — required when CH = "I"',
  'CL': 'Up to 10 chars, letters and hyphens',
  'CM': 'Up to 10 chars, letters and hyphens — required when CH = "I"',
  'CN': 'Up to 5 chars, letters and hyphens',
  'CO': 'Up to 40 chars — additional payer name line',
  'CP': 'Digits and dashes only — TIN of the payer',
  'CQ': 'GIIN format: XXXXXX.XXXXX.SL.NNN',
  'CR': '2-digit code: 05–41 (Payer Ch. 3 status)',
  'CS': '2-digit code: 01–50 (Payer Ch. 4 status)',
  'CT': '2-letter state abbreviation (e.g. FL) — State 1 for state tax filing',
  'CU': 'Dollar amount — State 1 income tax withheld',
  'CV': 'Up to 12 chars — state account/ID number for State 1',
  'CW': 'Dollar amount — State 1 state income',
  'CX': 'Dollar amount — State 1 local income tax withheld',
  'CY': 'Up to 60 chars — state-specific additional data for State 1',
  'CZ': '2-letter state abbreviation — State 2 for state tax filing',
  'DA': 'Dollar amount — State 2 income tax withheld',
  'DB': 'Up to 12 chars — state account/ID number for State 2',
  'DC': 'Dollar amount — State 2 state income',
  'DD': 'Dollar amount — State 2 local income tax withheld',
  'DE': 'Up to 60 chars — state-specific additional data for State 2',
};

// ─── Output column mapping ────────────────────────────────────────────────────
// Maps the ingestion template snake_case keys (row 1 of the template CSV) to
// internal schema column letters. col=null means no schema equivalent (output blank).
const OUTPUT_COLUMNS = [
  { key: 'account_id',                   col: 'W'  },
  { key: 'income_code',                  col: 'AU' },
  { key: 'gross_income',                 col: 'AV' },
  { key: 'chapter_indicator',            col: 'AW' },
  { key: 'exemption_code_3a',            col: 'AX' },
  { key: 'tax_rate_3b',                  col: 'AY' },
  { key: 'recipient_lob_code',           col: 'AR' },
  { key: 'exemption_code_4a',            col: 'AZ' },
  { key: 'tax_rate_4b',                  col: 'BA' },
  { key: 'withholding_allowance',        col: 'BB' },
  { key: 'federal_tax_withheld',         col: 'BD' },
  { key: 'not_escrow_checkbox',          col: 'BE' },
  { key: 'wh_in_sub_year_checkbox',      col: 'BF' },
  { key: 'qi_wfp_wft',                   col: 'BG' },
  { key: 'tax_withheld_by_other_agents', col: 'BH' },
  { key: 'overwithheld_tax_repaid',      col: 'BI' },
  { key: 'tax_paid_by_wha',             col: 'BJ' },
  { key: 'primary_wha_name',             col: 'BK' },
  { key: 'primary_wha_ein',              col: 'BL' },
  { key: 'prorata_basis_checkbox',       col: 'BN' },
  { key: 'payer_name',                   col: 'CI' },
  { key: 'payer_tin',                    col: 'CP' },
  { key: 'payer_giin',                   col: 'CQ' },
  { key: 'payer_ch3_status',             col: 'CR' },
  { key: 'payer_ch4_status',             col: 'CS' },
  { key: 'state_withholding',            col: 'CU' },
  { key: 'payers_state_number',          col: 'CV' },
  { key: 'state_name',                   col: 'CT' },
  { key: 'final_return',                 col: null },
];
