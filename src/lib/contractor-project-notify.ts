import { installSlugForDevice, type DeviceCategory } from "@/constants/maintenance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications-server";
import { sendEmail, siteUrl } from "@/lib/email";
import { getNotificationPrefs } from "@/lib/notification-prefs";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function contractorEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Ilmoita urakoitsijoille, joilla on valittu sama lämpöpumppu / työlaji. */
export async function notifyContractorsNewPublishedProject(params: {
  projectId: string;
  projectTitle: string;
  jobTypeId: string;
  municipality: string;
  postalCode: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: jobType } = await admin
    .from("job_types")
    .select("name_fi")
    .eq("id", params.jobTypeId)
    .maybeSingle();

  const pumpLabel = jobType?.name_fi ?? "Lämpöpumppu";

  const { data: matches } = await admin
    .from("contractor_job_types")
    .select("contractor_id")
    .eq("job_type_id", params.jobTypeId);

  const contractorIds = [
    ...new Set((matches ?? []).map((r) => r.contractor_id as string)),
  ];

  if (contractorIds.length === 0) return;

  const { data: contractors } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", contractorIds)
    .eq("role", "contractor");

  const title = "Uusi tarjouspyyntö";
  const location = `${params.municipality} ${params.postalCode}`.trim();
  const body = `${pumpLabel} · ${location} — ${params.projectTitle}`;
  const linkPath = `/tarjoukset/${params.projectId}`;

  await Promise.all(
    (contractors ?? []).map(async (c) => {
      const prefs = await getNotificationPrefs(c.id);
      if (!prefs.notifyNewProjects) return;

      if (prefs.notifyInApp) {
        await createNotification({
          userId: c.id,
          type: "new_project_published",
          title,
          body,
          linkPath,
        });
      }

      if (prefs.notifyEmail) {
        const to = await contractorEmail(c.id);
        if (!to) return;
        await sendEmail({
          to,
          subject: `${title}: ${params.projectTitle}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
            <h1 style="font-size:18px">${escapeHtml(title)}</h1>
            <p>Uusi tarjouspyyntö sopii valitsemillesi lämpöpumpuille (<strong>${escapeHtml(pumpLabel)}</strong>).</p>
            <ul style="line-height:1.6">
              <li><strong>${escapeHtml(params.projectTitle)}</strong></li>
              <li>${escapeHtml(location)}</li>
            </ul>
            <p style="margin-top:24px"><a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Avaa pyyntö</a></p>
          </div>`,
        });
      }
    }),
  );
}

/** Huolto/korjaus: ilmoita urakoitsijoille, joilla on valittu sama laitetyyppi. */
export async function notifyContractorsNewMaintenanceProject(params: {
  projectId: string;
  projectTitle: string;
  jobTypeId: string;
  deviceCategory: DeviceCategory;
  municipality: string;
  postalCode: string;
}): Promise<void> {
  const admin = createAdminClient();

  const installSlug = installSlugForDevice(params.deviceCategory);

  const { data: maintenanceJob } = await admin
    .from("job_types")
    .select("name_fi")
    .eq("id", params.jobTypeId)
    .maybeSingle();

  let contractorIds: string[] = [];

  if (installSlug) {
    const { data: installType } = await admin
      .from("job_types")
      .select("id")
      .eq("slug", installSlug)
      .maybeSingle();

    if (installType?.id) {
      const { data: matches } = await admin
        .from("contractor_job_types")
        .select("contractor_id")
        .eq("job_type_id", installType.id);

      contractorIds = [
        ...new Set((matches ?? []).map((r) => r.contractor_id as string)),
      ];
    }
  } else {
    const { data: matches } = await admin
      .from("contractor_job_types")
      .select("contractor_id")
      .eq("job_type_id", params.jobTypeId);

    contractorIds = [
      ...new Set((matches ?? []).map((r) => r.contractor_id as string)),
    ];
  }

  if (contractorIds.length === 0) return;

  const { data: contractors } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", contractorIds)
    .eq("role", "contractor");

  const title = "Uusi huolto- tai korjauspyyntö";
  const location = `${params.municipality} ${params.postalCode}`.trim();
  const kindLabel = maintenanceJob?.name_fi ?? "Huolto/korjaus";
  const body = `${kindLabel} · ${location} — ${params.projectTitle}`;
  const linkPath = `/tarjoukset/${params.projectId}`;

  await Promise.all(
    (contractors ?? []).map(async (c) => {
      const prefs = await getNotificationPrefs(c.id);
      if (!prefs.notifyNewProjects) return;

      if (prefs.notifyInApp) {
        await createNotification({
          userId: c.id,
          type: "new_project_published",
          title,
          body,
          linkPath,
        });
      }

      if (prefs.notifyEmail) {
        const to = await contractorEmail(c.id);
        if (!to) return;
        await sendEmail({
          to,
          subject: `${title}: ${params.projectTitle}`,
          html: `<motionlessdiv style="font-family:system-ui,sans-serif;max-width:560px">
            <h1 style="font-size:18px">${escapeHtml(title)}</h1>
            <p>Uusi huolto- tai korjauspyyntö (${escapeHtml(kindLabel)}) sopii valitsemillesi lämpöpumpputyypeille.</p>
            <ul style="line-height:1.6">
              <li><strong>${escapeHtml(params.projectTitle)}</strong></li>
              <li>${escapeHtml(location)}</li>
            </ul>
            <p style="margin-top:24px"><a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Avaa pyyntö</a></p>
          </motionlessdiv>`.replace(/motionlessdiv/g, "div"),
        });
      }
    }),
  );
}

/** Admin: muistuta valittuja urakoitsijoita tarjouksen jättämisestä. */
export async function notifyContractorsBidReminder(params: {
  projectId: string;
  projectTitle: string;
  municipality: string;
  postalCode: string;
  contractorIds: string[];
}): Promise<{ sent: number; skipped: number }> {
  if (params.contractorIds.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const location = `${params.municipality} ${params.postalCode}`.trim();
  const title = "Muistutus: asiakas odottaa tarjousta";
  const body = `${location} — ${params.projectTitle}`;
  const linkPath = `/tarjoukset/${params.projectId}`;

  let sent = 0;
  let skipped = 0;

  await Promise.all(
    params.contractorIds.map(async (contractorId) => {
      const prefs = await getNotificationPrefs(contractorId);

      let delivered = false;

      if (prefs.notifyInApp) {
        await createNotification({
          userId: contractorId,
          type: "bid_request_reminder",
          title,
          body,
          linkPath,
        });
        delivered = true;
      }

      if (prefs.notifyEmail) {
        const to = await contractorEmail(contractorId);
        if (to) {
          await sendEmail({
            to,
            subject: `${title}: ${params.projectTitle}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
              <h1 style="font-size:18px">${escapeHtml(title)}</h1>
              <p>Asiakas odottaa yhä tarjouksia tähän pyyntöön. Jos voit tarjota, avaa pyyntö ja jätä tarjous pian.</p>
              <ul style="line-height:1.6">
                <li><strong>${escapeHtml(params.projectTitle)}</strong></li>
                <li>${escapeHtml(location)}</li>
              </ul>
              <p style="margin-top:24px"><a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Avaa tarjouspyyntö</a></p>
            </div>`,
          });
          delivered = true;
        }
      }

      if (delivered) sent += 1;
      else skipped += 1;
    }),
  );

  return { sent, skipped };
}
