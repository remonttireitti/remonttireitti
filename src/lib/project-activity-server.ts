import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ProjectActivityEvent,
  sortActivityEvents,
} from "@/lib/project-activity";

type ProjectRow = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  email_verified_at: string | null;
  completed_at: string | null;
  auto_closed_at: string | null;
  inactivity_warning_sent_at: string | null;
  contact_revealed_at: string | null;
  content_revision: number;
  guest_email: string | null;
};

type BidRow = {
  id: string;
  contractor_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  rejected_at: string | null;
  counter_offered_at: string | null;
  counter_status: string | null;
};

type CompletionRow = {
  id: string;
  contractor_id: string;
  created_at: string;
  resolved_at: string | null;
};

type InvoiceRow = {
  contractor_id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
};

async function contractorNames(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data: profiles } = await admin
    .from("contractor_profiles")
    .select("id, company_name")
    .in("id", unique);

  const map = new Map<string, string>();
  for (const row of profiles ?? []) {
    if (row.company_name) map.set(row.id, row.company_name);
  }
  return map;
}

function companyLabel(map: Map<string, string>, contractorId: string): string {
  return map.get(contractorId) ?? "Urakoitsija";
}

function pushEvent(
  events: ProjectActivityEvent[],
  event: Omit<ProjectActivityEvent, "id"> & { id?: string },
) {
  events.push({
    id: event.id ?? `${event.at}-${event.label}`,
    at: event.at,
    label: event.label,
    detail: event.detail,
    kind: event.kind,
  });
}

function buildProjectEvents(
  project: ProjectRow,
  events: ProjectActivityEvent[],
  options: { forContractorId?: string },
) {
  const forContractor = options.forContractorId;

  pushEvent(events, {
    at: project.created_at,
    label: project.guest_email ? "Pyyntö tallennettu" : "Pyyntö luotu",
    detail: project.guest_email
      ? "Vahvistussähköposti lähetetty — julkaisu odottaa vahvistusta."
      : project.published_at
        ? undefined
        : "Luonnos — ei vielä näy urakoitsijoille.",
    kind: "customer",
  });

  if (project.email_verified_at) {
    pushEvent(events, {
      at: project.email_verified_at,
      label: "Sähköposti vahvistettu",
      kind: "customer",
    });
  }

  if (project.published_at) {
    pushEvent(events, {
      at: project.published_at,
      label: "Pyyntö lähetetty urakoitsijoille",
      detail: "Julkaistu — urakoitsijat voivat jättää tarjouksia.",
      kind: "customer",
    });
  }

  if (
    project.content_revision > 1 &&
    project.updated_at &&
    (!forContractor || project.published_at)
  ) {
    pushEvent(events, {
      at: project.updated_at,
      label: forContractor ? "Asiakas päivitti pyyntöä" : "Pyyntöä muokattu",
      detail: forContractor
        ? "Tarkista tiedot ennen tarjouksen päivittämistä."
        : undefined,
      kind: forContractor ? "customer" : "customer",
    });
  }

  if (project.inactivity_warning_sent_at) {
    pushEvent(events, {
      at: project.inactivity_warning_sent_at,
      label: "Muistutus: pyyntö sulkeutuu pian",
      kind: "system",
    });
  }

  if (project.auto_closed_at) {
    pushEvent(events, {
      at: project.auto_closed_at,
      label: "Pyyntö suljettiin automaattisesti",
      kind: "system",
    });
  } else if (project.status === "cancelled" && project.updated_at) {
    pushEvent(events, {
      at: project.updated_at,
      label: forContractor ? "Asiakas perui pyynnön" : "Pyyntö peruttu",
      kind: forContractor ? "customer" : "customer",
    });
  }

  if (project.contact_revealed_at) {
    pushEvent(events, {
      at: project.contact_revealed_at,
      label: forContractor
        ? "Yhteystiedot avautuivat"
        : "Urakoitsija sai yhteystiedot",
      kind: forContractor ? "system" : "system",
    });
  }

  if (project.completed_at) {
    pushEvent(events, {
      at: project.completed_at,
      label: "Urakka merkitty valmiiksi",
      kind: forContractor ? "customer" : "customer",
    });
  }
}

function buildBidEvents(
  bids: BidRow[],
  companyMap: Map<string, string>,
  events: ProjectActivityEvent[],
  options: { forContractorId?: string; customerView: boolean },
) {
  for (const bid of bids) {
    const company = companyLabel(companyMap, bid.contractor_id);
    const isOwn = options.forContractorId === bid.contractor_id;
    if (options.forContractorId && !isOwn) continue;

    if (bid.submitted_at) {
      pushEvent(events, {
        id: `bid-submit-${bid.id}`,
        at: bid.submitted_at,
        label: options.customerView ? `Tarjous saapui: ${company}` : "Lähetit tarjouksen",
        kind: options.customerView ? "contractor" : "contractor",
      });
    }

    if (
      bid.updated_at &&
      bid.submitted_at &&
      bid.updated_at > bid.submitted_at &&
      new Date(bid.updated_at).getTime() - new Date(bid.submitted_at).getTime() > 60_000
    ) {
      pushEvent(events, {
        id: `bid-update-${bid.id}-${bid.updated_at}`,
        at: bid.updated_at,
        label: options.customerView
          ? `${company} päivitti tarjousta`
          : "Päivitit tarjousta",
        kind: "contractor",
      });
    }

    if (bid.counter_offered_at) {
      pushEvent(events, {
        id: `bid-counter-${bid.id}`,
        at: bid.counter_offered_at,
        label: options.customerView
          ? `Lähetit vastatarjouksen: ${company}`
          : "Asiakas ehdotti hintaa (vastatarjous)",
        kind: options.customerView ? "customer" : "customer",
      });
    }

    if (bid.rejected_at && bid.status === "rejected") {
      pushEvent(events, {
        id: `bid-reject-${bid.id}`,
        at: bid.rejected_at,
        label: options.customerView
          ? `Hylkäsit tarjouksen: ${company}`
          : "Tarjouksesi hylättiin",
        kind: options.customerView ? "customer" : "system",
      });
    }

    if (bid.status === "withdrawn" && bid.updated_at) {
      pushEvent(events, {
        id: `bid-withdraw-${bid.id}`,
        at: bid.updated_at,
        label: options.customerView ? `${company} perui tarjouksen` : "Peruit tarjouksen",
        kind: "contractor",
      });
    }
  }
}

