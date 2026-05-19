"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  sendProjectMessage,
  type MessageActionState,
} from "@/app/actions/messages";
import type { ChatMessage } from "@/lib/messages-server";

const inputClass =
  "flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectChat({
  conversationId,
  messages,
  currentUserId,
  customerId,
  customerLabel,
  contractorLabel,
  revalidatePaths,
  readOnly = false,
  perspective = "customer",
  contactRestricted = false,
}: {
  conversationId: string;
  messages: ChatMessage[];
  currentUserId: string;
  customerId: string;
  customerLabel: string;
  contractorLabel: string;
  revalidatePaths: string[];
  readOnly?: boolean;
  perspective?: "customer" | "contractor";
  /** Ennen tarjouksen hyväksyntää: ei sähköpostia, puhelinta tai verkkosivuja */
  contactRestricted?: boolean;
}) {
  const [state, action, pending] = useActionState<
    MessageActionState,
    FormData
  >(sendProjectMessage, {});

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, state.success]);

  function senderLabel(senderId: string) {
    if (senderId === currentUserId) return "Sinä";
    if (senderId === customerId) return customerLabel;
    return contractorLabel;
  }

  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Viestit</h2>
      <p className="mt-1 text-sm text-stone-500">
        {contactRestricted
          ? perspective === "contractor"
            ? "Kysy tarkennuksia asiakkaalta. Älä jaa sähköpostia, puhelinnumeroa tai verkkosivuja — ne ovat mahdollisia vasta kun asiakas on hyväksynyt tarjouksen."
            : `Keskustelu urakoitsijan ${contractorLabel} kanssa. Älä jaa sähköpostia, puhelinnumeroa tai verkkosivuja — ne ovat mahdollisia tarjouksen hyväksynnän jälkeen.`
          : perspective === "contractor"
            ? "Keskustelu asiakkaan kanssa. Asiakkaan sähköposti ja puhelin näkyvät sinulle vasta välitysmaksun jälkeen."
            : `Keskustelu urakoitsijan ${contractorLabel} kanssa. Urakoitsija näkee yhteystietosi vasta välitysmaksun jälkeen.`}
      </p>
      {contactRestricted && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Yhteystietojen (sähköposti, puhelin, verkkosivu) jakaminen viesteissä
          on estetty ennen tarjouksen hyväksyntää.
        </p>
      )}

      <div
        className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-stone-100 bg-stone-50 p-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-stone-500">
            Ei viestejä vielä. Kirjoita ensimmäinen viesti alle.
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? "bg-sky-600 text-white"
                      : "border border-stone-200 bg-white text-stone-800"
                  }`}
                >
                  <p
                    className={`text-xs font-medium ${
                      mine ? "text-sky-100" : "text-stone-500"
                    }`}
                  >
                    {senderLabel(msg.sender_id)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap">{msg.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-sky-200" : "text-stone-400"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      {!readOnly ? (
        <form action={action} className="mt-4 flex gap-2">
          <input type="hidden" name="conversation_id" value={conversationId} />
          <input
            type="hidden"
            name="revalidate_paths"
            value={revalidatePaths.join(",")}
          />
          <label className="sr-only" htmlFor="chat-body">
            Viesti
          </label>
          <input
            id="chat-body"
            name="body"
            type="text"
            required
            maxLength={4000}
            placeholder="Kirjoita viesti…"
            className={inputClass}
            disabled={pending}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {pending ? "…" : "Lähetä"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-stone-500">
          Viestintä on suljettu valmistuneessa urakassa.
        </p>
      )}
    </section>
  );
}
