# Income Distribution — leader scenario (REAL SYSTEM)

> Run against the real app database (`zaminex` on `ac-mfge320-shard-00-00.mif1alv.mongodb.net`) using the live seed config. Every user, deposit, package activation, wallet balance, and income transaction below is a real document in the system — viewable in the app/admin panel. Generated 2026-08-08.

## Scenario

Structure (each user deposited $50 → sandbox invoice → simulated paid → activated the $50 package, top-to-bottom):

```
admin (root, no package — seeded admin@zeminex.local)
  └─ Team Leader (TL)
       ├─ Leg a: L1.a → L2.a → … → L10.a   (10 levels, 1 user each)
       ├─ Leg b: L1.b → L2.b → … → L10.b
       └─ Leg c: L1.c → L2.c → … → L10.c
```

Total users created: 31 (1 Team Leader + 3 legs × 10 levels = 31), all sponsored under the real admin.

Package: $50 one-time, 2% daily yield, 365-day term, 30%/month yield cap (the real seeded `Zeminex Global` package). Deposits run through the NOWPayments **sandbox** (no live gateway — `NOWPAYMENTS_API_KEY` is unset), so each deposit is simulated paid. All five compensation engines fired once (idempotent).

## Engine run summary

| Engine | Result |
|---|---|
| run-yield | processed 34, credited 34, skipped 0, expired 0 |
| run-team-energy | processed 34, credited 30, skipped 1 |
| run-bonanza | evaluated 32, awarded 31 |
| run-rank-check | evaluated 34, awarded 0 |
| run-community | month 2026-08, processed 34, credited 24, skipped 10 |

## Per-user income distribution

`net = credit − debit` per income type, read from the **real `WalletTransaction` collection**. Wallets: **Main** = deposits/activations, **Bonus** = all bonuses, **Trading** = daily yield. (Main is $0 for every package holder: deposit +$50 then activation −$50.)

| User | Level | Direct bonus | Team energy | Trade yield | Community (mo) | Rank reward | Bonanza | Bonus wallet | Trading | Main |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| admin | 0 | — | — | — | — | — | — | $0 | $0 | $0 |
| TL | 0 | +$15 | +$0.63 | +$1 | +$60 | — | +$110 | $185.63 | $1 | $0 |
| L1.a | 1 | +$5 | +$0.21 | +$1 | +$25 | — | +$100 | $130.21 | $1 | $0 |
| L1.b | 1 | +$5 | +$0.21 | +$1 | +$25 | — | +$100 | $130.21 | $1 | $0 |
| L1.c | 1 | +$5 | +$0.21 | +$1 | +$25 | — | +$100 | $130.21 | $1 | $0 |
| L2.a | 2 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L2.b | 2 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L2.c | 2 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L3.a | 3 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L3.b | 3 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L3.c | 3 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L4.a | 4 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L4.b | 4 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L4.c | 4 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L5.a | 5 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L5.b | 5 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L5.c | 5 | +$5 | +$0.21 | +$1 | +$10 | — | +$100 | $115.21 | $1 | $0 |
| L6.a | 6 | +$5 | +$0.2 | +$1 | +$10 | — | +$100 | $115.2 | $1 | $0 |
| L6.b | 6 | +$5 | +$0.2 | +$1 | +$10 | — | +$100 | $115.2 | $1 | $0 |
| L6.c | 6 | +$5 | +$0.2 | +$1 | +$10 | — | +$100 | $115.2 | $1 | $0 |
| L7.a | 7 | +$5 | +$0.18 | +$1 | +$10 | — | +$100 | $115.18 | $1 | $0 |
| L7.b | 7 | +$5 | +$0.18 | +$1 | +$10 | — | +$100 | $115.18 | $1 | $0 |
| L7.c | 7 | +$5 | +$0.18 | +$1 | +$10 | — | +$100 | $115.18 | $1 | $0 |
| L8.a | 8 | +$5 | +$0.15 | +$1 | — | — | +$100 | $105.15 | $1 | $0 |
| L8.b | 8 | +$5 | +$0.15 | +$1 | — | — | +$100 | $105.15 | $1 | $0 |
| L8.c | 8 | +$5 | +$0.15 | +$1 | — | — | +$100 | $105.15 | $1 | $0 |
| L9.a | 9 | +$5 | +$0.1 | +$1 | — | — | +$100 | $105.1 | $1 | $0 |
| L9.b | 9 | +$5 | +$0.1 | +$1 | — | — | +$100 | $105.1 | $1 | $0 |
| L9.c | 9 | +$5 | +$0.1 | +$1 | — | — | +$100 | $105.1 | $1 | $0 |
| L10.a | 10 | — | — | +$1 | — | — | — | $0 | $1 | $0 |
| L10.b | 10 | — | — | +$1 | — | — | — | $0 | $1 | $0 |
| L10.c | 10 | — | — | +$1 | — | — | — | $0 | $1 | $0 |

