# Investment & Referral Platform Development Blueprint (Final Master Blueprint)

> **Purpose:** This document is the authoritative development
> specification for Cloud Code. Every module, API, UI, database
> collection, and workflow should follow this blueprint.

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React (Vite)
-   React Router DOM
-   React Context API (No Redux)
-   TanStack Query (React Query)
-   Axios
-   React Hook Form
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   ApexCharts
-   React Hot Toast
-   Lucide Icons

## Backend

-   Node.js
-   Express.js
-   MongoDB
-   Mongoose
-   JWT Authentication
-   bcrypt
-   Zod Validation
-   Winston Logger
-   Morgan
-   Helmet
-   CORS
-   Express Rate Limit
-   node-cron

## Third Party Services

-   NOWPayments (Deposits)
-   SMTP Email Service
-   Swagger
-   PM2
-   NGINX

------------------------------------------------------------------------

# Core Vision

Develop a secure, scalable, premium investment platform inspired by
modern arbitrage platforms featuring:

-   Premium UI/UX
-   Fully Mobile Responsive
-   Light & Dark Themes
-   Dynamic Administration
-   Accurate Financial Calculations
-   Immutable Financial Ledger
-   Modular Architecture
-   High Performance
-   Excellent User Experience
-   Future Scalability

------------------------------------------------------------------------

# Global Design Standards

## Theme Engine

-   Light Theme
-   Dark Theme
-   Theme preference stored per user
-   Theme persists after login
-   CSS Variables only
-   No hardcoded colors

## UI Standards

Every page must contain:

-   Breadcrumb
-   Title
-   Search
-   Filters
-   Pagination
-   Skeleton Loading
-   Empty State
-   Error State
-   Success/Error Toast
-   Confirmation Modal

------------------------------------------------------------------------

# Responsive Design Standards (Mandatory)

The Website, User Panel and Admin Panel must be fully mobile-first and
responsive.

Supported Devices:

-   Mobile Phones
-   Tablets
-   Laptops
-   Desktop
-   Ultra-wide Displays

Requirements:

-   Mobile-first development
-   Responsive Grid/Flex layouts
-   Responsive Typography
-   Responsive Tables
-   Responsive Forms
-   Responsive Charts
-   Responsive Sidebar
-   Off-canvas Mobile Navigation
-   Touch-friendly controls (44x44px minimum)
-   Lazy-loaded images
-   Responsive modals
-   Cross-browser compatibility
-   No horizontal scrolling
-   Lighthouse Performance target: 90+
-   Accessibility target: 95+

No feature is considered complete until tested on mobile, tablet and
desktop.

------------------------------------------------------------------------

# Project Modules

-   Public Website
-   Authentication
-   User Panel
-   Admin Panel
-   Wallet System
-   Deposit Module
-   Withdrawal Module
-   Compensation Engine
-   Bonanza Engine
-   Reports
-   CMS
-   Settings
-   Notifications
-   Email Engine
-   Security
-   Logs

------------------------------------------------------------------------

# Development Phases

## Phase 1 - Foundation

-   Project Setup
-   MongoDB Configuration
-   Mongoose Models
-   Authentication
-   Authorization
-   Global Error Handler
-   Logging
-   Swagger
-   Theme Engine
-   Shared Components

## Phase 2 - Website

-   Home
-   About
-   Compensation Plan
-   FAQ
-   Contact
-   Login
-   Register
-   Forgot Password
-   Terms
-   Privacy

Dynamic CMS: - Logo (Light/Dark) - Footer - Header - Contact Details -
Social Links - SEO - Announcement Bar - Maintenance Mode

## Phase 3 - Authentication

-   Registration
-   Referral Validation
-   Email Verification
-   Welcome Email
-   JWT Login
-   Refresh Tokens
-   Forgot Password
-   Password Reset

## Phase 4 - User Dashboard

-   Dashboard Summary
-   Wallet
-   Package
-   Rank
-   Trading Income
-   Direct Bonus
-   Team Bonus
-   Community Bonus
-   Rank Reward
-   Bonanza Reward
-   Notifications
-   Charts
-   Referral Link

## Phase 5 - User Profile

-   Personal Details
-   Wallet Addresses
-   Password
-   Theme Preference
-   Notification Preference

## Phase 6 - Package Module

-   Package Activation
-   Package History
-   Status

## Phase 7 - Deposit Module

NOWPayments Integration

Flow: Package → Invoice → Payment → Webhook Verification → Package
Activation → Ledger Entry → Email → Notification

