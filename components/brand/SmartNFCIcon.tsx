import Image from "next/image";

interface SmartNFCIconProps {
  size?: number | string;
  variant?: "default" | "dark" | "monochrome" | "icon";
  className?: string;
}

export default function SmartNFCIcon({ size = 32, variant = "default", className = "" }: SmartNFCIconProps) {
  return <span
    className={`relative inline-block shrink-0 ${variant === "monochrome" ? "grayscale" : ""} ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <Image src="/brand/smartnfc-icon.png" alt="" fill sizes={`${typeof size === "number" ? size : 64}px`} className="object-contain" priority />
  </span>;
}
