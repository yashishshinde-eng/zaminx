import { SupportTicket, User, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  TicketPage,
  TicketRow,
  AdminTicketPage,
  AdminTicketRow,
  ReplyRow,
  TicketStatus,
  TicketCategory,
  CreateTicketBody,
} from "@zeminex/shared";

interface Meta {
  ip?: string;
  userAgent?: string;
}

/* ------------------------------------------------------------------ */
/*  Mappers                                                            */
/* ------------------------------------------------------------------ */

type LeanReply = { _id: { toString(): string }; sender: string; message: string; createdAt: Date };

function toReplyRow(r: LeanReply): ReplyRow {
  return {
    id: r._id.toString(),
    sender: r.sender as ReplyRow["sender"],
    message: r.message,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date().toISOString(),
  };
}

type LeanTicket = {
  _id: { toString(): string };
  user: { toString(): string };
  category: string;
  subject: string;
  status: string;
  replies: LeanReply[];
  assignedTo?: { toString(): string } | null;
  createdAt: Date;
  updatedAt: Date;
};

function toTicketRow(t: LeanTicket): TicketRow {
  return {
    id: t._id.toString(),
    category: t.category as TicketCategory,
    subject: t.subject,
    status: t.status as TicketStatus,
    replies: (t.replies ?? []).map(toReplyRow),
    assignedTo: t.assignedTo ? t.assignedTo.toString() : null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : new Date().toISOString(),
  };
}

type LeanAdminTicket = LeanTicket & {
  user?: { _id: { toString(): string }; name: string; email: string } | null;
};

function toAdminTicketRow(t: LeanAdminTicket): AdminTicketRow {
  const base = toTicketRow(t);
  const u = t.user;
  return {
    ...base,
    user: {
      id: u && typeof u === "object" && "_id" in u ? u._id.toString() : String(t.user),
      name: u && typeof u === "object" && "name" in u ? u.name : "Unknown",
      email: u && typeof u === "object" && "email" in u ? u.email : "",
    },
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}

/* ------------------------------------------------------------------ */
/*  User: create / list / detail / reply                                */
/* ------------------------------------------------------------------ */

/** POST /support — create a ticket; the opening message is replies[0]. */
export async function createTicket(
  userId: string,
  input: CreateTicketBody,
  meta?: Meta,
): Promise<TicketRow> {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound("User not found");

  const ticket = await SupportTicket.create({
    user: userId,
    category: input.category,
    subject: input.subject,
    status: "open",
    replies: [{ sender: "user", message: input.message }],
  });

  await ActivityLog.create({
    actor: userId,
    action: "support.ticket.create",
    resource: "SupportTicket",
    resourceId: ticket._id.toString(),
    meta: { category: input.category, subject: input.subject },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  const created = await SupportTicket.findById(ticket._id).lean();
  return toTicketRow(created as never);
}

/** GET /support — the user's tickets (newest first), filterable. */
export async function listUserTickets(
  userId: string,
  args: { status?: TicketStatus; category?: TicketCategory; page: number; limit: number },
): Promise<TicketPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = { user: userId };
  if (args.status) filter.status = args.status;
  if (args.category) filter.category = args.category;
  const [rows, total] = await Promise.all([
    SupportTicket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupportTicket.countDocuments(filter),
  ]);
  return { items: rows.map((r) => toTicketRow(r as never)), ...paginate(total, page, limit) };
}

/** GET /support/:id — single ticket, ownership-checked (404 no-leak). */
export async function getUserTicket(userId: string, id: string): Promise<TicketRow> {
  const t = await SupportTicket.findById(id).lean();
  if (!t || t.user.toString() !== userId) throw ApiError.notFound("Ticket not found");
  return toTicketRow(t as never);
}

/** POST /support/:id/reply — user appends a message; reopens answered/closed. */
export async function replyAsUser(userId: string, id: string, message: string, meta?: Meta): Promise<TicketRow> {
  const t = await SupportTicket.findById(id).lean();
  if (!t || t.user.toString() !== userId) throw ApiError.notFound("Ticket not found");

  const reopen = t.status !== "open";
  await SupportTicket.updateOne(
    { _id: id },
    {
      $push: { replies: { sender: "user", message, createdAt: new Date() } },
      ...(reopen ? { $set: { status: "open" } } : {}),
    },
  );

  await ActivityLog.create({
    actor: userId,
    action: "support.ticket.reply",
    resource: "SupportTicket",
    resourceId: id,
    meta: { sender: "user", reopened: reopen },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  const updated = await SupportTicket.findById(id).lean();
  return toTicketRow(updated as never);
}

/* ------------------------------------------------------------------ */
/*  Admin: list / detail / reply / change status                       */
/* ------------------------------------------------------------------ */

/** GET /support/admin — all tickets (admin), filterable + searchable. */
export async function listAllTickets(
  args: { status?: TicketStatus; category?: TicketCategory; q?: string; page: number; limit: number },
): Promise<AdminTicketPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  if (args.category) filter.category = args.category;
  if (args.q) filter.subject = { $regex: args.q, $options: "i" };
  const [rows, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email")
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);
  return { items: rows.map((r) => toAdminTicketRow(r as never)), ...paginate(total, page, limit) };
}

/** GET /support/admin/:id — any ticket (admin). */
export async function getAdminTicket(id: string): Promise<AdminTicketRow> {
  const t = await SupportTicket.findById(id).populate("user", "name email").lean();
  if (!t) throw ApiError.notFound("Ticket not found");
  return toAdminTicketRow(t as never);
}

/** POST /support/admin/:id/reply — admin appends a message; → answered. */
export async function replyAsAdmin(adminId: string, id: string, message: string, meta?: Meta): Promise<AdminTicketRow> {
  const t = await SupportTicket.findById(id).lean();
  if (!t) throw ApiError.notFound("Ticket not found");

  await SupportTicket.updateOne(
    { _id: id },
    {
      $push: { replies: { sender: "admin", message, createdAt: new Date() } },
      $set: { status: "answered", assignedTo: adminId },
    },
  );

  await ActivityLog.create({
    actor: adminId,
    action: "support.ticket.reply",
    resource: "SupportTicket",
    resourceId: id,
    meta: { sender: "admin" },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  const updated = await SupportTicket.findById(id).populate("user", "name email").lean();
  return toAdminTicketRow(updated as never);
}

/** PATCH /support/admin/:id/status — close (→ closed) or reopen (→ open). */
export async function updateTicketStatus(
  adminId: string,
  id: string,
  status: "open" | "closed",
  meta?: Meta,
): Promise<AdminTicketRow> {
  const t = await SupportTicket.findById(id).lean();
  if (!t) throw ApiError.notFound("Ticket not found");

  await SupportTicket.updateOne({ _id: id }, { $set: { status } });

  await ActivityLog.create({
    actor: adminId,
    action: "support.ticket.status",
    resource: "SupportTicket",
    resourceId: id,
    meta: { to: status },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  const updated = await SupportTicket.findById(id).populate("user", "name email").lean();
  return toAdminTicketRow(updated as never);
}