import { supabase } from './supabase'

export type ReportFilters = {
  classId?: string
  sectionId?: string
  gender?: string
  dobFrom?: string
  dobTo?: string
  enrolmentType?: string
}

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

// Draw image with rounded corners using an offscreen canvas
async function roundedImageBase64(
  b64: string,
  size: number,   // output px (square)
  radius: number  // corner radius px
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(size - radius, 0)
      ctx.quadraticCurveTo(size, 0, size, radius)
      ctx.lineTo(size, size - radius)
      ctx.quadraticCurveTo(size, size, size - radius, size)
      ctx.lineTo(radius, size)
      ctx.quadraticCurveTo(0, size, 0, size - radius)
      ctx.lineTo(0, radius)
      ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(b64) // fallback: original
    img.src = b64
  })
}

// Draw a grey circle avatar with initials when no photo
function drawDummyAvatar(doc: any, name: string, x: number, y: number, size: number) {
  const cx = x + size / 2
  const cy = y + size / 2
  const r  = size / 2

  doc.setFillColor(200, 200, 210)
  doc.circle(cx, cy, r, 'F')

  const initials = name
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(size * 2.2)
  doc.setFont('helvetica', 'bold')
  doc.text(initials, cx, cy + size * 0.35, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
}

export async function generateStudentPDF(
  filters: ReportFilters,
  meta: { className?: string; sectionName?: string }
) {
  const jsPDF     = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const students = await fetchReportData(filters)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Header ──
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(109, 40, 217)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('GHS Nawakalay (Barikot) — Student Report', 14, 14)

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

  // ── Pre-fetch photos and apply rounded corners via canvas ──
  const photoMap: Record<string, string> = {}
  await Promise.all(
    students.map(async s => {
      const url = s.users?.avatar_url
      if (url) {
        const b64 = await fetchImageBase64(url)
        if (b64) {
          // 120px canvas → 12mm in PDF, 16px radius ≈ 2mm
          photoMap[s.id] = await roundedImageBase64(b64, 120, 16)
        }
      }
    })
  )

  // ── Image dimensions ──
  // Keep image small so it fits inside the row without expanding it
  const IMG  = 12   // mm — image width & height
  const PAD  = 1.5  // mm — padding inside cell
  const ROW_H = IMG + PAD * 2  // row height driven by image

  const columns = [
    { header: '#',             dataKey: 'idx'     },
    { header: 'Photo',         dataKey: 'photo'   },
    { header: 'Name',          dataKey: 'name'    },
    { header: 'Roll No',       dataKey: 'roll'    },
    { header: 'Class',         dataKey: 'class'   },
    { header: 'Section',       dataKey: 'section' },
    { header: 'Gender',        dataKey: 'gender'  },
    { header: 'Date of Birth', dataKey: 'dob'     },
    { header: 'Parent',        dataKey: 'parent'  },
    { header: 'Contact',       dataKey: 'contact' },
    { header: 'Blood Group',   dataKey: 'blood'   },
  ]

  const rows = students.map((s, i) => ({
    idx:     i + 1,
    photo:   '',
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
    _name:   s.users?.name ?? '?',
  }))

  autoTable(doc, {
    startY: 26,
    columns,
    body: rows,
    headStyles: {
      fillColor:  [109, 40, 217],
      textColor:  255,
      fontStyle:  'bold',
      fontSize:   7.5,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize:       7.5,
      textColor:      40,
      minCellHeight:  ROW_H,
      cellPadding:    PAD,
      fillColor:      255,   // white — no alternating stripes
    },
    // No alternating row colour — just borders
    alternateRowStyles: { fillColor: 255 },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.2,
    columnStyles: {
      idx:   { cellWidth: 7   },
      photo: { cellWidth: IMG + PAD * 2 },
    },
    margin: { left: 14, right: 14 },

    didDrawCell(data) {
      if (data.section !== 'body' || data.column.dataKey !== 'photo') return

      const row  = data.row.raw as any
      const b64  = photoMap[row._id]
      const imgX = data.cell.x + PAD
      const imgY = data.cell.y + (data.cell.height - IMG) / 2

      if (b64) {
        // Already rounded PNG from canvas
        doc.addImage(b64, 'PNG', imgX, imgY, IMG, IMG)
      } else {
        drawDummyAvatar(doc, row._name, imgX, imgY, IMG)
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
