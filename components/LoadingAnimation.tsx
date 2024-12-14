'use client'

import React from 'react'
import type { RenderProgress } from './artDesign2'

interface LoadingAnimationProps {
  progress?: RenderProgress;
}

export function LoadingAnimation({ progress }: LoadingAnimationProps) {
  const percentage = progress ? Math.round((progress.completed / progress.total) * 100) : 0;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50">
      <div className="relative space-y-4 text-center">        
        {progress && (
          <div className="space-y-2">
            <div className="text-white/60 text-sm">
              Generating Art {progress.completed} / {progress.total}
            </div>
            <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/80 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 