"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Alert20Regular,
  CheckmarkStarburst20Regular,
  CheckboxChecked20Regular,
  Warning20Regular,
  ShieldCheckmark20Regular,
  Ribbon20Regular,
  LeafOne20Regular,
  Info20Regular,
  type FluentIcon,
} from "@/components/common/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, timeAgo } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types/db";

const TYPE_META: Record<string, { icon: FluentIcon; tone: string }> = {
  review_request: { icon: CheckboxChecked20Regular, tone: "text-ochre bg-ochre-tint" },
  batch_limit: { icon: Warning20Regular, tone: "text-err bg-err-tint" },
  verification_status: { icon: ShieldCheckmark20Regular, tone: "text-info bg-info-tint" },
  issuance: { icon: Ribbon20Regular, tone: "text-clay bg-clay-tint" },
  end_use: { icon: LeafOne20Regular, tone: "text-sage bg-sage-tint" },
  info: { icon: Info20Regular, tone: "text-ink-soft bg-surface-2" },
};

export function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const hasUnread = notifications.some((n) => !n.read);

  async function handleMarkAll() {
    setBusy(true);
    const res = await markAllNotificationsRead();
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("All notifications marked as read");
    router.refresh();
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      router.refresh();
    }
    if (n.link) router.push(n.link);
  }

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleMarkAll} disabled={busy}>
            <CheckmarkStarburst20Regular className="h-4 w-4" /> Mark all as read
          </Button>
        </div>
      )}

      <Card className="divide-y divide-border overflow-hidden p-0">
        {notifications.map((n) => {
          const meta = TYPE_META[n.type] ?? { icon: Alert20Regular, tone: "text-ink-soft bg-surface-2" };
          const Icon = meta.icon;
          const clickable = !n.read || Boolean(n.link);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              disabled={!clickable}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                clickable && "hover:bg-surface/70",
                !n.read && "bg-surface",
                !clickable && "cursor-default",
              )}
            >
              <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg", meta.tone)}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("truncate text-sm", n.read ? "text-ink-soft" : "font-medium text-ink")}>
                    {n.title}
                  </p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-clay" aria-label="Unread" />}
                </div>
                {n.body && <p className="mt-0.5 text-sm text-muted text-pretty">{n.body}</p>}
                <p className="mt-1 text-xs text-faint tnum">{timeAgo(n.created_at)}</p>
              </div>
            </button>
          );
        })}
      </Card>
    </div>
  );
}
