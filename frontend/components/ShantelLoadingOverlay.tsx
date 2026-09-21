"use client";

import Image from "next/image";

interface ShantelLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function ShantelLoadingOverlay({ isVisible, message = "Loading..." }: ShantelLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-forest/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-6">
        {/* Spinning Circles */}
        <div className="relative">
          {/* Outer Circle */}
          <div className="absolute inset-0 w-48 h-48 border-4 border-transparent border-t-brand-amber rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
          
          {/* Middle Circle */}
          <div className="absolute inset-2 w-44 h-44 border-4 border-transparent border-t-white rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          
          {/* Inner Circle */}
          <div className="absolute inset-4 w-40 h-40 border-4 border-transparent border-t-brand-amber/70 rounded-full animate-spin" style={{ animationDuration: '2.5s' }} />
          
          {/* Logo in center */}
          <div className="relative flex items-center justify-center w-48 h-48">
            <Image
              src="/logos/shantel-icon-full.svg"
              alt="SHANTEL"
              width={80}
              height={80}
              className="drop-shadow-lg"
              priority
            />
          </div>
        </div>

        {/* Loading Message */}
        {message && (
          <div className="text-center">
            <p className="text-white text-lg font-semibold tracking-wider">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
