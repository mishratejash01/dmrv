"use client";

import * as React from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";

/** Export an array of row objects to a downloaded CSV. */
export function ExportCsvButton({
  rows,
  filename,
  label = "Export CSV",
}: {
  rows: Record<string, unknown>[];
  filename: string;
  label?: string;
}) {
  function download() {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="secondary" size="sm" onClick={download} disabled={rows.length === 0}>
       {label}
    </Button>
  );
}

/** Print the current page (used to produce a PDF via the browser). */
export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print">
       {label}
    </Button>
  );
}
