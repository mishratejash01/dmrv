import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getAppContext } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader, DataRow } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { METHODOLOGY, BATCH_LIMITS, HC_ORG, BUFFER_POOL, RULE_CATALOGUE } from "@/lib/methodology";
import { fmt } from "@/lib/utils";
import { SettingsForms } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile, project configuration, and review the methodology rules that govern this project."
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <SettingsForms
            profile={ctx.profile}
            project={project}
            canManageProject={ctx.can.canManageProject}
          />
        </div>

        {/* Methodology reference (read-only) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <BookOpen className="h-4 w-4 text-clay" />
              <div>
                <CardTitle>Methodology</CardTitle>
                <CardDescription>{METHODOLOGY.name}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Standard">{METHODOLOGY.standard}</DataRow>
                <DataRow label="Reference">
                  <span className="tnum">{METHODOLOGY.id}</span>
                </DataRow>
                <DataRow label="Version">
                  <span className="tnum">{METHODOLOGY.version}</span>
                </DataRow>
                <DataRow label="Parent">{METHODOLOGY.parent}</DataRow>
                <DataRow label="LCA standard">{METHODOLOGY.lcaStandard}</DataRow>
                <DataRow label="Functional unit">{METHODOLOGY.functionalUnit}</DataRow>
                <DataRow label="Batch limit">
                  <span className="tnum">
                    {BATCH_LIMITS.maxMonths} mo / {BATCH_LIMITS.maxTonnes} t
                  </span>
                </DataRow>
                <DataRow label="H/C_org eligibility">
                  <span className="tnum">&lt; {HC_ORG.maxEligible}</span>
                </DataRow>
                <DataRow label="Buffer pool floor">
                  <span className="tnum">{fmt(BUFFER_POOL.minFraction * 100, 0)}%</span>
                </DataRow>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key rules</CardTitle>
              <CardDescription>The rules that keep every carbon claim credible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {RULE_CATALOGUE.map((rule) => (
                <div key={rule.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-ink">{rule.title}</p>
                  <p className="mt-1 text-sm text-muted text-pretty">{rule.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {!ctx.can.canManageProject && (
        <div className="mt-6">
          <SectionHeader title="Project configuration" />
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted">
                Project settings are managed by project developers.{" "}
                <Badge tone="neutral">{project.code}</Badge> is currently{" "}
                <span className="text-ink">{project.status}</span>.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
