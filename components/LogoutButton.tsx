"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-2 px-4 rounded-lg border border-red-500/50 transition-colors text-sm"
    >
      Cerrar Sesión
    </button>
  );
}