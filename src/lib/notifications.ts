export type NotificationType =
  | "new_message"
  | "new_bid"
  | "counter_offer"
  | "counter_offer_accepted"
  | "counter_offer_declined"
  | "bid_rejected"
  | "bid_accepted"
  | "project_updated"
  | "billing_pending"
  | "new_user_registered"
  | "new_project_published";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link_path: string;
  read_at: string | null;
  created_at: string;
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  new_message: "Viesti",
  new_bid: "Tarjous",
  counter_offer: "Vastatarjous",
  counter_offer_accepted: "Vastatarjous",
  counter_offer_declined: "Vastatarjous",
  bid_rejected: "Tarjous hylätty",
  bid_accepted: "Tarjous hyväksytty",
  project_updated: "Pyyntö päivitetty",
  billing_pending: "Laskutus",
  new_user_registered: "Uusi käyttäjä",
  new_project_published: "Tarjouspyyntö",
};
