import React from "react";

interface SmartNFCIconProps {
  size?: number | string;
  variant?: "default" | "dark" | "monochrome" | "icon";
  className?: string;
}

export default function SmartNFCIcon({
  size = 32,
  variant = "default",
  className = "",
}: SmartNFCIconProps) {
  const isMonochrome = variant === "monochrome";
  
  // Colores planos oficiales
  const blueColor = isMonochrome ? "currentColor" : "#2563EB";
  const goldColor = isMonochrome ? "currentColor" : "#D4AF37";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Mitad superior (Azul plano) */}
      <path
        d="M23 9.5 C23 7 20 5.5 16 5.5 C11 5.5 9 7.5 9 11 C9 14.5 12 15.5 16 16.5"
        stroke={blueColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Mitad inferior (Dorado plano) */}
      <path
        d="M16 15.5 C20 16.5 23 17.5 23 21 C23 24.5 20 26.5 16 26.5 C12 26.5 9 24.5 9 22"
        stroke={goldColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Puntos de conexión minimalistas */}
      <circle cx="14" cy="10.5" r="1.5" fill={goldColor} />
      <circle cx="18" cy="21.5" r="1.5" fill={blueColor} />
    </svg>
  );
}
