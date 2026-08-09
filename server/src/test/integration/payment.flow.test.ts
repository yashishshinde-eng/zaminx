import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, registerAndLogin, seedPackage, fundWallet } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";
import { UserPackage } from "../../models/index.js";

/**
 * Payment flow integration test (sandbox, no live gateway). The flow is now
 * decoupled: a wallet deposit (POST /payments/deposit) creates a pending,
 * package-less Deposit; the dev-simulate endpoint confirms it and credits the
 * Main wallet; the user then activates a package from their wallet balance.
 */
describe.skipIf(!hasTestDb)("payment flow", () => {
  beforeAll(async () => {
    await connectTestDb();
  });
  afterAll(async () => {
    await disconnectTestDb();
    await closeApi();
  });
  beforeEach(async () => {
    await clearDb();
  });

  it("starts a wallet deposit and confirms it via the simulate path", async () => {
    const { accessToken } = await registerAndLogin();

    // Start a package-less wallet deposit (sandbox invoice).
    const dep = await authed<{ data: { deposit: { id: string; status: string; userPackageId: string | null; sandbox: boolean } } }>(
      accessToken,
      "/api/v1/payments/deposit",
      { method: "POST", body: JSON.stringify({ amount: 100 }) },
    );
    expect(dep.status).toBe(201);
    expect(dep.body.data.deposit.status).toBe("pending");
    expect(dep.body.data.deposit.userPackageId).toBeNull();
    expect(dep.body.data.deposit.sandbox).toBe(true);

    // Simulate the paid webhook → deposit flips to paid.
    const sim = await authed(accessToken, `/api/v1/payments/dev/simulate/${dep.body.data.deposit.id}`, { method: "POST" });
    expect(sim.status).toBe(200);
    expect(sim.body.data.deposit.status).toBe("paid");

    const after = await authed<{ data: { deposits: { id: string; status: string }[] } }>(
      accessToken,
      "/api/v1/payments/deposits",
    );
    const confirmed = after.body.data.deposits.find((d) => d.status === "paid");
    expect(confirmed).toBeTruthy();

    // The Main wallet was credited; no package was created.
    const w = await authed<{ data: { wallets: { main: { available: number } } } }>(accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.main.available).toBe(100);
    expect(await UserPackage.countDocuments({})).toBe(0);
  });

  it("activates a package from a funded wallet (debit + active subscription)", async () => {
    const { accessToken, userId } = await registerAndLogin();
    const pkg = await seedPackage({ priceUsd: 100 });

    // Fund the wallet first (deposit + simulate).
    await fundWallet(100, accessToken);

    // Activate from wallet balance — instant, no pending payment.
    const act = await authed<{ data: { package: { status: string; paymentStatus: string }; payment: { status: string } } }>(
      accessToken,
      "/api/v1/packages/activate",
      { method: "POST", body: JSON.stringify({ packageId: pkg._id }) },
    );
    expect(act.status).toBe(201);
    expect(act.body.data.package.status).toBe("active");
    expect(act.body.data.package.paymentStatus).toBe("paid");
    expect(act.body.data.payment.status).toBe("paid");

    // The package price was debited from the Main wallet.
    const w = await authed<{ data: { wallets: { main: { available: number } } } }>(accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.main.available).toBe(0);

    // The subscription is active with the user.
    const up = await UserPackage.findOne({ user: userId, status: "active" }).lean();
    expect(up).toBeTruthy();
  });

  it("is idempotent: a second simulate does not double-credit", async () => {
    const { accessToken } = await registerAndLogin();
    const dep = await authed<{ data: { deposit: { id: string } } }>(
      accessToken,
      "/api/v1/payments/deposit",
      { method: "POST", body: JSON.stringify({ amount: 100 }) },
    );
    const id = dep.body.data.deposit.id;

    const first = await authed(accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });
    expect(first.status).toBe(200);

    // Already paid → not pending → 409, no second confirmation.
    const second = await authed(accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });
    expect(second.status).toBe(409);

    const after = await authed<{ data: { deposits: { id: string }[] } }>(
      accessToken,
      "/api/v1/payments/deposits",
    );
    expect(after.body.data.deposits.length).toBe(1);
  });
});