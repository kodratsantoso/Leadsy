# Lark Meeting Transcript - Existing System Audit

## 1. Existing Components Found

| Required Capability      | Existing Component          | File Path   | Reuse Decision  |
| ------------------------ | --------------------------- | ----------- | --------------- |
| Meeting Transcript model | `LeadTranscript`            | `/backend/app/Models/LeadTranscript.php` | Reuse |
| Transcript create API    | `fetchTranscriptFromLink`   | `/backend/app/Http/Controllers/Api/LeadController.php` | Extend |
| AI analysis pipeline     | `LeadEvaluationService`     | `/backend/app/Services/Sales/LeadEvaluationService.php` | Reuse unchanged |
| Lark API client          | `LarkMeetingService`        | `/backend/app/Services/Lark/LarkMeetingService.php` | Extend |
| Background worker        | `AnalyzeTranscriptJob`      | `/backend/app/Jobs/AnalyzeTranscriptJob.php` | Reuse |
| Audit log                | `AuditService::log`         | `/backend/app/Services/AuditService.php` | Reuse |
| RBAC                     | `permission:leads.edit`     | `/backend/routes/api.php` | Reuse |
| Integration settings     | `LarkIntegration`           | `/backend/app/Models/LarkIntegration.php` | Reuse |

## 2. Existing Data Model Audit

| Requested Business Data | Existing Field          | Decision     | Reason                    |
| ----------------------- | ----------------------- | ------------ | ------------------------- |
| Source type             | `source_type`           | Reuse        | Already represents source (e.g. 'meeting') |
| Source URL              | `meeting_link` on Lead  | Reuse        | Already stores the link on Lead level. Can also be in metadata JSON. |
| Meeting ID / Token      | `metadata.minute_token` | Reuse        | Evidence in LeadController/LarkMeetingService |
| Raw transcript          | `transcript_text`       | Reuse        | Already used by AI Pipeline |
| Import status           | `evaluation_status`     | Reuse        | Existing flow uses 'pending'/'analyzing'/'evaluated' |
| Error information       | Audit Log / Try-Catch   | Reuse        | Can be returned as API error on failure |

## 3. Existing Flow Trace

Current end-to-end flow for fetching a transcript from a link:

```text
Current form (frontend/app/leads/[id]/page.tsx)
→ API Route POST `/api/leads/{lead}/transcripts/fetch-link`
→ `LeadController::fetchTranscriptFromLink`
→ `LarkMeetingService::getMinuteTranscript`
→ `LeadTranscript::create()`
→ `AuditService::log()`
→ `LeadEvaluationService::evaluateTranscript` (Synchronous)
→ `MeetingSummaryGenerationService::generate`
```

## 4. Gap Analysis

| Gap                    | Why Existing Code Cannot Cover It               | Minimum Required Change                    |
| ---------------------- | ----------------------------------------------- | ------------------------------------------ |
| Parse Lark meeting URL | `LeadController::fetchTranscriptFromLink` only supports `/minutes/` URLs, not standard `/meeting/` URLs. | Add regex parser to `LeadController` for `meeting/` URLs. |
| Retrieve Meeting Transcript | `fetchTranscriptFromLink` strictly calls `getMinuteTranscript`. It fails for standard meeting IDs. | If it's a meeting ID, call `LarkMeetingService::getMeetingTranscript` instead. |
| Asynchronous Processing| `fetchTranscriptFromLink` triggers AI synchronously, which causes UI blocking and potential timeouts for long transcripts. | Dispatch `AnalyzeTranscriptJob` to background instead of evaluating synchronously. |

## 5. Proposed Change Set

### REUSE WITHOUT CHANGE
* `LeadTranscript` database schema and model.
* `LarkIntegration` configuration and auth tokens handling.
* `AnalyzeTranscriptJob` and `MeetingSummaryGenerationService` logic.
* `AuditService` event tracking structure.

### EXTEND EXISTING
* `LeadController::fetchTranscriptFromLink`:
  * Extend URL regex logic to support both `/minutes/{token}` and `/meeting/{meetingId}`.
  * Extend to call either `getMinuteTranscript()` or `getMeetingTranscript()` dynamically.
  * Update to dispatch `AnalyzeTranscriptJob` asynchronously rather than blocking the HTTP response.
* `frontend/app/leads/[id]/page.tsx`:
  * Extend validation and UI state to handle background processing gracefully (wait for AI evaluation state to update instead of relying on synchronous API response).

### ADD NEW
* Nothing genuinely absent. The core functionality already exists.

### DO NOT CHANGE
* The AI prompts in `MeetingSummaryGenerationService`.
* The RBAC middleware guard `permission:leads.edit`.
* The `LarkService` core HTTP client.
