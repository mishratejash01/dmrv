import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Computer-vision biochar estimate — the connection point for a vision model.
 * When VISION_MODEL_URL is configured, the biochar photo is forwarded to it and
 * the returned mass/moisture is passed back to the field log. Until a model is
 * connected, this returns { available: false } so the client cleanly falls back
 * to the reverse-calculation. It never invents a measurement.
 *
 * The model is expected to answer JSON: { wet_kg: number, moisture_pct?: number }.
 */

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Only authenticated app users may call the estimator.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ available: false, error: "Not authenticated" }, { status: 401 });
  }

  const modelUrl = process.env.VISION_MODEL_URL;
  if (!modelUrl) {
    return NextResponse.json({
      available: false,
      message: "The computer-vision model isn't connected yet — using reverse-calculation.",
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ available: false, error: "Expected multipart form data" }, { status: 400 });
  }
  const photo = form.get("photo");
  if (!(photo instanceof Blob)) {
    return NextResponse.json({ available: false, error: "Missing photo" }, { status: 400 });
  }

  try {
    const upstream = new FormData();
    upstream.append("photo", photo, "biochar.jpg");
    const kilnId = form.get("kiln_id");
    if (typeof kilnId === "string") upstream.append("kiln_id", kilnId);

    const headers: Record<string, string> = {};
    if (process.env.VISION_MODEL_KEY) headers.Authorization = `Bearer ${process.env.VISION_MODEL_KEY}`;

    const res = await fetch(modelUrl, { method: "POST", body: upstream, headers });
    if (!res.ok) {
      return NextResponse.json({
        available: false,
        message: "The vision model could not process this photo — using reverse-calculation.",
      });
    }
    const out = (await res.json()) as { wet_kg?: number; moisture_pct?: number };
    if (out.wet_kg == null || Number.isNaN(Number(out.wet_kg))) {
      return NextResponse.json({
        available: false,
        message: "The vision model returned no estimate — using reverse-calculation.",
      });
    }
    return NextResponse.json({
      available: true,
      wet_kg: Number(out.wet_kg),
      moisture_pct: out.moisture_pct != null ? Number(out.moisture_pct) : undefined,
      source: "computer_vision",
    });
  } catch {
    return NextResponse.json({
      available: false,
      message: "Couldn't reach the vision model — using reverse-calculation.",
    });
  }
}
