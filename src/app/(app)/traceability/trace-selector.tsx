"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { NativeSelect, Field } from "@/components/ui/input";

interface Props {
  credits: { serial: string; label: string }[];
  feedstock: { id: string; label: string }[];
}

export function TraceSelector({ credits, feedstock }: Props) {
  const router = useRouter();

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field
        label="Trace a carbon credit"
        hint="Follow a credit back to the feedstock it came from"
      >
        <div className="flex items-center gap-2">
          
          <NativeSelect
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                router.push(`/traceability?credit=${encodeURIComponent(e.target.value)}`);
            }}
          >
            <option value="" disabled>
              {credits.length === 0 ? "No credits issued yet" : "Select a credit…"}
            </option>
            {credits.map((c) => (
              <option key={c.serial} value={c.serial}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Field>

      <Field
        label="Trace a feedstock delivery"
        hint="Follow a delivery forward to the credits it produced"
      >
        <div className="flex items-center gap-2">
          
          <NativeSelect
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                router.push(`/traceability?feedstock=${encodeURIComponent(e.target.value)}`);
            }}
          >
            <option value="" disabled>
              {feedstock.length === 0 ? "No deliveries recorded yet" : "Select a delivery…"}
            </option>
            {feedstock.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Field>
    </div>
  );
}
