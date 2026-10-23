// Inserta datos estructurados JSON-LD con escape de «<» para evitar cierres de etiqueta.
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
