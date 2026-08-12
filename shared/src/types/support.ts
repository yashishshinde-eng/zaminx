/**
 * Support ticket module — user-raised issues with an admin-response thread.
 *
 * Lifecycle: `open ⇄ answered → closed`.
 *   - user replies on `answered`/`closed` → reopens to `open`
 *   - admin replies → `answered`
 *   - admin (or user) closes → `closed` (user can reopen by replying)
 * The conversation is an embedded `replies` array; `replies[0]` is the
 * user's opening message. These types back both the user and admin APIs.
 */

export type TicketStatus = "open" | "answered" | "closed";

export type TicketCategory =
  | "account"
  | "payments"
  | "withdrawals"
  | "package"
  | "technical"
  | "other";

export type ReplySender = "user" | "admin";

/** A single message in the ticket conversation thread. */
export interface ReplyRow {
  id: string;
  sender: ReplySender;
  message: string;
  createdAt: string;
}

/** A support ticket, as returned over the API (user view excludes other users). */
export interface TicketRow {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  replies: ReplyRow[];
  /** Admin who last responded, if any. */
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin view of a ticket — includes the owning user's id/name/email. */
export interface AdminTicketRow extends TicketRow {
  user: { id: string; name: string; email: string };
}

/** A paginated page of tickets. */
export interface TicketPage {
  items: TicketRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A paginated page of admin tickets. */
export interface AdminTicketPage {
  items: AdminTicketRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}