## Phase 8 - Wallet System

-   Main Wallet
-   Bonus Wallet
-   Trading Wallet
-   Available Balance
-   On Hold Balance
-   Wallet Ledger
-   Wallet History

## Phase 8A - Withdrawal Module

Manual Admin Approval Only.

User Features: - Submit Withdrawal - Track Status - History

Statuses: - Pending - Under Review - Approved - Rejected - Paid -
Cancelled

Admin Features: - Approve - Reject - Mark Paid - Remarks - Reports

Financial Logic: - Move funds from Available Balance to On Hold
Balance - Paid → Deduct permanently - Rejected → Return to Available
Balance

## Phase 9 - Referral Engine

-   Referral Code
-   Referral Link
-   Referral Tree
-   Team Statistics

## Phase 10 - Compensation Engine

Income Streams:

1.  Trade Yield (1--2% Daily)

2.  Direct Connect Bonus (10%)

3.  Daily Team Energy Bonus

4.  Community Monthly Bonus

5.  Rank Reward Bonus

6.  Bonanza Offer Engine

Bonanza is fully dynamic.

Admin Configurable: - Offer Name - Required Directs - Reward Amount -
Start Date - End Date - Status - Terms

Examples: - 3 Directs → \$10 - 5 Directs → \$30 - 10 Directs → \$60 - 20
Directs → \$100

Automatic tracking, wallet credit, ledger, notification and email.

## Phase 11 - Reports

User: - Deposits - Withdrawals - Wallet - Trading - Direct - Team -
Community - Rank - Bonanza

Admin: - Users - Deposits - Withdrawals - Income - Wallet - Gateway -
Bonanza - Activity

Export: - CSV - Excel - Print

## Phase 12 - Notifications

-   Dashboard
-   Email
-   Announcements
-   Income Alerts
-   Withdrawal Alerts
-   Bonanza Alerts

## Phase 13 - Email Engine

-   Registration
-   Verification
-   Forgot Password
-   Deposit Success
-   Withdrawal Updates
-   Rank Achievement
-   Bonanza Earned

## Phase 14 - Admin Panel

Dashboard

User Management

Wallet Management

Compensation Settings

Bonanza Management

CMS

Reports

SMTP Settings

NOWPayments Settings

Security

Logs

## Phase 15 - Security

-   JWT
-   Refresh Tokens
-   Role Permissions
-   Helmet
-   Rate Limiting
-   Input Validation
-   Audit Logs
-   Webhook Verification

## Phase 16 - Performance

-   Lazy Loading
-   Pagination
-   Optimized Queries
-   Background Jobs
-   Code Splitting

## Phase 17 - MongoDB Collections

Master: - users - settings - packages - ranks - bonanza_offers -
cms_pages - announcements - email_templates

Transactions: - deposits - withdrawal_requests - wallet_transactions -
trading_income - direct_income - team_bonus - community_bonus -
rank_rewards - bonanza_rewards - notifications - payment_logs -
cron_logs - activity_logs

## Phase 18 - Cron Jobs

-   Daily Trading
-   Daily Team Bonus
-   Monthly Community Bonus
-   Rank Checker
-   Bonanza Checker
-   Payment Verification
-   Email Queue
-   Notification Queue

## Phase 19 - Error Handling

-   Global Exception Handler
-   Validation Errors
-   Payment Errors
-   Gateway Errors
-   Retry Logic
-   401 / 403 / 404 / 500
-   Maintenance Mode

## Phase 20 - Quality Assurance

-   API Testing
-   Payment Testing
-   Compensation Testing
-   Withdrawal Testing
-   Security Testing
-   Responsive Testing
-   Regression Testing

------------------------------------------------------------------------

# Development Principles

-   No Redux
-   MongoDB + Mongoose
-   React Context API + React Query
-   Feature-based architecture
-   Fully Dynamic Admin Configuration
-   Immutable Financial Ledger
-   MongoDB Transactions for financial operations
-   Premium Arbitrage-inspired UI
-   Light/Dark Theme
-   Fully Mobile Responsive
-   Manual Withdrawal Approval
-   Dynamic Bonanza Offers
-   Production-ready coding standards
-   Clean, reusable and scalable codebase

------------------------------------------------------------------------

# Final Goal

Deliver a secure, high-performance, production-ready investment platform
that is scalable, user-friendly, fully responsive, visually modern, and
architected for long-term maintainability.
