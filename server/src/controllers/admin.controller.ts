import type { RequestHandler } from "express";
import {
  compensationSettingsSchema,
  siteConfigUpdateSchema,
  smtpSettingsSchema,
  smtpTestEmailSchema,
  nowpaymentsSettingsSchema,
  maintenanceSettingsSchema,
  adminLogsQuerySchema,
} from "@zaminex/shared";
import type {
  CompensationSettingsBody,
  SiteConfigUpdate,
  SmtpSettingsBody,
  SmtpTestEmailBody,
  NowpaymentsSettingsBody,
  MaintenanceSettingsBody,
  AdminLogsQuery,
} from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { ActivityLog } from "../models/index.js";
import { getAdminDashboardSummary } from "../services/adminDashboard.service.js";
import {
  getCompensationSettings,
  updateCompensationSettings as updateCompensationSettingsSvc,
  getAdminSiteConfig,
  updateAdminSiteConfig as updateAdminSiteConfigSvc,
  getSmtpSettings,
  updateSmtpSettings as updateSmtpSettingsSvc,
  getNowpaymentsSettings,
  updateNowpaymentsSettings as updateNowpaymentsSettingsSvc,
  getMaintenanceSettings,
  updateMaintenanceSettings as updateMaintenanceSettingsSvc,
} from "../services/setting.service.js";
import { sendTestEmail } from "../services/email.service.js";
import { forceLogoutAll } from "../services/auth.service.js";
import { readLogTail } from "../services/adminLogs.service.js";

/** GET /admin/dashboard — platform-wide admin dashboard (KPIs + series + activity). */
export const dashboard: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const dashboard = await getAdminDashboardSummary();
    ok(res, { dashboard }, "Admin dashboard");
  }),
];

/** GET /admin/settings/compensation — read the 7 compensation knobs. */
export const compensationSettings: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const compensation = await getCompensationSettings();
    ok(res, { compensation }, "Compensation settings");
  }),
];

/** PATCH /admin/settings/compensation — update the provided compensation knobs. */
export const updateCompensationSettings: RequestHandler[] = [
  validate(compensationSettingsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const compensation = await updateCompensationSettingsSvc(req.body as CompensationSettingsBody);
    await ActivityLog.create({ actor: req.user.id, action: "settings.compensation_update", resource: "Setting", meta: req.body }).catch(() => undefined);
    ok(res, { compensation }, "Compensation settings updated");
  }),
];

/** GET /admin/settings/cms — read the 9 admin-editable cms.* fields. */
export const siteConfig: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const siteConfig = await getAdminSiteConfig();
    ok(res, { siteConfig }, "Site configuration");
  }),
];

/** PATCH /admin/settings/cms — update the provided cms.* fields. */
export const updateSiteConfig: RequestHandler[] = [
  validate(siteConfigUpdateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const siteConfig = await updateAdminSiteConfigSvc(req.body as SiteConfigUpdate);
    await ActivityLog.create({ actor: req.user.id, action: "settings.site_config_update", resource: "Setting", meta: { fields: Object.keys(req.body) } }).catch(() => undefined);
    ok(res, { siteConfig }, "Site configuration updated");
  }),
];

/** GET /admin/settings/smtp — read non-secret SMTP fields + configured flag. */
export const smtpSettings: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const smtp = await getSmtpSettings();
    ok(res, { smtp }, "SMTP settings");
  }),
];

/** PATCH /admin/settings/smtp — update non-secret SMTP fields (secrets env-only). */
export const updateSmtpSettings: RequestHandler[] = [
  validate(smtpSettingsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const smtp = await updateSmtpSettingsSvc(req.body as SmtpSettingsBody);
    await ActivityLog.create({ actor: req.user.id, action: "settings.smtp_update", resource: "Setting", meta: { fields: Object.keys(req.body) } }).catch(() => undefined);
    ok(res, { smtp }, "SMTP settings updated");
  }),
];

/** POST /admin/settings/smtp/test — send a test email (throws on SMTP failure). */
export const testSmtpEmail: RequestHandler[] = [
  validate(smtpTestEmailSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { to } = req.body as SmtpTestEmailBody;
    const result = await sendTestEmail(to);
    await ActivityLog.create({ actor: req.user.id, action: "settings.smtp_test_send", resource: "Setting", meta: { to } }).catch(() => undefined);
    ok(res, { sent: !result.dev, dev: result.dev }, result.dev ? "Test email written to dev folder" : "Test email sent");
  }),
];

/** GET /admin/settings/payment — read non-secret NOWPayments fields + configured flag. */
export const nowpaymentsSettings: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const nowpayments = await getNowpaymentsSettings();
    ok(res, { nowpayments }, "NOWPayments settings");
  }),
];

/** PATCH /admin/settings/payment — update non-secret NOWPayments fields (secrets env-only). */
export const updateNowpaymentsSettings: RequestHandler[] = [
  validate(nowpaymentsSettingsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const nowpayments = await updateNowpaymentsSettingsSvc(req.body as NowpaymentsSettingsBody);
    await ActivityLog.create({ actor: req.user.id, action: "settings.nowpayments_update", resource: "Setting", meta: { fields: Object.keys(req.body) } }).catch(() => undefined);
    ok(res, { nowpayments }, "NOWPayments settings updated");
  }),
];

/* ---- Phase 14C — maintenance / force-logout-all / logs ---- */

/** GET /admin/settings/maintenance — read the maintenance flag + message. */
export const maintenanceSettings: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const maintenance = await getMaintenanceSettings();
    ok(res, { maintenance }, "Maintenance settings");
  }),
];

/** PATCH /admin/settings/maintenance — toggle maintenance + set message. */
export const updateMaintenanceSettings: RequestHandler[] = [
  validate(maintenanceSettingsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const maintenance = await updateMaintenanceSettingsSvc(req.body as MaintenanceSettingsBody);
    await ActivityLog.create({ actor: req.user.id, action: "settings.maintenance_update", resource: "Setting", meta: { enabled: maintenance.enabled, message: maintenance.message } }).catch(() => undefined);
    ok(res, { maintenance }, "Maintenance settings updated");
  }),
];

/** POST /admin/sessions/invalidate-all — force-logout everyone except the acting admin. */
export const forceLogoutAllHandler: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { count } = await forceLogoutAll(req.user.id);
    ok(res, { count }, "Sessions invalidated");
  }),
];

/** GET /admin/logs — tail of a Winston log file. */
export const adminLogs: RequestHandler[] = [
  validate(adminLogsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const logs = await readLogTail(req.query as unknown as AdminLogsQuery);
    ok(res, { logs }, "Log tail");
  }),
];