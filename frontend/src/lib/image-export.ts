import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'

function getFlowElements() {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewport) throw new Error('ReactFlow viewport not found')
  return viewport
}

const filterNodes = (node: HTMLElement): boolean => {
  if (!node?.classList) return true
  return !node.classList.contains('react-flow__minimap') &&
    !node.classList.contains('react-flow__controls') &&
    !node.classList.contains('react-flow__panel') &&
    !node.classList.contains('react-flow__attribution')
}

export async function exportToPNG(filename: string = 'mindmap.png'): Promise<void> {
  const viewport = getFlowElements()

  const flowContainer = document.querySelector('.react-flow') as HTMLElement
  const flowRect = flowContainer.getBoundingClientRect()

  const imageWidth = flowRect.width
  const imageHeight = flowRect.height

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: imageWidth,
    height: imageHeight,
    filter: filterNodes,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToSVG(filename: string = 'mindmap.svg'): Promise<void> {
  const viewport = getFlowElements()

  const flowContainer = document.querySelector('.react-flow') as HTMLElement
  const flowRect = flowContainer.getBoundingClientRect()

  const dataUrl = await toSvg(viewport, {
    backgroundColor: '#ffffff',
    width: flowRect.width,
    height: flowRect.height,
    filter: filterNodes,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToPDF(filename: string = 'mindmap.pdf', title?: string): Promise<void> {
  const viewport = getFlowElements()

  const flowContainer = document.querySelector('.react-flow') as HTMLElement
  const flowRect = flowContainer.getBoundingClientRect()

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: flowRect.width,
    height: flowRect.height,
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
