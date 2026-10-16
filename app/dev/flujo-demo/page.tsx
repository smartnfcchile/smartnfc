import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DemoFlow from "../../../components/flow/demo/DemoFlow";

// Página interna para revisar el motor de preguntas (F0). En producción no existe (404) salvo que se habilite
// explícitamente con FLOW_DEMO_ENABLED=1. Nunca se indexa.
export const metadata: Metadata = { title: "Demo motor de preguntas", robots: { index: false, follow: false } };

export default function FlujoDemoPage() {
  if (process.env.NODE_ENV === "production" && process.env.FLOW_DEMO_ENABLED !== "1") notFound();
  return (
    <main className="fl-page">
      <DemoFlow />
    </main>
  );
}
