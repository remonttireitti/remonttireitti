export type NotificationType =
  | "new_message"
  | "new_bid"
  | "counter_offer"
  | "counter_offer_accepted"
  | "counter_offer_declined"
  | "bid_rejected"
  | "bid_accepted"
  | "order_finalizing"
  | "bid_accept_lapsed"
  | "project_updated"
  | "billing_pending"
  | "marketplace_billing_rejected"
  | "new_user_registered"
  | "new_project_published"
  | "bid_request_reminder"
  | "review_reminder";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link_path: string;
  read_at: string | null;
  created_at: string;
  archived_at?: string | null;
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  new_message: "Viesti",
  new_bid: "Tarjous",
  counter_offer: "Vastatarjous",
  counter_offer_accepted: "Vastatarjous",
  counter_offer_declined: "Vastatarjous",
  bid_rejected: "Tarjous hylätty",
  bid_accepted: "Tarjous hyväksytty",
  order_finalizing: "Tilaus viimeistellään",
  bid_accept_lapsed: "Diili rauennut",
  project_updated: "Pyyntö päivitetty",
  billing_pending: "Laskutus",
  marketplace_billing_rejected: "Tori hylätty",
  new_user_registered: "Uusi käyttäjä",
  new_project_published: "Tarjouspyyntö",
  bid_request_reminder: "Muistutus",
  review_reminder: "Arvostelu",
};
