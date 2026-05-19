"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import {
  notificationTypeLabels,
  type AppNotification,
} from "@/lib/notifications";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomeNotifications({
  notifications,
  unreadCount,
}: {
  notifications: AppNotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleOpen(id: string, linkPath: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      router.push(linkPath);
      router.refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <section id="ilmoitukset" className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Ilmoitukset</h2>
          <p className="mt-1 text-sm text-stone-600">
            {unreadCount > 0
              ? `${unreadCount} lukematonta`
              : "Ei uusia ilmoituksia"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={pending}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            Merkitse kaikki luetuksi
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          Kun saat viestejä, tarjouksia tai vastatarjouksia, ne näkyvät tässä.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleOpen(n.id, n.link_path)}
                disabled={pending}
                className={`w-full rounded-xl border p-4 text-left transition hover:border-sky-300 hover:bg-sky-50/40 disabled:opacity-60 ${
                  n.read_at
                    ? "border-stone-200 bg-white"
                    : "border-sky-200 bg-sky-50/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-sky-800">
                    {notificationTypeLabels[n.type]}
                  </span>
                  <time className="text-xs text-stone-500">
                    {formatWhen(n.created_at)}
                  </time>
                </div>
                <p className="mt-1 font-medium text-stone-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-stone-600">{n.body}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-center text-sm text-stone-500">
        <Link href="/oma-tili" className="text-sky-700 hover:underline">
          Oma tili
        </Link>
        {" · "}
        Kaikki pyyntösi ja tarjoukset
      </p>
    </section>
  );
}
