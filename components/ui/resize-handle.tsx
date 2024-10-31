"use client"

import { cn } from "@/lib/utils"

interface ResizeHandleProps {
  className?: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ className, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      className={cn(
        "absolute inset-y-0 w-1 hover:bg-blue-500/50 cursor-col-resize transition-colors",
        className
      )}
      onMouseDown={onMouseDown}
    />
  )
} 