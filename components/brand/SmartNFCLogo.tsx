import Image from "next/image";
import SmartNFCIcon from "./SmartNFCIcon";

interface SmartNFCLogoProps {
  size?: number | string;
  variant?: "default" | "dark" | "monochrome" | "icon";
  className?: string;
  showText?: boolean;
}

export default function SmartNFCLogo({ size = 28, variant = "default", className = "", showText = true }: SmartNFCLogoProps) {
  if (variant === "icon" || !showText) return <SmartNFCIcon size={size} variant={variant} className={className} />;

  const width = typeof size === "number" ? size * 3.35 : `calc(${size} * 3.35)`;
  return <span
    className={`relative inline-block shrink-0 ${variant === "dark" ? "brightness-0 invert" : ""} ${variant === "monochrome" ? "grayscale" : ""} ${className}`}
    style={{ width, height: size }}
    role="img"
    aria-label="SmartNFC"
  >
    <Image src="/brand/smartnfc-logo-nav.png" alt="SmartNFC" fill sizes="240px" className="object-contain object-left" priority />
  </span>;
}
