import { z } from "zod";

const STATUSES = ["open", "answered", "closed"] as const;
const CATEGORIES = ["account", "payments", "withdrawals", "package", "technical", "other"] as const;

/** POST /support — raise a new support ticket. The opening message becomes
 *  the first entry in the conversation thread (sender: user). */
export const createTicketSchema = z.object({
  body: z.object({
    category: z.enum(CATEGORIES),
    subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(160),
    message: z.string().trim().min(2, "Message must be at least 2 characters").max(5000),
  }),
});

/** GET /support (and /support/admin) — paginated, filterable ticket list. */
export const ticketListQuerySchema = z.object({
  query: z.object({
    status: z.enum(STATUSES).optional(),
    category: z.enum(CATEGORIES).optional(),
    q: z.string().trim().max(160).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** POST /support/:id/reply (and /support/admin/:id/reply) — append a message
 *  to the thread. User replies reopen a closed/answered ticket; admin replies
 *  flip it to "answered". */
export const ticketReplySchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, "Message is required").max(5000),
  }),
});

/** PATCH /support/admin/:id/status — close or reopen a ticket. */
export const ticketStatusSchema = z.object({
  body: z.object({
    status: z.enum(["open", "closed"]),
  }),
});

/** Path param for /support/:id* (user + admin). */
export const ticketIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Ticket id is required"),
  }),
});

export type CreateTicketBody = z.infer<typeof createTicketSchema>["body"];
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>["query"];
export type TicketReplyBody = z.infer<typeof ticketReplySchema>["body"];
export type TicketStatusBody = z.infer<typeof ticketStatusSchema>["body"];
export type TicketIdParam = z.infer<typeof ticketIdParamSchema>["params"];