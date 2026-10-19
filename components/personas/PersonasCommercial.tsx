"use client";

// P3 · Bloque comercial del resultado: precio y condiciones, y la solicitud por WhatsApp.
import { useMemo } from "react";
import type { PersonasAnswersModel } from "../../lib/personas/answers";
import { buildPersonasQuote, personasConditions } from "../../lib/personas/quote";
import PersonasOffer from "./PersonasOffer";
import PersonasRequest from "./PersonasRequest";
import styles from "./personas.module.css";

export default function PersonasCommercial({ model }: { model: PersonasAnswersModel }) {
  const quote = useMemo(() => buildPersonasQuote(model), [model]);
  const conditions = useMemo(() => personasConditions(), []);
  return (
    <div className={styles.commercial}>
      <PersonasOffer quote={quote} conditions={conditions} />
      <PersonasRequest model={model} quote={quote} conditions={conditions} />
    </div>
  );
}
