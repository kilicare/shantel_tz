import Image from "next/image";

interface ShantelLogoProps {
  variant?: "horizontal" | "square" | "icon-full" | "icon-monochrome" | "icon-transparent";
  size?: number;
  className?: string;
}

export function ShantelLogo({ variant = "horizontal", size = 32, className }: ShantelLogoProps) {
  const logoMap = {
    horizontal: "/logos/shantel-logo-horizontal.svg",
    square: "/logos/shantel-logo-square.svg",
    "icon-full": "/logos/shantel-icon-full.svg",
    "icon-monochrome": "/logos/shantel-icon-monochrome.svg",
    "icon-transparent": "/logos/shantel-icon-transparent.svg",
  };

  return (
    <Image
      src={logoMap[variant]}
      alt="SHANTEL Logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
