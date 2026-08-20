"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea, NativeSelect } from "@/components/ui/input";
import { updateProfile, updateProject } from "@/lib/actions/settings";
import type { Profile, Project } from "@/lib/types/db";

interface Props {
  profile: Profile;
  project: Project;
  canManageProject: boolean;
}

export function SettingsForms({ profile, project, canManageProject }: Props) {
  return (
    <div className="space-y-4">
      <ProfileForm profile={profile} />
      {canManageProject && <ProjectForm project={project} />}
    </div>
  );
}

/* --------------------------------- Profile -------------------------------- */

function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name ?? "");
  const [phone, setPhone] = React.useState(profile.phone ?? "");
  const [organization, setOrganization] = React.useState(profile.organization ?? "");

  async function handleSave() {
    if (!fullName.trim()) return toast.error("Your name cannot be empty.");
    setBusy(true);
    const res = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      organization: organization.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>
          How you appear to the rest of the team. Your email ({profile.email}) is managed by sign-in
          and cannot be changed here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Asha Verma" />
          </Field>
          <Field label="Phone" hint="Used for field coordination">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </Field>
        </div>
        <Field label="Organization">
          <Input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Karwar Biochar Cooperative"
          />
        </Field>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Project -------------------------------- */

const DURABILITY_OPTIONS = [
  { value: "years_100", label: "100-year permanence (H/C_org regression)" },
  { value: "years_1000", label: "1000-year permanence (random reflectance)" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
] as const;

function ProjectForm({ project }: { project: Project }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState(project.name ?? "");
  const [region, setRegion] = React.useState(project.region ?? "");
  const [description, setDescription] = React.useState(project.description ?? "");
  const [soilTemp, setSoilTemp] = React.useState(String(project.soil_temp_c ?? ""));
  const [bufferPct, setBufferPct] = React.useState(String(project.buffer_pool_pct ?? ""));
  const [durability, setDurability] = React.useState<string>(project.durability_pathway ?? "years_100");
  const [status, setStatus] = React.useState<string>(project.status ?? "draft");

  async function handleSave() {
    if (!name.trim()) return toast.error("The project needs a name.");
    const soil = Number(soilTemp);
    const buffer = Number(bufferPct);
    if (Number.isNaN(soil)) return toast.error("Enter a valid soil temperature.");
    if (Number.isNaN(buffer) || buffer < 2) return toast.error("Buffer pool must be at least 2%.");
    setBusy(true);
    const res = await updateProject(project.id, {
      name: name.trim(),
      region: region.trim() || undefined,
      description: description.trim() || undefined,
      soil_temp_c: soil,
      buffer_pool_pct: buffer,
      durability_pathway: durability as "years_100" | "years_1000",
      status: status as "draft" | "active" | "closed",
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Project settings updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>
          Configuration for {project.code}. Permanence and buffer settings feed directly into GHG
          quantification and credit issuance — change them with care.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Project name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Region">
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Karnataka, India" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description of the project's scope and activities…"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Soil temperature (°C)" required hint="Selects the permanence coefficients">
            <Input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={soilTemp}
              onChange={(e) => setSoilTemp(e.target.value)}
            />
          </Field>
          <Field label="Buffer pool (%)" required hint="Minimum 2% of removal RCCs">
            <Input
              type="number"
              step="0.1"
              min="2"
              inputMode="decimal"
              value={bufferPct}
              onChange={(e) => setBufferPct(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Durability pathway" required>
            <NativeSelect value={durability} onChange={(e) => setDurability(e.target.value)}>
              {DURABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Project status" required>
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
