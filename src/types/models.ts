// ---------------------------------------------------------------------------
// Project Joy — frontend database model shapes.
//
// These are TypeScript types only. They describe the data contracts the app
// will use once a backend is connected. Nothing here queries a database or
// contains real data — all providers return placeholder/empty state.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

/** ISO-8601 timestamp (`2026-01-01T00:00:00.000Z`). */
export type ISODateTime = string;

/** Unique identifier (UUID v4 when backed by the database). */
export type ID = string;

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------

export type UserRole = "user" | "admin" | "moderator";

export interface User {
  id: ID;
  email: string;
  emailVerified: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  lastSignInAt: ISODateTime | null;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface Profile {
  id: ID;
  userId: ID;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  locale: Lang;
  timezone: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// User settings
// ---------------------------------------------------------------------------

export type ThemePreference = "system" | "light" | "dark";

export interface UserSettings {
  userId: ID;
  language: Lang;
  theme: ThemePreference;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingOptIn: boolean;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export interface Language {
  code: Lang;
  label: string;
  nativeLabel: string;
  flag: string;
  isDefault: boolean;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------

export type SearchScope = "catalog" | "daily" | "calendar" | "global";

export interface SearchHistoryEntry {
  id: ID;
  userId: ID | null;
  query: string;
  scope: SearchScope;
  resultsCount: number;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationKind =
  | "reminder"
  | "order_update"
  | "system"
  | "marketing"
  | "greeting_delivered";

export interface Notification {
  id: ID;
  userId: ID;
  kind: NotificationKind;
  titleKey: string;
  bodyKey: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Placeholder domain models (implemented later)
// ---------------------------------------------------------------------------

export interface Greeting {
  id: ID;
  userId: ID;
  title: string;
  status: "draft" | "scheduled" | "sent";
  scheduledFor: ISODateTime | null;
  createdAt: ISODateTime;
}

export interface Order {
  id: ID;
  userId: ID;
  kind: "personal" | "corporate";
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  createdAt: ISODateTime;
}

export interface Favorite {
  id: ID;
  userId: ID;
  templateId: ID;
  createdAt: ISODateTime;
}

export interface CreditWallet {
  userId: ID;
  balance: number;
  updatedAt: ISODateTime;
}