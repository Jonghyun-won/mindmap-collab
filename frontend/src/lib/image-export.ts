import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { getNodesBounds, getViewportForBounds } from 'reactflow'
import type { Node } from 'reactflow'

function getViewport() {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewport) throw new Error('ReactFlow viewport not found')
  return viewport
}

function computeExportTransform(nodes: Node[]) {
  const nodesBounds = getNodesBounds(nodes)

  // Calculate dynamic size based on bounds with padding
  const padding = 100  // pixels of padding around content
  const width = Math.max(1920, nodesBounds.width + padding * 2)
  const height = Math.max(1080, nodesBounds.height + padding * 2)

  // Increased zoom limits to prevent clipping
  const { x, y, zoom } = getViewportForBounds(
    nodesBounds,
    width,
    height,
    0.1,  // minZoom (can zoom out more)
    4,    // maxZoom (increased from 2)
    0.15  // padding (increased from 0.1)
  )

  return { x, y, zoom, width, height }
}

const filterNodes = (node: HTMLElement): boolean => {
  if (!node?.classList) return true
  return !node.classList.contains('react-flow__minimap') &&
    !node.classList.contains('react-flow__controls') &&
    !node.classList.contains('react-flow__panel') &&
    !node.classList.contains('react-flow__attribution')
}

export async function exportToPNG(nodes: Node[], filename: string = 'mindmap.png'): Promise<void> {
  const viewport = getViewport()
  const { x, y, zoom, width, height } = computeExportTransform(nodes)

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
    filter: filterNodes,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToSVG(nodes: Node[], filename: string = 'mindmap.svg'): Promise<void> {
  const viewport = getViewport()
  const { x, y, zoom, width, height } = computeExportTransform(nodes)

  const dataUrl = await toSvg(viewport, {
    backgroundColor: '#ffffff',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
    filter: filterNodes,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToPDF(nodes: Node[], filename: string = 'mindmap.pdf', title?: string): Promise<void> {
  const viewport = getViewport()
  const { x, y, zoom, width, height } = computeExportTransform(nodes)

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
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

  const x2 = (pageWidth - scaledWidth) / 2
  pdf.addImage(dataUrl, 'PNG', x2, yOffset, scaledWidth, scaledHeight)
  pdf.save(filename)
}
