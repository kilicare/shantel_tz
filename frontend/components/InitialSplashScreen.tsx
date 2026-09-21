"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function InitialSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if this is the first visit using sessionStorage
    const hasVisited = sessionStorage.getItem("shantel_first_visit");
    
    if (hasVisited) {
      setShowSplash(false);
      return;
    }

    // Mark as visited
    sessionStorage.setItem("shantel_first_visit", "true");

    // Hide splash after 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-forest">
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

        {/* Welcome Message */}
        <div className="text-center">
          <p className="text-white text-2xl font-bold tracking-wider">SHANTEL</p>
          <p className="text-sm text-white/80 tracking-widest">SALES OPERATIONS</p>
        </div>
      </div>
    </div>
  );
}
