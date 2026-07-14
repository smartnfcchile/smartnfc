import React from "react";
import SmartNFCIcon from "./SmartNFCIcon";

interface SmartNFCLogoProps {
  size?: number | string;
  variant?: "default" | "dark" | "monochrome" | "icon";
  className?: string;
  showText?: boolean;
}

export default function SmartNFCLogo({
  size = 28,
  variant = "default",
  className = "",
  showText = true,
}: SmartNFCLogoProps) {
  // Configuración del color del texto "Smart"
  let smartTextColor = "text-slate-900 dark:text-white";
  if (variant === "dark") {
    smartTextColor = "text-white";
  } else if (variant === "default") {
    smartTextColor = "text-slate-900";
  } else if (variant === "monochrome") {
    smartTextColor = "text-current";
  }

  // NFC es siempre azul brillante en variantes no monocromas
  const nfcTextColor = variant === "monochrome" ? "text-current" : "text-blue-600";

  if (variant === "icon") {
    return <SmartNFCIcon size={size} variant={variant} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Isotipo vectorial */}
      <SmartNFCIcon size={size} variant={variant} className="shrink-0" />
      
      {/* Texto Imagotipo */}
      {showText && (
        <span className="font-black tracking-tight text-lg select-none leading-none">
          <span className={smartTextColor}>Smart</span>
          <span className={nfcTextColor}>NFC</span>
        </span>
      )}
    </div>
  );
}
