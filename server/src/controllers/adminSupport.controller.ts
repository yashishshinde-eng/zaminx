import type { Request, RequestHandler } from "express";
import {
  ticketListQuerySchema,
  ticketIdParamSchema,
  ticketReplySchema,
  ticketStatusSchema,
} from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  listAllTickets,
  getAdminTicket,
  replyAsAdmin,
  updateTicketStatus,
} from "../services/support.service.js";
import type { TicketStatus, TicketCategory } from "@zeminex/shared";

const idParam = (req: Request): string => {
  const id = (req.params as { id?: string }).id;
  if (!id) throw ApiError.badRequest("Ticket id is required");
  return id;
};

const meta = (req: Request) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** GET /support/admin — all tickets (admin). */
export const adminList: RequestHandler[] = [
  validate(ticketListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as {
      status?: TicketStatus;
      category?: TicketCategory;
      q?: string;
      page?: number;
      limit?: number;
    };
    const page = await listAllTickets({
      status: q.status,
      category: q.category,
      q: q.q,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { tickets: page }, "Support tickets");
  }),
];

/** GET /support/admin/:id — any ticket (admin). */
export const adminDetail: RequestHandler[] = [
  validate(ticketIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const row = await getAdminTicket(idParam(req));
    ok(res, { ticket: row }, "Ticket");
  }),
];

/** POST /support/admin/:id/reply — admin appends a message; → answered. */
export const adminReply: RequestHandler[] = [
  validate(ticketIdParamSchema, "params"),
  validate(ticketReplySchema),
  asyncHandler(async (req, res) => {
    const row = await replyAsAdmin(req.user!.id, idParam(req), req.body.message, meta(req));
    ok(res, { ticket: row }, "Reply added");
  }),
];

/** PATCH /support/admin/:id/status — close or reopen a ticket. */
export const adminStatus: RequestHandler[] = [
  validate(ticketIdParamSchema, "params"),
  validate(ticketStatusSchema),
  asyncHandler(async (req, res) => {
    const row = await updateTicketStatus(req.user!.id, idParam(req), req.body.status, meta(req));
    ok(res, { ticket: row }, `Ticket ${req.body.status}`);
  }),
];