function buildCompletionEvents(
  rows: CompletionRow[],
  companyMap: Map<string, string>,
  events: ProjectActivityEvent[],
  options: { forContractorId?: string; customerView: boolean },
) {
  for (const row of rows) {
    const company = companyLabel(companyMap, row.contractor_id);
    const isOwn = options.forContractorId === row.contractor_id;
    if (options.forContractorId && !isOwn) continue;

    pushEvent(events, {
      id: `completion-req-${row.id}`,
      at: row.created_at,
      label: options.customerView
        ? `${company} pyysi täydennystä`
        : "Pyysit täydennystä",
      kind: "contractor",
    });

    if (row.resolved_at) {
      pushEvent(events, {
        id: `completion-done-${row.id}`,
        at: row.resolved_at,
        label: options.customerView
          ? "Täydensit pyyntöä"
          : "Asiakas täydensi pyyntöä",
        kind: "customer",
      });
    }
  }
}

function buildInvoiceEvents(
  invoices: InvoiceRow[],
  companyMap: Map<string, string>,
  events: ProjectActivityEvent[],
  options: { forContractorId?: string; customerView: boolean },
) {
  for (const inv of invoices) {
    const isOwn = options.forContractorId === inv.contractor_id;
    if (options.forContractorId && !isOwn) continue;

    const company = companyLabel(companyMap, inv.contractor_id);

    pushEvent(events, {
      id: `invoice-${inv.contractor_id}-${inv.created_at}`,
      at: inv.created_at,
      label: options.customerView
        ? `Valitsit tarjouksen: ${company}`
        : "Asiakas hyväksyi tarjouksesi",
      detail: options.customerView
        ? "Odottaa urakoitsijan välitysmaksua."
        : undefined,
      kind: options.customerView ? "customer" : "customer",
    });

    if (inv.paid_at) {
      pushEvent(events, {
        id: `invoice-paid-${inv.contractor_id}`,
        at: inv.paid_at,
        label: options.customerView
          ? `${company} maksoi välitysmaksun`
          : "Välitysmaksu maksettu",
        detail: "Yhteystiedot ovat nyt näkyvissä.",
        kind: "system",
      });
    }
  }
}

async function loadActivityData(projectId: string) {
  const admin = createAdminClient();

  const [projectRes, bidsRes, completionRes, invoiceRes] = await Promise.all([
    admin
      .from("projects")
      .select(
        "id, status, created_at, updated_at, published_at, email_verified_at, completed_at, auto_closed_at, inactivity_warning_sent_at, contact_revealed_at, content_revision, guest_email",
      )
      .eq("id", projectId)
      .maybeSingle(),
    admin
      .from("bids")
      .select(
        "id, contractor_id, status, created_at, updated_at, submitted_at, rejected_at, counter_offered_at, counter_status",
      )
      .eq("project_id", projectId),
    admin
      .from("project_completion_requests")
      .select("id, contractor_id, created_at, resolved_at")
      .eq("project_id", projectId),
    admin
      .from("platform_invoices")
      .select("contractor_id, created_at, paid_at, status")
      .eq("project_id", projectId),
  ]);

  if (!projectRes.data) return null;

  const contractorIds = [
    ...(bidsRes.data ?? []).map((b) => b.contractor_id),
    ...(completionRes.data ?? []).map((c) => c.contractor_id),
    ...(invoiceRes.data ?? []).map((i) => i.contractor_id),
  ];

  const companyMap = await contractorNames(admin, contractorIds);

  return {
    project: projectRes.data as ProjectRow,
    bids: (bidsRes.data ?? []) as BidRow[],
    completions: (completionRes.data ?? []) as CompletionRow[],
    invoices: (invoiceRes.data ?? []) as InvoiceRow[],
    companyMap,
  };
}

export async function fetchCustomerProjectActivity(
  projectId: string,
): Promise<ProjectActivityEvent[]> {
  const data = await loadActivityData(projectId);
  if (!data) return [];

  const events: ProjectActivityEvent[] = [];
  buildProjectEvents(data.project, events, {});
  buildCompletionEvents(data.completions, data.companyMap, events, {
    customerView: true,
  });
  buildBidEvents(data.bids, data.companyMap, events, { customerView: true });
  buildInvoiceEvents(data.invoices, data.companyMap, events, {
    customerView: true,
  });

  return sortActivityEvents(events);
}

export async function fetchContractorProjectActivity(
  projectId: string,
  contractorId: string,
): Promise<ProjectActivityEvent[]> {
  const data = await loadActivityData(projectId);
  if (!data) return [];

  const events: ProjectActivityEvent[] = [];
  buildProjectEvents(data.project, events, { forContractorId: contractorId });
  buildCompletionEvents(data.completions, data.companyMap, events, {
    forContractorId: contractorId,
    customerView: false,
  });
  buildBidEvents(data.bids, data.companyMap, events, {
    forContractorId: contractorId,
    customerView: false,
  });
  buildInvoiceEvents(data.invoices, data.companyMap, events, {
    forContractorId: contractorId,
    customerView: false,
  });

  return sortActivityEvents(events);
}
