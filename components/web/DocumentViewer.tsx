"use client";

import { Button } from "@/components/ui/button";
import { RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface DocumentViewerProps {
  url: string;
  fileName: string;
  fileType: string;
}

/**
 * Renders a previewable document for staff/owners to inspect.
 *
 * - Images: a thumbnail that opens a fullscreen lightbox with zoom (buttons
 *   AND mouse-wheel), pan (click+drag), rotate, and reset. Esc closes.
 * - PDFs: an embedded iframe at a useful height so the browser's built-in
 *   viewer handles paging/zoom natively.
 * - Anything else: a plain "open in new tab" link.
 *
 * Always renders an "Open in new tab" link below the preview as a fallback
 * (users can right-click → Save As to download).
 */
export function DocumentViewer({ url, fileName, fileType }: DocumentViewerProps) {
  const isImage = fileType.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  return (
    <div className="space-y-2">
      {isImage && <ImagePreview url={url} fileName={fileName} />}
      {isPdf && (
        <iframe
          src={url}
          title={fileName}
          className="w-full h-[600px] rounded border bg-white"
        />
      )}
      {!isImage && !isPdf && (
        <p className="text-sm text-muted-foreground">
          Preview not available for this file type. Use the link below.
        </p>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline block"
      >
        Open file in new tab →
      </a>
    </div>
  );
}

// ---------- Image preview + lightbox ----------

function ImagePreview({ url, fileName }: { url: string; fileName: string }) {
  const [open, setOpen] = useState(false);

  // The lightbox uses `position: fixed inset-0`, which is supposed to
  // anchor it to the viewport. But fixed positioning is broken when ANY
  // ancestor has `transform`, `filter`, `perspective`, `will-change`, or
  // `backdrop-filter` set — at that point fixed becomes relative to that
  // ancestor's bounding box instead. Several things on the document
  // detail page meet that criterion (motion.div with `layout` in the
  // comment composer, the spring shadow on hover, etc.), so when the
  // page is scrolled the lightbox's anchor is somewhere up-page and the
  // top toolbar lands above the visible viewport.
  //
  // Portaling into <body> guarantees the lightbox has no ancestors that
  // matter — its containing block is the viewport regardless of what
  // appears around the trigger image.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="max-h-96 mx-auto rounded border cursor-zoom-in"
          onClick={() => setOpen(true)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Click image to zoom
        </p>
      </div>
      {open &&
        mounted &&
        createPortal(
          <Lightbox
            url={url}
            fileName={fileName}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.25;

function Lightbox({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function clampZoom(z: number) {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  function reset() {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }

  function onWheel(e: React.WheelEvent) {
    // Multiplicative feel — bigger steps when already zoomed in.
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => clampZoom(z * factor));
  }

  function onMouseDown(e: React.MouseEvent) {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }
  function endDrag() {
    setDragging(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      // Clicking the backdrop closes; clicks on the toolbar and image
      // stop propagation so they don't dismiss the lightbox.
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-3 p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-medium truncate">{fileName}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-xs w-14 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate 90°"
          >
            <RotateCw className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={reset}>
            Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Image stage */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
            transition: dragging ? "none" : "transform 0.08s linear",
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>

      {/* Hint */}
      <p
        className="text-xs text-white/60 text-center pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        Scroll to zoom · Drag to pan · Esc or click outside to close
      </p>
    </div>
  );
}
