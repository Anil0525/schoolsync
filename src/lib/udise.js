// UDISE+ readiness rules and export columns.
// EXPORT_HEAD is the exact column list (names and order) from the SDMS sheet the school gave us (2026-11-10).
// REQUIRED is the set of those columns that the school itself must supply.
export const filled = (v) => v !== null && v !== undefined && String(v).trim() !== ''

export const REQUIRED = [
  ['full_name', 'Name'],
  ['gender', 'Gender'],
  ['section_id', 'Class & section'],
  ['father_name', "Father's name"],
  ['mother_name', "Mother's name"],
  ['social_category', 'Social category'],
  ['pen', 'Student PEN'],
  ['apaar_id', 'APAAR ID'],
]

// labels of fields still missing for one student
export function missingFields(s) {
  const m = REQUIRED.filter(([k]) => !filled(s[k])).map(([, label]) => label)
  if (s.minority && !filled(s.minority_group)) m.push('Minority group')
  if (s.cwsn && !filled(s.impairment_type)) m.push('Type of impairment')
  return m
}

// Exact headers and order of the SDMS sheet. Columns the portal fills itself, and Aadhaar details
// (deliberately never stored here, enter them on the portal), are exported empty.
export const EXPORT_HEAD = [
  'Class', 'Section', 'Name', 'Gender', 'Initialised at SDMS', 'Student PEN', 'Student State Code', 'Father Name', 'Mother Name',
  'Social Category', 'Minority Group', 'BPL beneficiary', 'CWSN', 'Type of Impairments', 'Is Repeater', 'Suspected Duplicate',
  'Entry Status', 'AADHAAR No.', 'Name As per AADHAAR', 'AADHAAR Validation Status', 'MBU Status', 'APAAR ID', 'APAAR Status',
]

const yn = (b) => (b ? 'Yes' : 'No')
export function exportRow(s) {
  return [
    s.ss_sections?.ss_classes?.name || '', s.ss_sections?.name || '', s.full_name || '', s.gender || '',
    '', s.pen || '', '', s.father_name || '', s.mother_name || '',
    s.social_category || '', s.minority ? (s.minority_group || 'Yes') : 'No', yn(s.bpl), yn(s.cwsn),
    s.cwsn ? (s.impairment_type || '') : '', yn(s.is_repeater), '',
    '', '', '', '', '', s.apaar_id || '', '',
  ]
}
