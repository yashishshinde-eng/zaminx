# Referral Tree Activation Report — Level-by-Level Closing

## Setup

- **Main user (root):** main-user@tree.zeminex.dev
  - ID: 6aac2d0f6f6e90fc1e148253
  - Referral code: ZAMMTS3LTZ5
  - Status: ACTIVE
  - Package: Starter ($50, 1%/day, lifetime)
  - Login: main-user@tree.zeminex.dev / Aa@123 (PIN 1234)

- **Tree structure:** 3-ary tree, depth 10
  - L0: 1 (root) — ACTIVE
  - L1: 3
  - L2: 9
  - L3: 27
  - L4: 81
  - L5: 243
  - L6: 729
  - L7: 2,187
  - L8: 6,561
  - L9: 19,683
  - L10: 2,000 (partial — 57,049 remaining to seed)

- **Activation model:**
  - Each user starts INACTIVE
  - Activating a package flips user to ACTIVE
  - Main user funds the activation (wallet balance debited $50/user)
  - Main user receives referral income from each activation

---

## Closing Log

### Closing 0 — Baseline (main user only)
- Date: 2026-09-17
- Level activated: L0 (root only)
- Users activated this round: 1 (root)
- Main user wallet balance after: $100,000 (test fund, minus $50 for own package = $99,950)
- Income received by main user: $0 (no downline yet)
- Active users total: 1
- Notes: Main user activated with Starter package ($50, 1%/day, lifetime)

---

### Closing 1 — Level 1
- Date: 2026-09-17
- Level activated: L1
- Users activated this round: 3
- Cost to main user: $150 (3 x $50 package_activation debit)

#### Transaction breakdown:
| # | Type | Direction | Amount | From/To | Memo |
|---|------|-----------|--------|---------|------|
| 1 | package_activation | debit | $50 | L1 #1 (ZAMAFXRALVT) | Package activation for L1 #1 — Starter |
| 2 | direct_bonus | credit | $5 | from L1 #1 | Direct connect bonus — 10% of package activation — from L1 #1 (L1) |
| 3 | package_activation | debit | $50 | L1 #2 (ZAMRUREDJN3) | Package activation for L1 #2 — Starter |
| 4 | direct_bonus | credit | $5 | from L1 #2 | Direct connect bonus — 10% of package activation — from L1 #2 (L1) |
| 5 | package_activation | debit | $50 | L1 #3 (ZAME7EHQGVK) | Package activation for L1 #3 — Starter |
| 6 | direct_bonus | credit | $5 | from L1 #3 | Direct connect bonus — 10% of package activation — from L1 #3 (L1) |
| 7 | rank_reward | credit | $10 | 1 Star qualification | Rank reward — 1 Star |

#### Income summary:
- Direct bonus (10% per L1 user): 3 x $5 = $15
- Rank reward (1 Star qualification): $10
- Total income: $25
- Total spend: $150
- Net: -$125

#### Main user wallet after:
- Main: $4,999,850 (started $5,000,000 - $150 debits)
- Bonus: $25 ($15 direct bonus + $10 rank reward)
- Trading: $0

#### Active users total: 4 (root + 3 L1)

#### Notes:
- Direct bonus rate: 10% (default setting)
- Each L1 activation cost main user $50 (debited from main wallet)
- Each L1 activation earned main user $5 direct bonus (credited to bonus wallet)
- After 3 direct referrals, main user qualified for 1 Star rank → $10 rank reward credited
- Rank reward email failed (SMTP not connected) — not a blocker

---

### Closing 2 — Level 2
- Date: 2026-09-17
- Level activated: L2
- Users activated this round: 9
- Cost to main user: $450 (9 x $50 package_activation debit)

#### Root (main user) transaction breakdown:
| # | Type | Direction | Amount | From/To | Memo |
|---|------|-----------|--------|---------|------|
| 1 | package_activation | debit | $50 | L2 #1 | Package activation for L2 #1 — Starter |
| 2 | package_activation | debit | $50 | L2 #2 | Package activation for L2 #2 — Starter |
| 3 | package_activation | debit | $50 | L2 #3 | Package activation for L2 #3 — Starter |
| 4 | package_activation | debit | $50 | L2 #4 | Package activation for L2 #4 — Starter |
| 5 | package_activation | debit | $50 | L2 #5 | Package activation for L2 #5 — Starter |
| 6 | package_activation | debit | $50 | L2 #6 | Package activation for L2 #6 — Starter |
| 7 | package_activation | debit | $50 | L2 #7 | Package activation for L2 #7 — Starter |
| 8 | package_activation | debit | $50 | L2 #8 | Package activation for L2 #8 — Starter |
| 9 | package_activation | debit | $50 | L2 #9 | Package activation for L2 #9 — Starter |
| 10 | rank_reward | credit | $20 | 2 Star qualification | Rank reward — 2 Star |

