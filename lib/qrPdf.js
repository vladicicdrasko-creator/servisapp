// Generiše A4 PDF sa QR kodom i opisom u donjem dijelu
export async function preuzmiQrPdf(qrDataUrl, naslov, linije, filename) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header traka
  doc.setFillColor(15, 76, 117)
  doc.rect(0, 0, 210, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ServisApp', 14, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('QR identifikacija opreme', 14, 21)

  // QR kod — centriran, gornji dio
  doc.addImage(qrDataUrl, 'PNG', 55, 45, 100, 100)

  // Opis — donji dio A4
  doc.setTextColor(20, 40, 60)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(naslov || '', 105, 180, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(70, 90, 110)
  let y = 194
  ;(linije || []).filter(Boolean).forEach((l) => {
    doc.text(String(l), 105, y, { align: 'center' })
    y += 8
  })

  // Footer
  doc.setFillColor(230, 235, 240)
  doc.rect(0, 275, 210, 22, 'F')
  doc.setFontSize(9)
  doc.setTextColor(100, 120, 140)
  doc.text('Skeniraj QR kod za prijavu kvara / identifikaciju.', 105, 287, { align: 'center' })

  doc.save(filename)
}
