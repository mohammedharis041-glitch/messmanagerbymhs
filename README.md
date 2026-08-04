# Room Ledger

You are a senior full-stack engineer, UI/UX designer, and software architect.

Build a production-ready Progressive Web App (PWA) called **Mess Manager Pro**. This application must later be convertible into Android (APK) and iOS (IPA) using Capacitor without major code changes.

DO NOT create a prototype.
DO NOT use dummy data.
DO NOT create fake logins.
Every button, screen, and feature must be fully functional.

--------------------------------------------------------
TECH STACK
--------------------------------------------------------

Use:

• React 19
• TypeScript
• Vite
• Tailwind CSS
• shadcn/ui
• React Query (TanStack Query)
• React Hook Form
• Zod Validation
• Firebase Authentication
• Firebase Cloud Firestore
• Firebase Storage
• Firebase Cloud Messaging (FCM)
• Progressive Web App (PWA)
• Capacitor Compatible
• Responsive Design
• Material Design 3
• Dark Mode & Light Mode

The application must work perfectly on:

Desktop

Tablet

Android

iPhone

--------------------------------------------------------
AUTHENTICATION
--------------------------------------------------------

Use Firebase Authentication.

Support:

• Google Sign-In

• Email & Password

• Anonymous Guest Mode (optional)

Automatically redirect authenticated users to their dashboard.

Never allow unauthorized access.

--------------------------------------------------------
ROLE BASED ACCESS CONTROL (RBAC)
--------------------------------------------------------

Implement complete RBAC.

Roles:

1. Super Admin

2. Room Owner

3. Admin

4. Member

--------------------------------------------------------
SUPER ADMIN
--------------------------------------------------------

My Google account should automatically become Super Admin during initial setup.

(Replace this email)

YOUR_GOOGLE_EMAIL@gmail.com

Super Admin Permissions:

• View every room

• View every user

• Delete rooms

• Create rooms

• Disable rooms

• Transfer ownership

• Manage subscriptions

• Restore deleted data

• Manage backups

• View analytics

• Send announcements

• Promote users

• Demote users

• Block users

• Manage Firestore data

• Manage Storage

• Manage settings

--------------------------------------------------------
ROOM OWNER
--------------------------------------------------------

Can:

Create Room

Invite Members

Delete Members

Close Month

Manage Wallet

Generate Reports

Manage Settings

Transfer Ownership

--------------------------------------------------------
ADMIN
--------------------------------------------------------

Can:

Add Expense

Edit Expense

Delete Expense

Add Members

Manage Advances

Generate Reports

Cannot delete room.

--------------------------------------------------------
MEMBER
--------------------------------------------------------

Can:

View Expenses

Add Expenses

View Reports

View Wallet

Cannot edit room settings.

--------------------------------------------------------
MULTI ROOM SUPPORT
--------------------------------------------------------

Every room has:

Unique Room ID

Unique Invite Code

Room Name

Currency

Timezone

Wallet

Members

Reports

History

Settings

Users should only access rooms they belong to.

--------------------------------------------------------
DASHBOARD
--------------------------------------------------------

Beautiful animated dashboard.

Show:

Current Wallet Balance

Opening Balance

Remaining Cash

Monthly Expense

Monthly Income

Pending Settlement

Members

Charts

Recent Expenses

Current Month

--------------------------------------------------------
EXPENSE MANAGEMENT
--------------------------------------------------------

Features:

Add Expense

Edit Expense

Delete Expense

Duplicate Expense

Attach Receipt

Upload Images

Search

Filter

Categories

OCR Ready

--------------------------------------------------------
CATEGORIES
--------------------------------------------------------

Groceries

Vegetables

Chicken

Fish

Milk

Gas

Water

Cleaning

Electricity

Internet

Transportation

Snacks

Miscellaneous

Custom Categories

--------------------------------------------------------
ADVANCE MANAGEMENT
--------------------------------------------------------

Record advances.

Track:

Advance Paid

Advance Used

Remaining Advance

Advance History

--------------------------------------------------------
MESS WALLET
--------------------------------------------------------

Wallet should show:

Opening Balance

Cash Holder

Remaining Cash

Monthly Fund

Advance Fund

Carry Forward Balance

Closing Balance

Wallet History

--------------------------------------------------------
MONTHLY CONTRIBUTION
--------------------------------------------------------

Allow owner to define:

Monthly Contribution

Examples:

AED 100

AED 200

AED 300

AED 500

AED 1000

Track:

Paid

Pending

Overdue

--------------------------------------------------------
MONTHLY SETTLEMENT
--------------------------------------------------------

