# Khalid Super Store

Luxury neighbourhood grocery store built with React + Vite on the frontend and Node.js + Express + SQLite on the backend.

## Included upgrades

- Luxury Khalid Super Store visual system:
  - Ivory `#F8F5EC`
  - Bottle green `#163A2E`
  - Deep forest `#0E2A21`
  - Aged brass `#B08D4F`
  - Restrained burgundy `#6E1F2A`
  - Fraunces + Manrope + IBM Plex Mono
- Delivery-radius banner and footer delivery note
- Cash on Delivery / Pickup
- Safepay hosted online checkout in PKR
- Server-side Safepay payment verification
- Google Sign-In
- Customer payment status and admin payment information
- Completed orders remain hidden from the customer's active dashboard

## 1. Backend

```bash
cd server
npm install
copy .env.example .env
npm run seed
npm start
```

On macOS/Linux use:

```bash
cp .env.example .env
```

Server runs at `http://localhost:4000`.

## 2. Frontend

Open another terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

## 3. Safepay setup

Create a Safepay Sandbox account, then put these in `server/.env`:

```env
SAFEPAY_ENV=sandbox
SAFEPAY_API_KEY=sec_your_public_key
SAFEPAY_SECRET_KEY=your_private_secret
```

The checkout uses Safepay's hosted checkout flow. Khalid Super Store sends the total in PKR's lowest denomination and verifies the returned tracker server-to-server before marking the order paid.

For production, change:

```env
SAFEPAY_ENV=production
```

and use production credentials after Safepay onboarding.

## 4. Google Sign-In

Create a Web OAuth Client ID in Google Cloud Console and add:

```env
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

to `server/.env`, and:

```env
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

to `client/.env`.

Add these origins/URLs in Google Cloud for local testing:

- `http://localhost:5173`

## 5. Important

Never put `SAFEPAY_SECRET_KEY` in the client `.env` or commit it to GitHub.

The included Safepay integration is designed around the provider's hosted checkout flow, so card details are handled by Safepay rather than stored by Khalid Super Store.
