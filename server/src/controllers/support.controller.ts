import type { RequestHandler } from "express";
import {
  createTicketSchema,
  ticketListQuerySchema,
  ticketIdParamSchema,
  ticketReplySchema,
} from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createTicket,
  listUserTickets,
  getUserTicket,
  replyAsUser,
} from "../services/support.service.js";
import type { TicketStatus, TicketCategory } from "@zeminex/shared";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** POST /support — raise a new support ticket. */
export const create: RequestHandler[] = [
  validate(createTicketSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const row = await createTicket(req.user.id, req.body, meta(req));
    created(res, { ticket: row }, "Ticket created");
  }),
];

/** GET /support — the user's tickets (paginated, filterable). */
export const list: RequestHandler[] = [
  validate(ticketListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as {
      status?: TicketStatus;
      category?: TicketCategory;
      page?: number;
      limit?: number;
    };
    const page = await listUserTickets(req.user.id, {
      status: q.status,
      category: q.category,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { tickets: page }, "Your tickets");
  }),
];

/** GET /support/:id — single ticket (ownership-checked). */
export const detail: RequestHandler[] = [
  validate(ticketIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id?: string }).id;
    if (!id) throw ApiError.badRequest("Ticket id is required");
    const row = await getUserTicket(req.user.id, id);
    ok(res, { ticket: row }, "Ticket");
  }),
];

/** POST /support/:id/reply — user appends a message (reopens if answered/closed). */
export const reply: RequestHandler[] = [
  validate(ticketIdParamSchema, "params"),
  validate(ticketReplySchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id?: string }).id;
    if (!id) throw ApiError.badRequest("Ticket id is required");
    const row = await replyAsUser(req.user.id, id, req.body.message, meta(req));
    ok(res, { ticket: row }, "Reply added");
  }),
];