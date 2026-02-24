import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { getNodesBounds, getViewportForBounds } from 'reactflow'
import type { Node } from 'reactflow'

const IMAGE_WIDTH = 1920
const IMAGE_HEIGHT = 1080

function getViewport() {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewport) throw new Error('ReactFlow viewport not found')
  return viewport
}

function computeExportTransform(nodes: Node[]) {
  const nodesBounds = getNodesBounds(nodes)
  const { x, y, zoom } = getViewportForBounds(nodesBounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.5, 2, 0.1)
  return { x, y, zoom }
}

const filterNodes = (node: HTMLElement): boolean => {
  if (!node?.classList) return true
  return !node.classList.contains('react-flow__minimap') &&
    !node.classList.contains('react-flow__controls') &&
    !node.classList.contains('react-flow__panel') &&
    !node.classList.contains('react-flow__attribution')
}

/**
 * Temporarily applies the export transform directly to the viewport DOM element,
 * captures an image, then restores the original styles.
 * This ensures SVG edges are properly positioned during capture,
 * unlike the `style` option in html-to-image which doesn't propagate to nested SVGs.
 */
async function captureWithDOMTransform<T>(
  viewport: HTMLElement,
  nodes: Node[],
  captureFn: (viewport: HTMLElement, options: Record<string, unknown>) => Promise<T>,
  extraOptions: Record<string, unknown> = {},
): Promise<T> {
  const { x, y, zoom } = computeExportTransform(nodes)

  // Save original inline styles
  const originalTransform = viewport.style.transform
  const originalWidth = viewport.style.width
  const originalHeight = viewport.style.height

  // Directly modify the viewport DOM for capture
  viewport.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`
  viewport.style.width = `${IMAGE_WIDTH}px`
  viewport.style.height = `${IMAGE_HEIGHT}px`

  // Wait a frame for the DOM to update
  await new Promise(resolve => requestAnimationFrame(resolve))

  const options: Record<string, unknown> = {
    backgroundColor: '#ffffff',
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    filter: filterNodes,
    cacheBust: true,
    skipFonts: true,
    ...extraOptions,
  }

  try {
    // First call to warm up (fonts/images get cached)
    await captureFn(viewport, options).catch(() => {})
    // Second call produces correct output
    const result = await captureFn(viewport, options)
    return result
  } finally {
    // Always restore original styles
    viewport.style.transform = originalTransform
    viewport.style.width = originalWidth
    viewport.style.height = originalHeight
  }
}

export async function exportToPNG(nodes: Node[], filename: string = 'mindmap.png'): Promise<void> {
  const viewport = getViewport()

  const dataUrl = await captureWithDOMTransform(
    viewport,
    nodes,
    (el, opts) => toPng(el, opts),
    { pixelRatio: 2 },
  )

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToSVG(nodes: Node[], filename: string = 'mindmap.svg'): Promise<void> {
  const viewport = getViewport()

  const dataUrl = await captureWithDOMTransform(
    viewport,
    nodes,
    (el, opts) => toSvg(el, opts),
  )

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToJPG(nodes: Node[], filename: string = 'mindmap.jpg'): Promise<void> {
  const viewport = getViewport()

  // Use the same captureWithDOMTransform for proper edge rendering
  const dataUrl = await captureWithDOMTransform(
    viewport,
    nodes,
    (el, opts) => toPng(el, opts),
    { pixelRatio: 2 },
  )

  // Convert PNG to JPG (reduce quality for smaller file size)
  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => { img.onload = resolve })

  const jpgCanvas = document.createElement('canvas')
  jpgCanvas.width = img.width
  jpgCanvas.height = img.height
  const ctx = jpgCanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  // White background for JPG (no transparency)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height)
  ctx.drawImage(img, 0, 0)

  const jpgDataUrl = jpgCanvas.toDataURL('image/jpeg', 0.9)

  const link = document.createElement('a')
  link.download = filename
  link.href = jpgDataUrl
  link.click()
}

export async function exportToPDF(nodes: Node[], filename: string = 'mindmap.pdf', title?: string): Promise<void> {
  const viewport = getViewport()

  const dataUrl = await captureWithDOMTransform(
    viewport,
    nodes,
    (el, opts) => toPng(el, opts),
    { pixelRatio: 2 },
  )

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
