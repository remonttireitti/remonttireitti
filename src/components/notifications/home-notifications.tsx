"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  archiveNotification,
  archiveReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import {
  notificationTypeLabels,
  type AppNotification,
} from "@/lib/notifications";
import { brand } from "@/lib/brand-theme";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationCard({
  n,
  pending,
  onOpen,
  muted,
  footer,
}: {
  n: AppNotification;
  pending: boolean;
  onOpen: (id: string, linkPath: string) => void;
  muted?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <li
      className={`overflow-hidden rounded-xl border transition hover:border-sky-300 ${
        muted
          ? "border-stone-200 bg-stone-50/80"
          : n.read_at
            ? "border-stone-200 bg-white"
            : "border-sky-200 bg-sky-50/60"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(n.id, n.link_path)}
        disabled={pending}
        className="block w-full p-4 text-left hover:bg-sky-50/40 disabled:opacity-60"
      >
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            muted ? "text-stone-500" : "text-sky-800"
          }`}
        >
          {notificationTypeLabels[n.type]}
        </p>
        <time
          dateTime={n.created_at}
          className="mt-0.5 block text-xs text-stone-500"
        >
          {formatWhen(n.created_at)}
        </time>
        <p className={`mt-2 font-medium ${muted ? "text-stone-700" : "text-stone-900"}`}>
          {n.title}
        </p>
        <p className="mt-0.5 text-sm text-stone-600">{n.body}</p>
      </button>
      {footer}
    </li>
  );
}

export function HomeNotifications({
  notifications,
  archivedNotifications,
  unreadCount,
}: {
  notifications: AppNotification[];
  archivedNotifications: AppNotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const readCount = notifications.filter((n) => n.read_at).length;

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

  function handleArchiveRead() {
    startTransition(async () => {
      await archiveReadNotifications();
      router.refresh();
    });
  }

  function handleArchiveOne(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    startTransition(async () => {
      await archiveNotification(id);
      router.refresh();
    });
  }

  return (
    <section id="ilmoitukset" className={`${brand.containerWide} py-10`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Ilmoitukset</h2>
          <p className="mt-1 text-sm text-stone-600">
            {unreadCount > 0
              ? `${unreadCount} lukematonta`
              : "Ei uusia ilmoituksia"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={pending}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 sm:py-1.5"
            >
              Merkitse kaikki luetuksi
            </button>
          )}
          {readCount > 0 && (
            <button
              type="button"
              onClick={handleArchiveRead}
              disabled={pending}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-60 sm:py-1.5"
            >
              Arkistoi luetut ({readCount})
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          Ei aktiivisia ilmoituksia. Kun saat viestejä tai tarjouksia, ne näkyvät
          tässä.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              n={n}
              pending={pending}
              onOpen={handleOpen}
              footer={
                n.read_at ? (
                  <div className="border-t border-stone-200 px-4 py-2">
                    <button
                      type="button"
                      title="Arkistoi"
                      aria-label="Arkistoi ilmoitus"
                      disabled={pending}
                      onClick={(e) => handleArchiveOne(e, n.id)}
                      className="text-sm font-medium text-stone-500 hover:text-stone-800 disabled:opacity-60"
                    >
                      Arkistoi
                    </button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </ul>
      )}

      {archivedNotifications.length > 0 && (
        <details className="group mt-6 rounded-xl border border-stone-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-stone-700 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              <span>
                Arkisto ({archivedNotifications.length})
              </span>
              <span
                className="text-xs font-normal text-stone-500 group-open:hidden"
                aria-hidden
              >
                Näytä
              </span>
              <span
                className="hidden text-xs font-normal text-stone-500 group-open:inline"
                aria-hidden
              >
                Piilota
              </span>
            </span>
          </summary>
          <ul className="space-y-2 border-t border-stone-100 px-2 pb-2 pt-2">
            {archivedNotifications.map((n) => (
              <NotificationCard
                key={n.id}
                n={n}
                pending={pending}
                onOpen={handleOpen}
                muted
                footer={
                  n.archived_at ? (
                    <p className="border-t border-stone-200 px-4 py-2 text-xs text-stone-500">
                      Arkistoitu {formatWhen(n.archived_at)}
                    </p>
                  ) : undefined
                }
              />
            ))}
          </ul>
        </details>
      )}

      {archivedNotifications.length === 0 && notifications.length > 0 && (
        <p className="mt-4 text-center text-sm text-stone-500">
          Arkistoidut ilmoitukset näkyvät tässä, kun arkistoit luetut.
        </p>
      )}
    </section>
  );
}
