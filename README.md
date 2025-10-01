# WhatsApp Business API Toolkit

NestJS service that exposes a ready-to-use WhatsApp Business (Cloud) API webhook and helper endpoints for sending outbound messages.

## Prerequisites

- Node.js 18+
- npm 9+
- A WhatsApp Business Cloud API setup with a phone number ID and a permanent access token

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Server port (defaults to `3000`). |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Yes | Token you configure in the Meta Developer Portal for webhook verification. |
| `WHATSAPP_ACCESS_TOKEN` | Yes | Long-lived WhatsApp Cloud API access token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Phone number ID that sends messages. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Optional | Business Account (WABA) ID. Needed for template listing. |
| `WHATSAPP_APP_SECRET` | Optional | App secret used to validate webhook signatures. |
| `WHATSAPP_API_VERSION` | No | Graph API version (defaults to `v17.0`). |

## Getting started

```bash
npm install
npm run start:dev
```

By default the API is served under `http://localhost:3000/api`.

## Webhook endpoints

- `GET /api/webhook` – Verification endpoint. Meta sends `hub.mode`, `hub.challenge`, and `hub.verify_token`. Returns the challenge when the token matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- `POST /api/webhook` – Receives WhatsApp events (`messages`, `statuses`, template status updates). If `WHATSAPP_APP_SECRET` is supplied the request signature is validated against `X-Hub-Signature-256`.

Inbound messages are automatically marked as read. Console logs show message, status, and template updates so you can plug in your own handlers easily.

## Outbound messaging endpoints

All endpoints live under `/api/messages` and expect JSON bodies.

| Endpoint | Purpose |
| --- | --- |
| `POST /text` | Send a simple text message (`{ "to": "<wa_id>", "body": "Hello" }`). |
| `POST /template` | Send a template message with optional components. |
| `POST /media` | Send media by link or media ID (image, video, audio, document, sticker). |
| `POST /interactive` | Send interactive message payloads (list, buttons, product, etc.). |
| `POST /custom` | Send a fully custom payload merged with `messaging_product: "whatsapp"`. |
| `POST /mark-read` | Mark an incoming message as read. |
| `GET /profile` | Fetch the business profile for the configured phone number. |
| `GET /templates` | List message templates (requires `WHATSAPP_BUSINESS_ACCOUNT_ID`). |

Sample request:

```http
POST /api/messages/text
Content-Type: application/json

{
  "to": "15551234567",
  "body": "Hello from NestJS",
  "previewUrl": false
}
```

## Webhook subscription steps (Meta UI)

1. Deploy this service and expose `POST /api/webhook` publicly (e.g. with ngrok while developing).
2. In the Meta Developer Portal, create/choose your app and go to **WhatsApp > Configuration**.
3. Add the public webhook URL and set the verify token to the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
4. Subscribe to `messages`, `message_template_status_update`, and `message_template_category_update` events.
5. Click **Verify and Save**. The challenge response confirms everything is wired correctly.

## Notes

- All outbound calls use the configured `WHATSAPP_API_VERSION`; bump it as Meta releases new versions.
- Errors from the Graph API are surfaced with the original payload to help debugging.
- Extend `WebhookService` to pipe events into your own business logic, queue, or database.
- Remember to secure public deployment with HTTPS and proper authentication in front of the send-message endpoints.
