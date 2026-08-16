import React, { useState, useEffect, useMemo, useRef } from "react"

interface ImagePreviewViewportProps {
  src: string
  thumbnailSrc?: string
  alt: string
  rotation: number
  itemWidth?: number
  itemHeight?: number
  transformRef: React.RefObject<HTMLDivElement | null>
}

export const ImagePreviewViewport: React.FC<ImagePreviewViewportProps> = React.memo(
  ({
    src,
    thumbnailSrc,
    alt,
    rotation,
    itemWidth,
    itemHeight,
    transformRef,
  }) => {
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
      width: 0,
      height: 0,
    })

    const viewportRef = useRef<HTMLDivElement>(null)

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

      const natW = itemWidth || naturalSize?.width
      const natH = itemHeight || naturalSize?.height
      const cW = containerSize.width
      const cH = containerSize.height

      if (natW && natH && cW && cH) {
        const normalScale = Math.min(cW / natW, cH / natH)
        const rotatedScale = Math.min(cW / natH, cH / natW)
        return rotatedScale / normalScale
      }
      return 1
    }, [rotation, itemWidth, itemHeight, naturalSize, containerSize])

    return (
      <div
        ref={viewportRef}
        className="pointer-events-none relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        <div
          ref={transformRef}
          className="pointer-events-none flex h-full w-full items-center justify-center transition-transform ease-out"
        >
          <div className="pointer-events-none relative flex h-full w-full max-h-full max-w-full items-center justify-center">
            {/* Low-res thumbnail fallback behind main image */}
            {thumbnailSrc && thumbnailSrc !== src && (
              <img
                src={thumbnailSrc}
                alt=""
                aria-hidden="true"
                style={{
                  transform: `rotate(${rotation}deg) scale(${imgFitScale})`,
                }}
                className="pointer-events-none absolute max-h-full max-w-full object-contain select-none opacity-50"
              />
            )}

            {/* High-res Main Image */}
            <img
              src={src}
              alt={alt}
              onLoad={(e) => {
                const img = e.currentTarget
                if (!itemWidth || !itemHeight) {
                  setNaturalSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  })
                }
              }}
              style={{
                transform: `rotate(${rotation}deg) scale(${imgFitScale})`,
              }}
              className="pointer-events-none relative z-10 max-h-full max-w-full object-contain shadow-lg select-none transition-transform duration-200 ease-out"
            />
          </div>
        </div>
      </div>
    )
  }
)

ImagePreviewViewport.displayName = "ImagePreviewViewport"

