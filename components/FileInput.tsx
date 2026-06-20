"use client";

import React from "react";

type FileInputProps = {
  name: string;
  accept?: string;
  className?: string;
};

export default function FileInput({ name, accept, className }: FileInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size > 4 * 1024 * 1024) {
      alert(
        `¡Imagen demasiado grande! El archivo "${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(
          2
        )} MB. El límite máximo de subida en Vercel es de 4 MB por archivo para evitar fallos del servidor. Por favor, comprime la imagen o usa otra más liviana.`
      );
      e.target.value = ""; // Resetea el input
    }
  };

  return (
    <input
      type="file"
      name={name}
      accept={accept}
      onChange={handleChange}
      className={className}
    />
  );
}
