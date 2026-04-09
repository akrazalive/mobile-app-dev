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
    .select('*, users(name, email, phone), classes(name), sections(name)')
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
  doc.text('Elite Academy — Student Report', 14, 14)

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

  // ── Table ──
  doc.setTextColor(0, 0, 0)

  const columns = [
    { header: '#',            dataKey: 'idx'         },
    { header: 'Name',         dataKey: 'name'        },
    { header: 'Roll No',      dataKey: 'roll'        },
    { header: 'Class',        dataKey: 'class'       },
    { header: 'Section',      dataKey: 'section'     },
    { header: 'Gender',       dataKey: 'gender'      },
    { header: 'Date of Birth',dataKey: 'dob'         },
    { header: 'Parent',       dataKey: 'parent'      },
    { header: 'Contact',      dataKey: 'contact'     },
    { header: 'Blood Group',  dataKey: 'blood'       },
  ]

  const rows = students.map((s, i) => ({
    idx:     i + 1,
    name:    s.users?.name ?? '—',
    roll:    s.roll_number ?? '—',
    class:   s.classes?.name ?? '—',
    section: s.sections?.name ?? '—',
    gender:  s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : '—',
    dob:     s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '—',
    parent:  s.parent_name ?? '—',
    contact: s.parent_phone ?? '—',
    blood:   s.blood_group ?? '—',
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
    bodyStyles: { fontSize: 8, textColor: 40 },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    columnStyles: { idx: { cellWidth: 8 } },
    margin: { left: 14, right: 14 },
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