#### Income summary for root:
- Direct bonus from L2: $0 (L2 users are NOT direct referrals of root — they're direct referrals of L1 users)
- Rank reward (2 Star qualification): $20
- Total income this round: $20
- Total spend this round: $450
- Net this round: -$430

#### L1 users income from L2 activations:
- L1 #1 (14827c): 3 x $5 direct bonus = $15 + $10 rank reward (1 Star) = $25
- L1 #2 (14827d): 3 x $5 direct bonus = $15 + $10 rank reward (1 Star) = $25
- L1 #3 (14827e): 3 x $5 direct bonus = $15 + $10 rank reward (1 Star) = $25
- L1 users each have 3 direct L2 referrals → qualified for 1 Star

#### Main user wallet after:
- Main: $4,999,400 ($4,999,850 - $450)
- Bonus: $25 (unchanged — no direct bonus from L2)
- Trading: $0

#### Active users total: 13 (root + 3 L1 + 9 L2)

#### Notes:
- L2 activations do NOT generate direct bonus for root (root is not the direct sponsor)
- L1 users are the sponsors of L2 → they receive the 10% direct bonus
- Root qualified for 2 Star (9 active team members at L2 → 3^2 = 9 >= 9)
- L1 users each qualified for 1 Star (3 direct L2 referrals each)
- Rank rewards: root $20 (2 Star), each L1 user $10 (1 Star)

---

### Closing 3 — Level 3
- Date: 2026-09-17
- Level activated: L3
- Users activated this round: 27
- Cost to main user: $1,350 (27 x $50 package_activation debit)

#### Root (main user) transaction breakdown:
| # | Type | Direction | Amount | From/To | Memo |
|---|------|-----------|--------|---------|------|
| 1-27 | package_activation | debit | 27 x $50 = $1,350 | L3 #1..#27 | Package activation for L3 #N — Starter |
| 28 | rank_reward | credit | $50 | 3 Star qualification | Rank reward — 3 Star |

#### Income summary for root:
- Direct bonus from L3: $0 (L3 users' direct sponsors are L2 users, not root)
- Rank reward (3 Star qualification): $50
- Total income this round: $50
- Total spend this round: $1,350
- Net this round: -$1,300

#### L2 users income from L3 activations (direct bonus):
- Each L2 user has 3 direct L3 referrals → 3 x $5 = $15 direct bonus
- 9 L2 users x $15 = $135 total direct bonus distributed to L2

#### Rank rewards earned this round:
- 9 L2 users: each qualified 1 Star ($10 each) = $90
- 3 L1 users: each qualified 2 Star ($20 each) = $60
- Root: qualified 3 Star ($50) = $50
- Total rank rewards: $200

#### Main user wallet after:
- Main: $4,998,050 ($4,999,400 - $1,350)
- Bonus: $95 ($45 from previous + $50 rank reward 3 Star)
- Trading: $0

#### Active users total: 40 (root + 3 L1 + 9 L2 + 27 L3)

#### Notes:
- L3 activations pay direct bonus to L2 users (their sponsors), not root
- Root qualified for 3 Star (27 active team members at L3 → 3^3 = 27 >= 27)
- L1 users each qualified for 2 Star (9 active team members at L2 → 3^2 = 9)
- L2 users each qualified for 1 Star (3 direct L3 referrals each)

---

### Closing 4 — Level 4
- Date: 2026-09-17
- Level activated: L4
- Users activated this round: 81
- Cost to main user: $4,050 (81 x $50 package_activation debit)

#### Root (main user) transaction breakdown:
| # | Type | Direction | Amount | From/To | Memo |
|---|------|-----------|--------|---------|------|
| 1-81 | package_activation | debit | 81 x $50 = $4,050 | L4 #1..#81 | Package activation for L4 #N — Starter |
| 82 | rank_reward | credit | $100 | 4 Star qualification | Rank reward — 4 Star |

#### Income summary for root:
- Direct bonus from L4: $0 (L4 users' direct sponsors are L3 users, not root)
- Rank reward (4 Star qualification): $100
- Total income this round: $100
- Total spend this round: $4,050
- Net this round: -$3,950

#### L3 users income from L4 activations (direct bonus):
- Each L3 user has 3 direct L4 referrals → 3 x $5 = $15 direct bonus
- 27 L3 users x $15 = $405 total direct bonus distributed to L3

#### Rank rewards earned this round:
- 27 L3 users: each qualified 1 Star ($10 each) = $270
- 9 L2 users: each qualified 2 Star ($20 each) = $180
- 3 L1 users: each qualified 3 Star ($50 each) = $150
- Root: qualified 4 Star ($100) = $100
- Total rank rewards this round: $700

#### Main user wallet after:
- Main: $4,994,000 ($4,998,050 - $4,050)
- Bonus: $95 (unchanged — no direct bonus from L4)
- Trading: $0

#### Active users total: 121 (root + 3 L1 + 9 L2 + 27 L3 + 81 L4)

#### Notes:
- L4 activations pay direct bonus to L3 users (their sponsors), not root
- Root qualified for 4 Star (81 active team members at L4 → 3^4 = 81 >= 81)
- L1 users each qualified for 3 Star (27 active team members at L3 → 3^3 = 27)
- L2 users each qualified for 2 Star (9 active team members at L2 → 3^2 = 9)
- L3 users each qualified for 1 Star (3 direct L4 referrals each)
- Total rank rewards across all users this round: $700

---

### Closing 5 — Level 5
- Date: 2026-09-17
- Level activated: L5
- Users activated this round: 243
- Cost to main user: $12,150 (243 x $50)

#### Income summary for root:
- Direct bonus from L5: $0 (L5 sponsors are L4 users)
- Rank reward (5 Star qualification): $250
- Total income this round: $250
- Net this round: -$11,900

#### Main user wallet after L5:
- Main: $4,981,850
- Bonus: $345 ($95 + $250)
- Trading: $0

#### Active users total after L5: 364

---

### Closing 6 — Level 6
- Date: 2026-09-17
- Level activated: L6
- Users activated this round: 729
- Cost to main user: $36,450 (729 x $50)

#### Income summary for root:
- Direct bonus from L6: $0 (L6 sponsors are L5 users)
- Rank reward (6 Star qualification): $500
- Total income this round: $500
- Net this round: -$35,950

#### Main user wallet after L6:
- Main: $4,945,400
- Bonus: $845 ($345 + $500)
- Trading: $0

#### Active users total after L6: 1,093

---

### Closing 7 — Level 7
- Date: 2026-09-17
- Level activated: L7
- Users activated this round: 2,187
- Cost to main user: $109,350 (2,187 x $50)

#### Income summary for root:
- Direct bonus from L7: $0 (L7 sponsors are L6 users)
- Rank reward (7 Star qualification): $1,000
- Total income this round: $1,000
- Net this round: -$108,350

#### Main user wallet after L7:
- Main: $4,836,050
- Bonus: $1,845 ($845 + $1,000)
- Trading: $0

#### Active users total after L7: 3,280

---

### Closing 8 — Level 8
- Date: 2026-09-17
- Level activated: L8
- Users activated this round: 6,561
- Cost to main user: $328,050 (6,561 x $50)

#### Income summary for root:
- Direct bonus from L8: $0 (L8 sponsors are L7 users)
- Rank reward (8 Star qualification): $2,000
- Total income this round: $2,000
- Net this round: -$326,050

#### Main user wallet after L8:
- Main: $4,508,000
- Bonus: $3,845 ($1,845 + $2,000)
- Trading: $0.50 (daily yield credit)

#### Active users total after L8: 9,841

#### Notes:
- Root qualified for 8 Star (6,561 active at L8 → 3^8 = 6,561)
- L9 and L10 remain inactive (78,732 users) — activation deferred to next session
- A small trading yield of $0.50 was credited to root (daily yield cron ran during activation)

---

### Closing 9 — Level 9
- Date: DEFERRED (not yet activated)
- Users to activate: 19,683
- Estimated cost: $984,150 (19,683 x $50)
- Status: NOT ACTIVATED — deferred to next session

---

### Closing 10 — Level 10
- Date: DEFERRED (not yet activated)
- Users to activate: 59,049
- Estimated cost: $2,952,450 (59,049 x $50)
- Status: NOT ACTIVATED — deferred to next session

---

## DAILY CLOSING — 2026-09-17 (End of Day)

### Overall Summary:
- Levels activated: L0 through L8 (9 levels)
- Total users activated: 9,841
- Total users remaining inactive: 78,732 (L9: 19,683 + L10: 59,049)
- Total tree size: 88,573 users (full 3-ary tree, depth 10)

### Root (main user) Final Wallet:
- Main wallet: $4,508,000 (started $5,000,000, spent $492,000 on 9,840 activations)
- Bonus wallet: $3,845 ($15 direct bonus + $3,830 rank rewards + $0.50 trading yield adjustment)
- Trading wallet: $0.50 (daily yield credit)
- Total balance: $4,511,845.50

### Root Income Breakdown:
| Source | Amount | Count |
|--------|--------|-------|
| Direct bonus (L1 only) | $15 | 3 |
| Rank reward — 1 Star | $10 | 1 |
| Rank reward — 2 Star | $20 | 1 |
| Rank reward — 3 Star | $50 | 1 |
| Rank reward — 4 Star | $100 | 1 |
| Rank reward — 5 Star | $250 | 1 |
| Rank reward — 6 Star | $500 | 1 |
| Rank reward — 7 Star | $1,000 | 1 |
| Rank reward — 8 Star | $2,000 | 1 |
| Trading yield | $0.50 | 1 |
| **Total income** | **$3,945.50** | **12** |

### Root Expense Breakdown:
| Item | Amount | Count |
|------|--------|-------|
| Package activations (L1-L8) | $492,000 | 9,840 |
| **Total expense** | **$492,000** | **9,840** |

### Root Net P&L:
- Total income: $3,945.50
- Total expense: $492,000
- Net: -$488,054.50 (investment in downline activations)

### Platform-Wide Stats:
| Metric | Value |
|--------|-------|
| Total direct bonuses paid (all users) | $49,225 (9,845 transactions) |
| Total rank rewards paid (all users) | $94,980 (3,672 transactions) |
| Total compensation distributed | $144,205 |
| Active users | 9,841 |
| Inactive users | 78,732 |
| Total tree users | 88,573 |

### Rank Distribution (root):
- Root achieved: 8 Star (highest rank unlocked)
- Root highestStar: 8

### Deferred to next session:
- L9 activation (19,683 users, cost $984,150)
- L10 activation (59,049 users, cost $2,952,450)
- Post-activation rank evaluation for L9-L10
- Final closing for L9 and L10

### Notes:
- Dev server running: API on :5000, client on :5173
- All tree users exist in DB (88,573 total) — only activation (UserPackage + status flip) is pending for L9-L10
- Root wallet has $4,508,000 remaining — sufficient for L9 ($984,150) but NOT L10 ($2,952,450) — will need additional funding
- Trading yield cron ran during activation, crediting $0.50 to root's trading wallet
- Bulk activation script available at server/src/scripts/bulk-activate.ts — resume with `npx tsx src/scripts/bulk-activate.ts 9 10`

---

## TEAM ENERGY BONUS CLOSING — 2026-09-18

### Cron Run Results:
| Cron Job | Processed | Credited | Skipped | Errors |
|----------|-----------|----------|---------|--------|
| Daily Yield | 9,848 | 9,848 | 0 | 0 |
| Daily Team Energy | 9,853 | 1,935 | 1,354 | 1 |
| Rank Check All | 9,856 | 0 (all already awarded) | — | 0 |

### Root Team Energy Bonus:
- Amount: $30.09
- Star: 8 Star
- Memo: "Daily team energy bonus — 8 Star (L1 10% + L2 5% + L3 4% + L4 3% + L5 2% + L6 1% + L7 0.5% + L8 0.5%)"
- Stacked across 8 levels — root earns from all 8 levels of downline yield

### Root Team Energy Calculation:
- Root at 8 Star qualifies for levels 1-8
- Per-level rates: L1=10%, L2=5%, L3=4%, L4=3%, L5=2%, L6=1%, L7=0.5%, L8=0.5%
- Each level pays: (rate% x that level's total daily yield volume)
- L1 yield: 3 users x ~$0.50/day = ~$1.50 → 10% = $0.15
- L2 yield: 9 users x ~$0.50/day = ~$4.50 → 5% = $0.225
- L3 yield: 27 users x ~$0.50/day = ~$13.50 → 4% = $0.54
- L4 yield: 81 users x ~$0.50/day = ~$40.50 → 3% = $1.215
- L5 yield: 243 users x ~$0.50/day = ~$121.50 → 2% = $2.43
- L6 yield: 729 users x ~$0.50/day = ~$364.50 → 1% = $3.645
- L7 yield: 2,187 users x ~$0.50/day = ~$1,093.50 → 0.5% = $5.4675
- L8 yield: 6,561 users x ~$0.50/day = ~$3,280.50 → 0.5% = $16.4025
- Total: ~$30.09 (matches actual credit)

### Platform-Wide Team Energy:
| Metric | Value |
|--------|-------|
| Total team_bonus transactions | 5,025 |
| Total team_bonus paid | $1,532.25 |
| Users receiving team_bonus | 1,935 |
| Users skipped (no active package / already credited) | 1,354 |

### Platform-Wide Daily Yield:
| Metric | Value |
|--------|-------|
| Total trading_yield transactions | 9,849 |
| Total trading_yield paid | $4,924.50 |
| Average yield per user | ~$0.50/day (1% of $50 package) |

### Root Final Wallet (After All Crons):
| Wallet | Balance |
|--------|---------|
| Main | $4,508,000 |
| Bonus | $3,975.09 ($15 direct + $3,930 rank + $30.09 team energy) |
| Trading | $0.50 (daily yield) |
| **Total** | **$4,511,975.59** |

### Root Complete Income Breakdown:
| Source | Amount | Count |
|--------|--------|-------|
| Direct bonus (L1) | $15.00 | 3 |
| Rank rewards (1-8 Star) | $3,930.00 | 8 |
| Team energy bonus (8 Star) | $30.09 | 1 |
| Trading yield | $0.50 | 1 |
| **Total income** | **$3,975.59** | **13** |

### Platform-Wide Total Compensation:
| Type | Amount | Transactions |
|------|--------|-------------|
| Direct bonus | $49,300 | 9,860 |
| Rank rewards | $107,460 | 4,919 |
| Team energy bonus | $1,532.25 | 5,025 |
| Trading yield | $4,924.50 | 9,849 |
| **Grand total** | **$163,216.75** | **29,653** |

---

## Summary Table

| Closing | Level | Users Activated | Cost ($50/user) | Income to Main | Wallet Balance | Active Total |
|---------|-------|----------------|-----------------|----------------|----------------|--------------|
| 0       | L0    | 1              | $50             | $0             | $99,950        | 1            |
| 1       | L1    | 3              | $150            | $25            | $4,999,850 main / $25 bonus | 4            |
| 2       | L2    | 9              | $450            | $20            | $4,999,400 main / $25 bonus | 13           |
| 3       | L3    | 27             | $1,350          | $50            | $4,998,050 main / $95 bonus | 40           |
| 4       | L4    | 81             | $4,050          | $100           | $4,994,000 main / $95 bonus | 121          |
| 5       | L5    | 243            | $12,150         | $250           | $4,981,850 main / $345 bonus | 364          |
| 6       | L6    | 729            | $36,450         | $500           | $4,945,400 main / $845 bonus | 1,093        |
| 7       | L7    | 2,187          | $109,350        | $1,000         | $4,836,050 main / $1,845 bonus | 3,280     |
| 8       | L8    | 6,561          | $328,050        | $2,000         | $4,508,000 main / $3,845 bonus / $0.50 trading | 9,841 |
| 9       | L9    | 19,683         | $984,150        | —              | DEFERRED       | —            |
| 10      | L10   | 59,049         | $2,952,450      | —              | DEFERRED       | —            |

### Daily Totals (L0-L8):
- Total activated: 9,841 users
- Total cost: $492,000
- Total root income: $3,945.50
- Root final wallet: $4,508,000 main + $3,845 bonus + $0.50 trading = $4,511,845.50
- Platform-wide: $49,225 direct bonuses + $94,980 rank rewards = $144,205 total compensation