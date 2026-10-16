"use client";

// Selector de tamaño por ubicación: tres opciones nativas (radio) con medida y precio unitario desde F1.
import { useId } from "react";
import { formatCLP, getPublicOffer, priceOf } from "../../lib/commercial/public-offers";
import { SUPPORT_LABELS, type ProposalPoint, type SupportSize } from "../../lib/locales/proposal";
import SupportToken from "./SupportToken";
import styles from "./locales.module.css";

const SIZES: SupportSize[] = ["LOCAL_MINI", "LOCAL_STANDARD", "LOCAL_XL"];

export default function SupportPicker({ point, value, onChange }: { point: ProposalPoint; value: SupportSize | undefined; onChange: (size: SupportSize) => void }) {
  const id = useId();
  return (
    <fieldset className={styles.picker}>
      <legend className={styles.pickerLegend}>
        <b>{point.label}</b>
        <span>{point.quantity} {point.quantity === 1 ? "punto" : "puntos"}</span>
      </legend>
      <div className={styles.pickerOptions}>
        {SIZES.map(size => {
          const offer = getPublicOffer(size);
          const checked = value === size;
          return (
            <label key={size} htmlFor={`${id}-${size}`} className={`${styles.pickerOption}${checked ? ` ${styles.pickerChecked}` : ""}`}>
              <input id={`${id}-${size}`} type="radio" name={`${id}-size`} value={size} checked={checked} onChange={() => onChange(size)} />
              <span className={styles.pickerThumb}><SupportToken size={size} scale={1.6} /></span>
              <b>{SUPPORT_LABELS[size]}</b>
              <small>{offer.physical?.size}</small>
              <small>{formatCLP(priceOf(size, "one_time")!)} c/u</small>
              {point.suggestedSupport === size && <span className={styles.suggested}>Sugerido</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
