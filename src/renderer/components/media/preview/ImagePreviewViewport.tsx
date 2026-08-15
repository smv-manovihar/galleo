import React, { useState, useEffect, useMemo, useRef } from "react"

interface ImagePreviewViewportProps {
  src: string
  alt: string
  rotation: number
  itemWidth?: number
  itemHeight?: number
  transformRef: React.RefObject<HTMLDivElement | null>
}

export const ImagePreviewViewport: React.FC<ImagePreviewViewportProps> = React.memo(
  ({
    src,
    alt,
    rotation,
    itemWidth,
    itemHeight,
    transformRef,
  }) => {
    const [loadedDimensions, setLoadedDimensions] = useState<{
      width: number
      height: number
    } | null>(null)
    const [containerSize, setContainerSize] = useState<{
      width: number
      height: number
    }>({ width: 0, height: 0 })
    const [enableTransition, setEnableTransition] = useState(false)
    const prevSrcRef = useRef(src)

    const viewportRef = useRef<HTMLDivElement>(null)

    // Reset dimensions and disable transition when src changes
    useEffect(() => {
      setLoadedDimensions(null)
      if (prevSrcRef.current !== src) {
        prevSrcRef.current = src
        setEnableTransition(false)
      }
      const timer = setTimeout(() => {
        setEnableTransition(true)
      }, 50)
      return () => clearTimeout(timer)
    }, [src])

    // Observe local viewport size for 90deg aspect scale calculation
    useEffect(() => {
      const el = viewportRef.current
      if (!el) return

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          })
        }
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [])

    const imgFitScale = useMemo(() => {
      const isRotated90 = Math.abs((rotation / 90) % 2) === 1
      if (!isRotated90) return 1

      const natW = loadedDimensions?.width || itemWidth
      const natH = loadedDimensions?.height || itemHeight
      const cW = containerSize.width
      const cH = containerSize.height

      if (natW && natH && cW && cH) {
        const normalScale = Math.min(cW / natW, cH / natH)
        const rotatedScale = Math.min(cW / natH, cH / natW)
        return rotatedScale / normalScale
      }
      return 1
    }, [rotation, loadedDimensions, itemWidth, itemHeight, containerSize])

    return (
      <div
        ref={viewportRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        <div
          ref={transformRef}
          className="pointer-events-none flex h-full w-full items-center justify-center transition-transform ease-out"
        >
          <div className="pointer-events-auto flex h-full w-full max-h-full max-w-full items-center justify-center">
            <img
              src={src}
              alt={alt}
              onLoad={(e) => {
                const img = e.currentTarget
                setLoadedDimensions({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                })
              }}
              style={{
                transform: `rotate(${rotation}deg) scale(${imgFitScale})`,
              }}
              className={`pointer-events-none max-h-full max-w-full object-contain shadow-lg select-none ${
                enableTransition ? "transition-transform duration-200" : ""
              }`}
            />
          </div>
        </div>
      </div>
    )
  }
)

ImagePreviewViewport.displayName = "ImagePreviewViewport"
