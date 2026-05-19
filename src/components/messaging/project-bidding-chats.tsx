"use client";

import { useState } from "react";
import { ProjectChat } from "@/components/messaging/project-chat";
import type { ConversationWithMessages } from "@/lib/messages-server";

export function ProjectBiddingChats({
  conversations,
  currentUserId,
  customerId,
  projectId,
}: {
  conversations: ConversationWithMessages[];
  currentUserId: string;
  customerId: string;
  projectId: string;
}) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");

  const selected =
    conversations.find((c) => c.id === selectedId) ?? conversations[0];

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Kysymykset urakoitsijoilta</h2>
      <p className="mt-1 text-sm text-stone-500">
        Voit keskustella urakoitsijoiden kanssa ennen tarjouksen valintaa.
        Älä jaa sähköpostia, puhelinnumeroa tai verkkosivuja — ne ovat
        mahdollisia vasta kun olet hyväksynyt tarjouksen.
      </p>

      {conversations.length === 0 ? (
        <p className="mt-4 rounded-lg bg-stone-100 p-4 text-sm text-stone-600">
          Ei vielä viestejä. Urakoitsijat voivat lähettää tarkentavia kysymyksiä
          täällä ennen tarjoustaan.
        </p>
      ) : (
        <>
          {conversations.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    selected?.id === c.id
                      ? "bg-sky-600 text-white"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  {c.contractor_name}
                  {c.messages.length > 0 && (
                    <span className="ml-1 opacity-80">
                      ({c.messages.length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <ProjectChat
              conversationId={selected.id}
              messages={selected.messages}
              currentUserId={currentUserId}
              customerId={customerId}
              customerLabel="Sinä"
              contractorLabel={selected.contractor_name}
              revalidatePaths={[`/remontti/${projectId}`]}
              perspective="customer"
              contactRestricted
            />
          )}
        </>
      )}
    </section>
  );
}
