# Smart Proposal Generator — Mock Server (Offline Demo)

Mock Express server that simulates all API endpoints. **No Clerk, Anthropic, Stripe, or database required.**

## Quick Start

```bash
cd demo/mock-server
npm install
npm start
```

Server starts at **http://localhost:3001**

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/clients` | List 5 mock LATAM clients |
| POST | `/api/clients` | Create new client (in-memory) |
| GET | `/api/clients/:id` | Get client by ID |
| POST | `/api/proposals/stream` | AI streaming via SSE (simulated) |
| GET | `/api/proposals` | List generated proposals |
| POST | `/api/proposals/:id/export` | Mock export (PDF/DOCX/email) |
| POST | `/api/onboarding` | Mock tenant onboarding |
| POST | `/api/billing/create-setup-intent` | Mock Stripe setup |

## Using with the Next.js App

Add to `apps/web/.env.local`:

```env
NEXT_PUBLIC_MOCK_API_URL=http://localhost:3001
```

Then in each API call in the wizard, point to `NEXT_PUBLIC_MOCK_API_URL` instead of the FastAPI backend.

## Fully Offline HTML Demo

For a zero-dependency demo (no server needed), open:

```
demo/offline-demo.html
```

in any browser.
