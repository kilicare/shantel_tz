"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Hide splash after loading is complete
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  if (!showSplash) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-6 w-full max-w-md px-8">
        <Image
          src="/logos/shantel-icon-full.svg"
          alt="SHANTEL"
          width={64}
          height={64}
          className="animate-pulse"
          priority
        />
        <div className="text-white text-center">
          <p className="text-2xl font-bold tracking-wider">SHANTEL</p>
          <p className="text-sm text-muted-foreground tracking-widest">SALES OPERATIONS</p>
        </div>
        
        {/* Loading Bar */}
        <div className="w-48">
          <div className="w-full h-0.5 bg-card/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-card transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-white/60">
            <span>Loading...</span>
            <span>{Math.min(Math.round(progress), 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
