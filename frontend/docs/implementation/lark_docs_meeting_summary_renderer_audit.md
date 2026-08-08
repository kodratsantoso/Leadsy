# Lark Docs Meeting Summary Renderer Audit

This document reviews the current Leadsy architecture for AI Meeting Summaries and Lark Docs synchronization.

## 1. Existing Components

| Capability | Existing Component | Actual Path | Decision |
|---|---|---|---|
| Meeting Summary source | `LeadTranscript` and `LeadAiEvaluation` models | [LeadTranscript.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Models/LeadTranscript.php) | **REUSE** |
| AI result parser | `MeetingSummaryGenerationService` | [MeetingSummaryGenerationService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/Sales/MeetingSummaryGenerationService.php) | **REUSE** |
| Lark API client | `LarkService` | [LarkService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/Lark/LarkService.php) | **REUSE** |
| Doc creation | `LarkDriveService::createDoc` | [LarkDriveService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/Lark/LarkDriveService.php) | **REUSE** |
| Block creation | `LarkDriveService::writeDocContent` | [LarkDriveService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/Lark/LarkDriveService.php) | **NEEDS_EXTENSION** (To support Tables, Grids, and Meeting-specific custom layouts natively) |
| Image upload | `LarkBaseService::uploadAttachment` | [LarkBaseService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/Lark/LarkBaseService.php) | **REUSE** |
| Chart rendering | None / Dynamic PDF rendering via pdftoppm | [SyncMeetingSummaryToLarkJob.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Jobs/SyncMeetingSummaryToLarkJob.php) | **REUSE** (Leverages pdftoppm generated PNGs as the high-fidelity chart images uploaded to Lark) |
| Lark folder configuration | `LarkDriveService::getOrCreateLeadFolder` | [LarkDriveService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/Lark/LarkDriveService.php) | **REUSE** |
| Background job | `SyncMeetingSummaryToLarkJob` | [SyncMeetingSummaryToLarkJob.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Jobs/SyncMeetingSummaryToLarkJob.php) | **REUSE** |
| Audit logging | `AuditService` | [AuditService.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Services/AuditService.php) | **REUSE** |
| RBAC | Laravel CheckPermission Middleware / Auth | [CheckPermission.php](file:///Volumes/Data/Staging%20Developer/Leadsy/backend/app/Http/Middleware/CheckPermission.php) | **REUSE** |

## 2. Gaps & Extension Strategy
* **Lark Docs Block Variety**: We need to extend the native blocks written by `LarkDriveService` to utilize professional elements like Tables (for metadata, topics, next steps, and action items), Callouts (for conclusions), Grids (for headers and executive summary split), and upload/insert inline Image blocks of the generated PDF charts.
* **Meeting-type layout mapping**: Instead of a flat list of sections, we will build a dedicated normalized MeetingSummary ViewModel that defensive-parses the dynamic AI JSON properties depending on the meeting type (`discovery`, `demo`, `follow_up`, `proposal_discussion`, `closing_discussion`, `handover_to_csm`, or `general`).
