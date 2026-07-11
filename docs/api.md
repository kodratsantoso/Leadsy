# Leadsy API Integration

This document outlines how to programmatically interact with the Leadsy API. Currently, this focuses on authenticating and pushing new leads from external platforms (such as Lark Base, Make, Zapier, etc.) into Leadsy.

## Authentication (Bearer Token)

The Leadsy API uses Laravel Sanctum for API token authentication. To authenticate your requests, you must include an `Authorization` header containing your Bearer token.

### How to get an API Token

Since integrations require long-lived tokens, an administrator can generate a dedicated `Integration Token` for your user account via the Leadsy backend command line interface (CLI).

Run this command inside the `backend` directory of your Leadsy deployment:

```bash
php artisan integration:generate-token your-email@example.com
```

**Example Output:**
```
Successfully generated Bearer token for John Doe (john@example.com).
Make sure to copy the token below now. You won't be able to see it again!

Token: 3|KSVvAJdNOfCQnnx6L5CucAdQbwtI9G0LQoRU015r5d5e7fde

Use this token in your Authorization header:
Authorization: Bearer 3|KSVvAJdNOfCQnnx6L5CucAdQbwtI9G0LQoRU015r5d5e7fde
```

Keep this token secure.

---

## Create a New Lead

**Endpoint:** `POST /api/leads`

Push a new lead into the Leadsy system. This is useful for automating lead ingestion from forms, Lark Base, or spreadsheets.

### Request Headers

| Header | Value |
| :--- | :--- |
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |
| `Authorization` | `Bearer <YOUR_API_TOKEN>` |

### Request Body Schema

The body must be a JSON object containing the lead's information.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `company_name` | String | **Yes** | The name of the company or prospect. |
| `email` | String | No | Contact email address. |
| `phone` | String | No | Contact phone number. |
| `website` | String | No | Company website URL. |
| `address` | String | No | Physical address. |
| `brand` | String | No | Brand name, if different from company name. |
| `company_size_estimate` | String | No | E.g. "1-50", "1000+". |
| `business_category` | String | No | E.g. "B2B Software", "Manufacturing". |
| `estimated_closing_amount`| Number | No | Estimated deal value. |
| `source_type` | String | No | e.g. `manual`, `website`, `lark_base`. Default is `manual`. |

> [!NOTE]
> Leadsy's **Auto Enrichment** feature works best when `company_name`, `website`, and `address` are provided. Even if you only have the company name, AI Enrichment will try to fill the rest.

### Payload Example

```json
{
  "company_name": "PT. Nusantara Teknologi",
  "website": "https://nusantaratek.co.id",
  "email": "contact@nusantaratek.co.id",
  "phone": "+628111222333",
  "address": "Sudirman Central Business District",
  "source_type": "lark_base",
  "company_size_estimate": "51-200"
}
```

### Response Example

```json
{
  "data": {
    "id": 105,
    "company_name": "PT. Nusantara Teknologi",
    "website": "https://nusantaratek.co.id",
    "website_domain": "nusantaratek.co.id",
    "email": "contact@nusantaratek.co.id",
    "phone": "+628111222333",
    "address": "Sudirman Central Business District",
    "qualification_status": "pending",
    "lead_score": 0,
    "created_at": "2026-07-11T03:30:00.000000Z",
    "updated_at": "2026-07-11T03:30:00.000000Z"
  }
}
```

---

## Sample Code: Pushing Data to Leadsy

### Example 1: cURL (Testing locally)

```bash
curl -X POST https://api.your-leadsy-domain.com/api/leads \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \
  -d '{
    "company_name": "PT. Nusantara Teknologi",
    "website": "https://nusantaratek.co.id",
    "email": "contact@nusantaratek.co.id",
    "source_type": "lark_base"
  }'
```

### Example 2: Node.js (Lark Base Automation Script)

If you are writing a custom Automation Script in Lark Base to push a new row to Leadsy:

```javascript
// Replace with your actual Leadsy backend URL and Token
const LEADSY_API_URL = "https://api.your-leadsy-domain.com/api/leads";
const API_TOKEN = "YOUR_INTEGRATION_TOKEN_HERE";

// Example payload using data from a Lark Base row
const payload = {
    company_name: "Lark Base Company",
    email: "hello@larkcompany.com",
    phone: "08123456789",
    source_type: "lark_base"
};

async function pushToLeadsy() {
    try {
        const response = await fetch(LEADSY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Failed to create Lead:", data);
        } else {
            console.log("Lead created successfully. Leadsy ID:", data.data.id);
        }
    } catch (error) {
        console.error("Network or script error:", error);
    }
}

pushToLeadsy();
```
