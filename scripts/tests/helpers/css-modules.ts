// Pruebas que renderizan componentes con CSS Modules en Node: cada `import styles from "./x.module.css"`
// devuelve un objeto cuyas claves son el propio nombre de la clase. Importar este módulo antes que los componentes.
import Module from "node:module";

type Loader = (module: { exports: unknown }, filename: string) => void;
const extensions = (Module as unknown as { _extensions: Record<string, Loader> })._extensions;
extensions[".css"] = module => {
  module.exports = new Proxy({}, { get: (_target, key) => (key === "__esModule" ? false : String(key)) });
};