## Notes

- Trade yield & team energy are **one-day** figures (engines fired once). Yield is capped at 30%/month of the package price ($15/mo); team energy accrues daily up to 10 levels upline at 10/5/4/3/2/1/0.5/0.5/0.25/0.25%.
- Anti-farming: direct bonus, community, rank reward, and bonanza all require the earner to hold an **active package**. The admin (root, no package) earns nothing.
- All engines are idempotent — re-running the same day/month does not double-pay.

### Real-system config (as found in the live DB — differs from `project_plan.md`)

The live `zaminex` DB is configured differently from the project plan / the seed defaults. The numbers above are produced by the **real** config:

- **Rank ladder — 5 rungs (Bronze/Silver/Gold/Platinum), not the 10-star 3^n ladder from the plan.** Each rung requires BOTH directs and team size:
  | order | name | requiredDirects | requiredTeamSize | rewardAmount |
  |---:|---|---:|---:|---:|
  | 0 | Starter | 0 | 0 | $0 |
  | 1 | Bronze | 5 | 10 | $10 |
  | 2 | Silver | 15 | 50 | $25 |
  | 3 | Gold | 40 | 150 | $60 |
  | 4 | Platinum | 100 | 400 | $150 |
  - **Rank reward = $0 for everyone here:** the biggest tree is the Team Leader (3 directs, 30-team), which is below Bronze (5 directs, 10-team... 3 directs < 5 → no rank). So `run-rank-check awarded 0`.
- **Community bonus (monthly)** is pegged to the rank-ladder `rewardAmount` at the user's *star*, where star is computed from team size by the 3^n rule (3→1★, 9→2★, 27→3★), indexing into the 5-rung ladder above:
  - TL: team 30 → 3★ → Gold → **$60** · L1: team 9 → 2★ → Silver → **$25** · L2–L7: team 3–8 → 1★ → Bronze → **$10** · L8–L10: team <3 → 0★ → **$0**.
- **Bonanza — TWO active offers in the live DB:**
  | name | requiredDirects | rewardAmount | window |
  |---|---:|---:|---|
  | Quick Start | 3 | $10 | 2026-08-02 → 2026-10-31 |
  | New month | 1 | $100 | 2026-08-08 → 2026-08-10 |
  - **"New month" (1 direct → $100)** is what drives the large bonanza column: it fires for every active-package holder with ≥1 direct. TL (3 directs) earns **both** — Quick Start $10 + New month $100 = **$110**. L1–L9 (1 direct each) earn New month $100. L10 (0 directs) earns nothing.

### Side effects on pre-existing real users ⚠️

Running the engines evaluated **all** active-package holders, including users already in the live DB (not part of this scenario). Two existing accounts received real credits this run (not reversed by the `@scenario.local` cleanup):

| existing user | role | active pkg | credited this run |
|---|---|:---:|---:|
| admin@zaminex.local | admin | yes | +$100 bonanza (New month) + $10 community = **+$110** |
| user1@zaminex.local | user | yes | +$100 bonanza (New month) + $10 community = **+$110** |

Users without an active package (user2, user3, the typo'd `user1@zaminex.locall`, saishbafna2019@gmail.com, kkgmlmbusiness@gmail.com) earned nothing — the anti-farming gate held.

> Note: a second admin `admin@zeminex.local` was also created this run (the live DB's real admin is `admin@zaminex.local`; `.env` `SEED_ADMIN_EMAIL=admin@zeminex.local` didn't match, so the script created a new one). It has no package and earned $0. It is **not** deleted by the `@scenario.local` cleanup.

## Cleanup

All 31 created users use the email suffix `@scenario.local`. Remove them and their data from the real system with:

```bash
npx tsx scenario-cleanup.ts
```