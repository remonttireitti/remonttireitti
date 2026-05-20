"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  sendListingMessage,
  type ListingMessageState,
} from "@/app/actions/listing-messages";
import type { ListingChatMessage } from "@/lib/listing-messages-server";
import { formInputClass } from "@/lib/brand-theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ListingChat({
  listingId,
  inquiryId,
  messages,
  currentUserId,
  buyerId,
  sellerLabel,
  buyerLabel = "Ostaja",
  heading = "Viesti myyjälle",
  subtext = "Kysy lisätietoja ilmoituksesta. Myyjä saa sähköposti-ilmoituksen.",
}: {
  listingId: string;
  inquiryId: string | null;
  messages: ListingChatMessage[];
  currentUserId: string;
  buyerId: string;
  sellerLabel: string;
  buyerLabel?: string;
  heading?: string;
  subtext?: string;
}) {
  const [state, action, pending] = useActionState<
    ListingMessageState,
    FormData
  >(sendListingMessage, {});

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, state.success]);

  function senderLabel(senderId: string) {
    if (senderId === currentUserId) return "Sinä";
    if (senderId === buyerId) return buyerLabel;
    return sellerLabel;
  }

  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-stone-500">{subtext}</p>

      <div
        className="mt-4 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-stone-100 bg-stone-50 p-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-stone-500">
            Ei viestejä vielä. Kirjoita ensimmäinen viesti.
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

      <form action={action} className="mt-4 flex gap-2">
        <input type="hidden" name="listing_id" value={listingId} />
        {inquiryId && (
          <input type="hidden" name="inquiry_id" value={inquiryId} />
        )}
        <label className="sr-only" htmlFor={`listing-msg-${listingId}`}>
          Viesti
        </label>
        <input
          id={`listing-msg-${listingId}`}
          name="body"
          type="text"
          required
          maxLength={4000}
          placeholder="Kirjoita viesti…"
          className={`flex-1 ${formInputClass}`}
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {pending ? "…" : "Lähetä"}
        </button>
      </form>
    </section>
  );
}
