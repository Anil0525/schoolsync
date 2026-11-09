// UDISE+ readiness rules and export columns.
// REQUIRED is our working list, based on the SDMS "Students List" columns. Adjust it after comparing with the official bulk-upload template.
export const filled = (v) => v !== null && v !== undefined && String(v).trim() !== ''

export const REQUIRED = [
  ['full_name', 'Name'],
  ['gender', 'Gender'],
  ['section_id', 'Class & section'],
  ['dob', 'Date of birth'],
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

// same order as the columns of the SDMS Students List (fields the school can supply; Aadhaar columns are left to the portal)
export const EXPORT_HEAD = [
  'Class', 'Section', 'Name', 'Gender', 'Date of Birth', 'Student PEN', 'Father Name', 'Mother Name',
  'Social Category', 'Minority Group', 'BPL beneficiary', 'CWSN', 'Type of Impairments', 'Is Repeater', 'APAAR ID',
]

const yn = (b) => (b ? 'Yes' : 'No')
export function exportRow(s) {
  return [
    s.ss_sections?.ss_classes?.name || '', s.ss_sections?.name || '', s.full_name || '', s.gender || '',
    s.dob || '', s.pen || '', s.father_name || '', s.mother_name || '',
    s.social_category || '', s.minority ? (s.minority_group || 'Yes') : 'No', yn(s.bpl), yn(s.cwsn),
    s.cwsn ? (s.impairment_type || '') : '', yn(s.is_repeater), s.apaar_id || '',
  ]
}
