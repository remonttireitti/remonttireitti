export type UserRole = "customer" | "contractor" | "admin";
export type ProjectStatus =
  | "draft"
  | "published"
  | "receiving_bids"
  | "bid_accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type BidStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type ServiceCategory = {
  id: string;
  slug: string;
  name_fi: string;
  description_fi: string | null;
  icon: string | null;
  sort_order: number;
};
