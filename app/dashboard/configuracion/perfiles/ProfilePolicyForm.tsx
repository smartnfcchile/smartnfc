"use client";

import { useState, useTransition } from "react";
import {
  PROFILE_EDIT_POLICIES,
  type ProfileEditPolicy,
} from "../../../../lib/profile-edit-policy-shared";
import { updateProfileEditPolicyAction } from "./actions";

export default function ProfilePolicyForm({ initialPolicy }: { initialPolicy: ProfileEditPolicy }) {
  const [policy, setPolicy] = useState<ProfileEditPolicy>(initialPolicy);
  const [savedPolicy, setSavedPolicy] = useState<ProfileEditPolicy>(initialPolicy);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateProfileEditPolicyAction(policy);
        setSavedPolicy(policy);
        setMessage("Política de edición actualizada correctamente.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible guardar la configuración.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        {PROFILE_EDIT_POLICIES.map((option) => {
          const selected = policy === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPolicy(option.value)}
              className={`rounded-2xl border p-5 text-left transition ${selected ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-4 ${selected ? "border-blue-600" : "border-slate-300 dark:border-slate-600"}`} />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{option.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 text-xs leading-5 text-slate-600 dark:text-slate-400">
        Los administradores de la empresa conservan siempre la capacidad de configurar las tarjetas de su organización. Esta política define cuánto puede editar el titular de cada tarjeta.
      </div>

      {message && <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{message}</p>}

      <button
        type="button"
        onClick={save}
        disabled={isPending || policy === savedPolicy}
        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar política"}
      </button>
    </div>
  );
}