Automatically calculate:

Total Expense

Per Person Share

Balance

Who Pays

Who Receives

Generate minimum payment transfers.

Example:

Haris → Nihad AED 101

Anees → Nihad AED 149

Siyab → Nihad AED 287

Automatically generate settlement instructions.

--------------------------------------------------------
MONTH CLOSING
--------------------------------------------------------

Close Current Month

Automatically:

Generate Reports

Archive Expenses

Lock Previous Month

Carry Wallet Forward

Generate Settlement

Create Next Month

--------------------------------------------------------
REPORTS
--------------------------------------------------------

Generate:

Professional PDF

CSV

Excel

Printable Version

WhatsApp Share

Email Share

--------------------------------------------------------
ANALYTICS
--------------------------------------------------------

Charts:

Pie Chart

Bar Chart

Monthly Trend

Category Spending

Member Spending

Wallet Trend

Cash Flow

Expense Growth

--------------------------------------------------------
SEARCH
--------------------------------------------------------

Global Search

Search by:

Member

Expense

Month

Category

Amount

Receipt

--------------------------------------------------------
FILTERS
--------------------------------------------------------

Today

Yesterday

Week

Month

Year

Category

Member

Room

--------------------------------------------------------
NOTIFICATIONS
--------------------------------------------------------

Firebase Cloud Messaging

Notify:

Expense Added

Expense Edited

Settlement Ready

Month Closed

Member Joined

Backup Completed

Sync Failed

--------------------------------------------------------
CLOUD SYNC
--------------------------------------------------------

Keep Firestore as cloud database.

Offline-first architecture.

Room-style local caching for web.

Background Sync

Conflict Resolution

Automatic Retry

No Data Loss

--------------------------------------------------------
BACKUP
--------------------------------------------------------

Automatic Backup

Manual Backup

Restore Backup

Export JSON

Export CSV

Export PDF

--------------------------------------------------------
SECURITY
--------------------------------------------------------

Firestore Security Rules

Authenticated Access

Room Isolation

Server Timestamps

Soft Delete

Audit Logs

Input Validation

--------------------------------------------------------
UI DESIGN
--------------------------------------------------------

Premium Material Design 3

Rounded Cards

Modern Dashboard

Beautiful Typography

Soft Shadows

Subtle Glass Effects

Responsive Layout

Dark Mode

Light Mode

Dynamic Color

Professional Look

--------------------------------------------------------
ANIMATIONS
--------------------------------------------------------

Use premium Material Motion.

Bottom Navigation:

Selected tab smoothly scales to 112%.

Sliding indicator.

Fade label.

Smooth icon animation.

Page Transition:

Horizontal Slide

Fade

Scale 98% → 100%

250–300ms

FastOutSlowInEasing

Cards:

Fade In

Slide Up

Stagger Animation

Buttons:

Ripple

Scale

Elevation Animation

Dialogs:

Scale

Fade

Blur Background

Charts:

Animated rendering

Lists:

Animated insertion

Animated removal

Smooth scrolling

Maintain consistent 60 FPS (or higher on high-refresh-rate devices).

--------------------------------------------------------
PERFORMANCE
--------------------------------------------------------

Lazy Loading

Virtual Lists

Optimized Firestore Queries

Code Splitting

Image Compression

Memoization

Avoid unnecessary re-renders

Fast startup

No frame drops

--------------------------------------------------------
PWA
--------------------------------------------------------

Installable

Offline Support

Push Notifications

Splash Screen

App Icon

Background Sync

Works like a native application

--------------------------------------------------------
CAPACITOR READY
--------------------------------------------------------

Design architecture so the same codebase can be converted into:

Android APK

Android AAB

iOS IPA

without changing business logic.

Avoid browser-only APIs unless compatible with Capacitor.

--------------------------------------------------------
CODE QUALITY
--------------------------------------------------------

Strict TypeScript

Component-based architecture

Reusable components

Hooks

React Query

Clean Folder Structure

No duplicate code

No deprecated APIs

Production-ready

--------------------------------------------------------
IMPORTANT

Analyze before generating code.

Do not regenerate existing features unnecessarily.

Every feature must be functional.

No placeholders.

No unfinished screens.

No prototype implementations.

Every form, button, report, authentication flow, cloud sync, and calculation must work correctly.

The application should be production-ready, scalable, secure, responsive, and suitable for deployment with Firebase Hosting and later packaging into Android and iOS apps using Capacitor.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://messmanagerbymhs.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2c5eb5cf-ef05-41db-a097-7cbce16eaeb0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
