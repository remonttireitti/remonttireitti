import {
  sendGuestBidUpdatedEmail,
  sendGuestNewBidEmail,
} from "@/lib/guest-project-email";
import { isGuestProject, rotateGuestProjectAccessToken } from "@/lib/project-guest-access";
import { userNotifyBidUpdated, userNotifyNewBid } from "@/lib/user-notify";

export type BidCustomerNotifyParams = {
  customerId: string | null;
  guestEmail: string | null;
  contactEmail: string | null;
  projectId: string;
  projectTitle: string;
  contractorCompany: string;
  kind: "new" | "updated";
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
  };

  if (params.kind === "updated") {
    await userNotifyBidUpdated(payload);
  } else {
    await userNotifyNewBid(payload);
  }
}
