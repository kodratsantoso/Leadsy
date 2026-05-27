# Integration Platform Credential Matrix

> Last updated: 2026-05-27  
> Scope: Lead Generator social, ads, CRM, automation, enrichment, and event integration setup.

## Principles

- Do not use one generic credential form for every platform. Each provider has different auth, account identity, webhook, and approval requirements.
- OAuth login buttons should only start an official authorization URL when Client ID and Redirect URI are configured.
- Connection tests must use official endpoints when a safe lightweight endpoint exists. If a platform can only be verified through webhook delivery or app-review-gated flows, Leadsy reports a setup check instead of pretending a live API test succeeded.
- Secrets must be stored through encrypted settings or the Integration Hub credential vault, never returned raw to the browser.

## Platform Matrix

| Platform | Primary Auth | Required Setup Fields | Lightweight Test / Preview | Notes |
|---|---|---|---|---|
| Facebook Lead Ads | Meta OAuth + Page Access Token | App ID, App Secret, Page Access Token, Page ID, Webhook Verify Token, Redirect URI | Graph API v25 `debug_token` token validation | Lead ingestion should subscribe to Page `leadgen` events and fetch lead details from Graph API after webhook receipt. |
| Instagram Graph API | Meta OAuth + Page Access Token | App ID, App Secret, Page Access Token, Facebook Page ID, Instagram Business Account ID, Webhook Verify Token, Redirect URI | Graph API v25 `debug_token` token validation | Requires a professional Instagram account connected to a Facebook Page. DM/comment/lead capabilities require correct Meta permissions and app review. |
| TikTok Business API | TikTok Marketing API OAuth | App ID, Secret, Access Token, Advertiser ID, Redirect URI | `/oauth2/advertiser/get/` | Lead Generation Ads ingestion should verify advertiser access before webhook/lead sync activation. |
| YouTube Analytics | Google OAuth 2.0 | Client ID, Client Secret, Access Token, Refresh Token, Channel ID, Redirect URI | Google OAuth `tokeninfo` | YouTube Reporting/Analytics does not support service-account flow for private user analytics. |
| LinkedIn Marketing | LinkedIn OAuth + approved Lead Sync API access | Client ID, Client Secret, Access Token, Ad Account ID, Organization URN, Redirect URI | Setup check until approved API access is confirmed | Uses `r_marketing_leadgen_automation` for Lead Sync plus account/page scopes where applicable; LinkedIn Lead Sync access is gated by approval. |
| Google Ads Lead Forms | Webhook `google_key` or Google Ads API OAuth | Webhook mode: Google Key. API mode: Developer Token, Customer ID, Access Token, Refresh Token | Setup check for webhook key; Google OAuth token test for API token | Webhook payloads should validate `google_key` before processing. |
| Mekari Qontak | Bearer token | Base URL, Access Token, Channel ID | Setup check until concrete endpoint is selected | Qontak is used for qualified lead handoff to WhatsApp/omnichannel flows. |
| HubSpot CRM | OAuth or Private App Access Token | Access Token, Client ID, Client Secret, Hub ID, Redirect URI | CRM contacts list with bearer token | Private app tokens and OAuth both use bearer authorization. |
| Salesforce | Connected App OAuth | Client ID, Client Secret, Access Token, Refresh Token, Instance URL, Redirect URI | `/services/oauth2/userinfo` | Instance URL comes from OAuth token exchange and must be stored per connected org. |
| Pipedrive | API token or OAuth | API Domain, API Token, Access Token, Client ID, Client Secret, Redirect URI | User/profile endpoint; preview persons | API token requests use `x-api-token`; OAuth requests use bearer token. |
| Zapier | Catch Hook URL | Webhook URL, optional Basic Auth username/password | URL validation only | Leadsy should not POST tests automatically because that can trigger live Zaps. |
| Make | Custom Webhook URL | Webhook URL, optional `x-make-apikey` | URL validation only | Make supports optional API key authentication and payload structure validation. |
| Hunter.io | API key | API Key | Account endpoint; preview account data | Hunter API supports email verifier, domain search, finder, enrichment, and account endpoints. |

## Official Documentation References

- Meta / Instagram Graph API: `https://developers.facebook.com/docs/instagram-api/`
- Meta Lead Ads / Marketing API: `https://developers.facebook.com/docs/marketing-api/guides/lead-ads/`
- TikTok Business API: `https://business-api.tiktok.com/portal/docs`
- YouTube Analytics OAuth: `https://developers.google.com/youtube/reporting/guides/authorization`
- LinkedIn Lead Sync: `https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync?view=li-lms-2026-05`
- Google Ads Lead Form Webhook: `https://developers.google.com/google-ads/webhook/docs/implementation`
- HubSpot auth: `https://developers.hubspot.com/docs/api/intro-to-auth`
- Salesforce OAuth: `https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_flows.htm`
- Pipedrive auth: `https://pipedrive.readme.io/docs/core-api-concepts-authentication`
- Mekari Qontak docs: `https://docs.qontak.com/`
- Zapier webhooks: `https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks`
- Make webhooks: `https://apps.make.com/gateway`
- Hunter API: `https://help.hunter.io/en/articles/1970956-hunter-api`

## Current Implementation Boundary

- Credential fields are platform-specific in Settings -> Integration Setting.
- OAuth buttons generate authorization URLs for OAuth-capable providers when Client ID and Redirect URI are configured.
- Connection tests are active for Meta token debug, TikTok advertiser authorization, Google OAuth token info, HubSpot bearer contacts, Salesforce userinfo, Pipedrive user profile, Hunter account, and setup checks for webhook-only/manual platforms.
- Data preview is active for HubSpot contacts, Pipedrive persons, and Hunter account data.
- Provider webhook ingestion and OAuth callback token exchange remain the next backend phases.
