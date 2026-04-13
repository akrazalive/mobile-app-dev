import { supabase } from './supabase'

// ─── Filter shape — add more fields here later ───────────────────────────────
export type ReportFilters = {
  classId?: string
  sectionId?: string
  gender?: string
  dobFrom?: string   // YYYY-MM-DD
  dobTo?: string     // YYYY-MM-DD
  enrolmentType?: string
}

// ─── Fetch students matching filters ─────────────────────────────────────────
export async function fetchReportData(filters: ReportFilters) {
  let query = supabase
    .from('students')
    .select('*, users(name, email, phone, avatar_url), classes(name), sections(name)')
    .order('roll_number', { ascending: true })

  if (filters.classId)   query = query.eq('class_id', filters.classId)
  if (filters.sectionId) query = query.eq('section_id', filters.sectionId)
  if (filters.gender)    query = query.eq('gender', filters.gender)
  if (filters.dobFrom)   query = query.gte('date_of_birth', filters.dobFrom)
  if (filters.dobTo)     query = query.lte('date_of_birth', filters.dobTo)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Fetch image as base64 ───────────────────────────────────────────────────
// Fetches directly from R2 and converts to base64 for jsPDF
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror  = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ─── Generate & download PDF ──────────────────────────────────────────────────
export async function generateStudentPDF(
  filters: ReportFilters,
  meta: { className?: string; sectionName?: string }
) {
  // Dynamic import — keeps jspdf out of the server bundle
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const students = await fetchReportData(filters)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Header ──
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(109, 40, 217)          // purple-700
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('GHS Nawakalay (Barikot) — Student Report', 14, 14)

  // ── Sub-header info ──
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const parts: string[] = []
  if (meta.className)   parts.push(`Class: ${meta.className}`)
  if (meta.sectionName) parts.push(`Section: ${meta.sectionName}`)
  if (filters.gender)   parts.push(`Gender: ${filters.gender}`)
  if (filters.dobFrom)  parts.push(`DOB from: ${filters.dobFrom}`)
  if (filters.dobTo)    parts.push(`DOB to: ${filters.dobTo}`)
  parts.push(`Generated: ${new Date().toLocaleDateString()}`)
  doc.text(parts.join('   |   '), 14, 20)

  // ── Pre-fetch all photos as base64 ──
  const photoMap: Record<string, string> = {}
  await Promise.all(
    students.map(async s => {
      const url = s.users?.avatar_url
      if (url) {
        const b64 = await fetchImageBase64(url)
        if (b64) photoMap[s.id] = b64
      }
    })
  )

  // ── Table ──
  doc.setTextColor(0, 0, 0)

  const columns = [
    { header: '#',            dataKey: 'idx'     },
    { header: 'Photo',        dataKey: 'photo'   },
    { header: 'Name',         dataKey: 'name'    },
    { header: 'Roll No',      dataKey: 'roll'    },
    { header: 'Class',        dataKey: 'class'   },
    { header: 'Section',      dataKey: 'section' },
    { header: 'Gender',       dataKey: 'gender'  },
    { header: 'Date of Birth',dataKey: 'dob'     },
    { header: 'Parent',       dataKey: 'parent'  },
    { header: 'Contact',      dataKey: 'contact' },
    { header: 'Blood Group',  dataKey: 'blood'   },
  ]

  const IMG_SIZE = 18  // mm — square, unrounded

  const rows = students.map((s, i) => ({
    idx:     i + 1,
    photo:   '',       // drawn manually in didDrawCell
    name:    s.users?.name ?? '—',
    roll:    s.roll_number ?? '—',
    class:   s.classes?.name ?? '—',
    section: s.sections?.name ?? '—',
    gender:  s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : '—',
    dob:     s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '—',
    parent:  s.parent_name ?? '—',
    contact: s.parent_phone ?? '—',
    blood:   s.blood_group ?? '—',
    _id:     s.id,
  }))

  autoTable(doc, {
    startY: 26,
    columns,
    body: rows,
    headStyles: {
      fillColor: [109, 40, 217],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles:          { fontSize: 8, textColor: 40, minCellHeight: IMG_SIZE + 2 },
    alternateRowStyles:  { fillColor: [248, 245, 255] },
    columnStyles: {
      idx:   { cellWidth: 8  },
      photo: { cellWidth: IMG_SIZE + 2 },
    },
    margin: { left: 14, right: 14 },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.dataKey === 'photo') {
        const row = data.row.raw as any
        const b64 = photoMap[row._id]
        if (b64) {
          const pad = 1
          // detect format from data URL prefix
          const fmt = b64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          doc.addImage(
            b64, fmt,
            data.cell.x + pad,
            data.cell.y + pad,
            IMG_SIZE, IMG_SIZE
          )
        }
      }
    },
  })

  // ── Footer ──
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `Page ${p} of ${pageCount}   |   Total Students: ${students.length}`,
      14,
      doc.internal.pageSize.getHeight() - 6
    )
  }

  const filename = [
    'students',
    meta.className?.replace(/\s+/g, '-'),
    meta.sectionName,
    new Date().toISOString().split('T')[0],
  ].filter(Boolean).join('_') + '.pdf'

  doc.save(filename)
  return students.length
}
