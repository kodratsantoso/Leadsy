# Lark Base Field Type Guide for Leadsy Leads

Last updated: 2026-05-27

This guide defines the recommended Lark Base field types for manual Leadsy Leads sync.

## Recommended Table Setup

| Leadsy field | Leadsy source type | Recommended Lark Base field type | Notes |
| --- | --- | --- | --- |
| `leadsy_id` | bigint/string identity | Text | Keep as text to avoid number formatting and to preserve exact identity matching. |
| `company_name` | string | Text | Recommended as the primary/index field. |
| `website` | string URL | Hyperlink / URL | Text is acceptable as a fallback, but URL gives clickable links. |
| `email` | string email | Email | Text is acceptable if the data is not always a valid email address. |
| `phone` | string phone | Phone number | Keeps phone formatting and click-to-call behavior in Base. |
| `address` | text | Text | Use Location only if a dedicated geolocation mapping is implemented. |
| `business_category` | string | Text | Use Single select only when categories are already controlled options in Lark. |
| `lead_score` | integer | Number | Avoid Text unless the backend type coercion is enabled. |
| `qualification_status` | enum-like string | Single select | Recommended options: `pending`, `potential`, `eligible`, `not_eligible`, `not eligible`, `need_review`. |
| `funnel_stage` | related stage name | Single select or Text | Single select is cleaner if stage names are stable; Text is safer while stages are changing. |
| `owner` | related user display name | Text | Use Person only after Leadsy users are mapped to Lark `open_id` values. |
| `external_place_id` | string identifier | Text | Do not use Number because external IDs are not numeric values. |
| `lat`, `lng` | decimal | Number | Only needed if these fields are added to the Lark mapping. |
| `estimated_closing_amount` | decimal | Currency / Number | Only needed if revenue fields are added to the Lark mapping. |
| `created_at`, `updated_at` | datetime | Date | Only needed if timestamps are added to the Lark mapping. |

## Sync Safety Rules

- Avoid Formula, Lookup, Button, Auto Number, Created By, Modified By, and Link fields for direct Leadsy writes.
- Person fields should not be used for `owner` until the system stores a reliable Leadsy User to Lark User ID mapping.
- Single select and Multi select fields require Lark-side options to exist or be accepted by the Base configuration.
- The first Lark Base column is the index field. Use `company_name` as Text for the lowest-friction setup.
- Backend sync now reads Lark field metadata before Push to Lark and coerces values to the Lark field type to prevent conversion errors such as `TextFieldConvFail`.

## Current Backend Coercion

| Lark field type | Leadsy sync behavior |
| --- | --- |
| Text / Email / Barcode | Converts scalar values to string. |
| Number / Currency / Progress / Rating | Sends numeric values only. |
| Single select | Sends a string value. |
| Multi select | Sends an array of strings. |
| Date | Sends millisecond timestamp when value can be parsed. |
| Checkbox | Sends boolean. |
| Phone | Sends string. |
| Hyperlink / URL | Sends `{ link, text }`. |

