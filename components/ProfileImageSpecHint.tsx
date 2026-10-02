import {
  PROFILE_IMAGE_FORMATS_LABEL,
  PROFILE_IMAGE_MAX_SIZE_LABEL,
  PROFILE_IMAGE_SPECS,
  type ProfileImageKind,
} from "../lib/profile-image-specs";

export default function ProfileImageSpecHint({ kind }: { kind: ProfileImageKind }) {
  const spec = PROFILE_IMAGE_SPECS[kind];

  return (
    <div className="space-y-2 text-[10px] leading-relaxed text-slate-400">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold text-slate-300">Recomendado: </dt>
          <dd className="inline">
            {spec.variants
              .map((v) => `${v.label ? `${v.label} ` : ""}${v.width} × ${v.height} px`)
              .join(" · ")}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-300">Proporción: </dt>
          <dd className="inline">{spec.variants.map((v) => v.ratioLabel).join(" o ")}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-300">Formatos: </dt>
          <dd className="inline">{PROFILE_IMAGE_FORMATS_LABEL}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-300">Peso máximo: </dt>
          <dd className="inline">{PROFILE_IMAGE_MAX_SIZE_LABEL}</dd>
        </div>
      </dl>
      {spec.highlight ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-200">
          {spec.highlight}
        </p>
      ) : (
        <p>
          <span className="font-semibold text-slate-300">Zona segura: </span>
          {spec.safeZone}
        </p>
      )}
    </div>
  );
}
