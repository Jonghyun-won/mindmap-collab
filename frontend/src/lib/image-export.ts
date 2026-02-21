import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'

function getFlowContainer(): HTMLElement | null {
  return document.querySelector('.react-flow') as HTMLElement | null
}

const filterNodes = (node: HTMLElement): boolean => {
  const classList = node?.classList
  if (!classList) return true
  return !classList.contains('react-flow__minimap') &&
    !classList.contains('react-flow__controls') &&
    !classList.contains('react-flow__panel')
}

export async function exportToPNG(filename: string = 'mindmap.png'): Promise<void> {
  const element = getFlowContainer()
  if (!element) throw new Error('ReactFlow element not found')

  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    filter: filterNodes,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToSVG(filename: string = 'mindmap.svg'): Promise<void> {
  const element = getFlowContainer()
  if (!element) throw new Error('ReactFlow element not found')

  const dataUrl = await toSvg(element, {
    backgroundColor: '#ffffff',
    filter: filterNodes,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToPDF(filename: string = 'mindmap.pdf', title?: string): Promise<void> {
  const element = getFlowContainer()
  if (!element) throw new Error('ReactFlow element not found')

  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    filter: filterNodes,
  })

  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => { img.onload = resolve })

  const imgWidth = img.width
  const imgHeight = img.height

  const isLandscape = imgWidth > imgHeight
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  let yOffset = 10
  if (title) {
    pdf.setFontSize(16)
    pdf.text(title, pageWidth / 2, yOffset, { align: 'center' })
    yOffset = 20
  }

  const availableWidth = pageWidth - 20
  const availableHeight = pageHeight - yOffset - 10
  const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight)
  const scaledWidth = imgWidth * scale
  const scaledHeight = imgHeight * scale

  const x = (pageWidth - scaledWidth) / 2
  pdf.addImage(dataUrl, 'PNG', x, yOffset, scaledWidth, scaledHeight)
  pdf.save(filename)
}
