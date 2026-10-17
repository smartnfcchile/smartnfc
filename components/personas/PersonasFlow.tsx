"use client";

// Configurador de SmartNFC Personas (P2) sobre el motor de preguntas (F0): una pregunta por pantalla,
// Atrás/Adelante sincronizados con el navegador y vista previa del perfil y la tarjeta con datos ficticios.
import { useMemo } from "react";
import FlowShell from "../flow/FlowShell";
import { PERSONAS_FLOW } from "../../content/flows/personas";
import { readPersonasAnswers } from "../../lib/personas/answers";
import type { Answers } from "../../lib/flow/types";
import PersonasPreview from "./PersonasPreview";
import PersonasResult, { type PersonasOfferSlot } from "./PersonasResult";

function Preview({ answers }: { answers: Answers }) {
  const model = useMemo(() => readPersonasAnswers(answers), [answers]);
  return <PersonasPreview model={model} />;
}

export default function PersonasFlow({ exitHref, renderOffer }: { exitHref: string; renderOffer?: PersonasOfferSlot }) {
  return (
    <FlowShell
      flow={PERSONAS_FLOW}
      label="Arma tu SmartNFC"
      exitHref={exitHref}
      exitLabel="Ver información sin responder"
      renderPreview={answers => <Preview answers={answers} />}
      renderResult={(answers, flow) => (
        <PersonasResult model={readPersonasAnswers(answers)} onChangeAnswers={flow.goBack} onRestart={flow.restart} renderOffer={renderOffer} />
      )}
    />
  );
}
