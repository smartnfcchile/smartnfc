"use client";

// Experiencia conversacional de SmartNFC Locales (F2) sobre el motor de preguntas (F0).
import { useMemo } from "react";
import FlowShell from "../flow/FlowShell";
import { LOCALES_FLOW } from "../../content/flows/locales";
import { buildProposal } from "../../lib/locales/proposal";
import type { Answers } from "../../lib/flow/types";
import type { LocalesQuoteSlot, LocalesRequestSlot } from "./contracts";
import LocalesPreview from "./LocalesPreview";
import LocalesResult from "./LocalesResult";

function Preview({ answers }: { answers: Answers }) {
  const proposal = useMemo(() => buildProposal(answers), [answers]);
  return <LocalesPreview proposal={proposal} />;
}

export default function LocalesFlow({ exitHref, renderQuote, renderRequest }: {
  exitHref: string;
  /** F3: resultado económico (no implementado en F2). */
  renderQuote?: LocalesQuoteSlot;
  /** F3: solicitud comercial final (no implementada en F2). */
  renderRequest?: LocalesRequestSlot;
}) {
  return (
    <FlowShell
      flow={LOCALES_FLOW}
      label="Arma la propuesta de SmartNFC para tu local"
      exitHref={exitHref}
      exitLabel="Ver precios sin responder"
      renderPreview={answers => <Preview answers={answers} />}
      renderResult={(answers, flow) => {
        const proposal = buildProposal(answers);
        // La clave reinicia los tamaños elegidos si cambian los puntos.
        const key = proposal.points.map(p => `${p.location}:${p.quantity}`).join("|");
        return (
          <LocalesResult key={key} proposal={proposal} pricesHref={exitHref}
            onChangeAnswers={flow.goBack} onRestart={flow.restart}
            renderQuote={renderQuote} renderRequest={renderRequest} />
        );
      }}
    />
  );
}
