import * as XLSX from 'xlsx'
import { supabase } from './supabase'

export type ImportRow = {
  adm_no: string
  adm_date: string
  name: string
  father_name: string
  dob: string
  gender: string
  cnic: string
  f_cnic: string
  roll_number: string
  emg_no: string
  enrolment_type: string
}

export type ImportResult = {
  success: number
  failed: number
  errors: { row: number; name: string; reason: string }[]
}

// Parse XLS/CSV file into rows
export function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const rows: ImportRow[] = raw.map((r) => ({
          adm_no:         String(r['ADM_NO'] ?? '').trim(),
          adm_date:       String(r['ADM_DATE'] ?? '').trim(),
          name:           String(r['STD_NAME'] ?? '').trim(),
          father_name:    String(r['STD_FNAME'] ?? '').trim(),
          dob:            String(r['DOB'] ?? '').trim(),
          gender:         String(r['GENDER'] ?? 'MALE').trim().toLowerCase(),
          cnic:           String(r['CNIC'] ?? '').trim(),
          f_cnic:         String(r['F_CNIC'] ?? '').trim(),
          roll_number:    String(r['CLS_ROLL_NO'] ?? r['STD_ID'] ?? '').trim(),
          emg_no:         String(r['EMG_NO'] ?? '').trim(),
          enrolment_type: String(r['ENROLMENT_TYPE'] ?? '').trim(),
        }))

        resolve(rows.filter(r => r.name))
      } catch (err: any) {
        reject(new Error('Failed to parse file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Parse date strings like "20-Mar-14" or "2026-03-02"
function parseDate(raw: string): string | null {
  if (!raw) return null
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // e.g. "20-Mar-14" → assume 2000s
  const months: Record<string, string> = {
    jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
    jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
  }
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const mon = months[m[2].toLowerCase()] ?? '01'
    const yr = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${yr}-${mon}-${day}`
  }
  return null
}

export async function importStudents(
  rows: ImportRow[],
  classId: string,
  sectionId: string
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // Unique internal email per student
      const email = `student.${row.adm_no || i}.${Date.now()}@school.internal`

      // Insert into users
      const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({
          email,
          name: row.name,
          role: 'student',
          phone: row.emg_no || null,
          date_of_birth: parseDate(row.dob),
          gender: row.gender === 'female' ? 'female' : 'male',
        })
        .select('id')
        .single()

      if (userErr) throw new Error(userErr.message)

      // Insert into students
      const { error: stuErr } = await supabase.from('students').insert({
        user_id:     user.id,
        roll_number: row.roll_number || row.adm_no,
        class_id:    classId,
        section_id:  sectionId,
        parent_name: row.father_name || null,
        parent_phone: row.emg_no || null,
        date_of_birth: parseDate(row.dob),
        gender: row.gender === 'female' ? 'female' : 'male',
        address: null,
      })

      if (stuErr) throw new Error(stuErr.message)
      result.success++
    } catch (err: any) {
      result.failed++
      result.errors.push({ row: i + 2, name: row.name, reason: err.message })
    }
  }

  return result
}
