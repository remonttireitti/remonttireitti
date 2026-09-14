import {
  sendGuestBidUpdatedEmail,
  sendGuestBidWithdrawnEmail,
  sendGuestNewBidEmail,
} from "@/lib/guest-project-email";
import { isGuestProject, rotateGuestProjectAccessToken } from "@/lib/project-guest-access";
import {
  userNotifyBidUpdated,
  userNotifyBidWithdrawn,
  userNotifyNewBid,
} from "@/lib/user-notify";

export type BidCustomerNotifyParams = {
  customerId: string | null;
  guestEmail: string | null;
  contactEmail: string | null;
  projectId: string;
  projectTitle: string;
  contractorCompany: string;
  kind: "new" | "updated";
  /** Tarjous oli vanhentunut (asiakas täydensi pyyntöä) ennen päivitystä. */
  afterCompletion?: boolean;
};

export type BidCustomerWithdrawParams = {
  customerId: string | null;
  guestEmail: string | null;
  contactEmail: string | null;
  projectId: string;
  projectTitle: string;
  contractorCompany: string;
};

export async function notifyCustomerAboutBid(
  params: BidCustomerNotifyParams,
): Promise<void> {
  const guest = isGuestProject({
    customer_id: params.customerId,
    guest_email: params.guestEmail,
  });

  if (guest && params.guestEmail) {
    try {
      const rawToken = await rotateGuestProjectAccessToken(params.projectId);
      if (params.kind === "updated") {
        await sendGuestBidUpdatedEmail({
          to: params.guestEmail,
          projectTitle: params.projectTitle,
          projectId: params.projectId,
          rawToken,
          contractorCompany: params.contractorCompany,
          afterCompletion: params.afterCompletion,
        });
      } else {
        await sendGuestNewBidEmail({
          to: params.guestEmail,
          projectTitle: params.projectTitle,
          projectId: params.projectId,
          rawToken,
          contractorCompany: params.contractorCompany,
        });
      }
    } catch (err) {
      console.warn("[notifyCustomerAboutBid] guest email failed:", err);
    }
    return;
  }

  if (!params.customerId) {
    console.warn(
      "[notifyCustomerAboutBid] no customer_id for project",
      params.projectId,
    );
    return;
  }

  const payload = {
    customerId: params.customerId,
    projectId: params.projectId,
    projectTitle: params.projectTitle,
    contractorCompany: params.contractorCompany,
    contactEmail: params.contactEmail,
    afterCompletion: params.afterCompletion,
  };

  if (params.kind === "updated") {
    await userNotifyBidUpdated(payload);
  } else {
    await userNotifyNewBid(payload);
  }
}

export async function notifyCustomerAboutBidWithdrawn(
  params: BidCustomerWithdrawParams,
): Promise<void> {
  const guest = isGuestProject({
    customer_id: params.customerId,
    guest_email: params.guestEmail,
  });

  if (guest && params.guestEmail) {
    try {
      const rawToken = await rotateGuestProjectAccessToken(params.projectId);
      await sendGuestBidWithdrawnEmail({
        to: params.guestEmail,
        projectTitle: params.projectTitle,
        projectId: params.projectId,
        rawToken,
        contractorCompany: params.contractorCompany,
      });
    } catch (err) {
      console.warn("[notifyCustomerAboutBidWithdrawn] guest email failed:", err);
    }
    return;
  }

  if (!params.customerId) {
    console.warn(
      "[notifyCustomerAboutBidWithdrawn] no customer_id for project",
      params.projectId,
    );
    return;
  }

  await userNotifyBidWithdrawn({
    customerId: params.customerId,
    projectId: params.projectId,
    projectTitle: params.projectTitle,
    contractorCompany: params.contractorCompany,
    contactEmail: params.contactEmail,
  });
}
