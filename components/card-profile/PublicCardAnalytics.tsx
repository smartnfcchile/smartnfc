"use client";

import { useEffect, useRef } from "react";

type PublicCardAnalyticsProps = {
  cardId: string;
  contactSource: "NFC" | "QR" | "DIRECT";
};

export default function PublicCardAnalytics({ cardId, contactSource }: PublicCardAnalyticsProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // Protección básica de doble disparo en el mismo montaje
    if (trackedRef.current) return;
    trackedRef.current = true;

    // Correspondencia obligatoria:
    // NFC -> eventType = NFC_SCAN
    // QR -> eventType = VIEW
    // DIRECT -> eventType = VIEW
    const eventType = contactSource === "NFC" ? "NFC_SCAN" : "VIEW";

    fetch("/api/public/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cardId,
        eventType,
        contactSource,
      }),
    }).catch((err) => {
      console.error("Fallo al registrar evento analítico:", err);
    });
  }, [cardId, contactSource]);

  return null;
}
