This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Production Deployment (Vercel + FastAPI Cloud)

### Frontend (Vercel)

Deploy the `frontend` directory as a Next.js app.

Required environment variables:

- `NEXT_PUBLIC_API_URL=https://your-backend-domain`

### Backend (FastAPI Cloud)

Deploy the `backend` directory as a FastAPI app (entrypoint: `main:app`).

Required environment variables:

- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=<strong-random-secret>`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://your-backend-domain/auth/google/callback`
- `FRONTEND_URL=https://your-vercel-domain`
- `CORS_ORIGINS=https://your-vercel-domain`

Notes:

- `CORS_ORIGINS` accepts comma-separated values for multiple domains.
- OAuth callback redirects now use `FRONTEND_URL`.

### Google OAuth Console

Configure these values in Google Cloud OAuth client settings:

- Authorized redirect URI: `https://your-backend-domain/auth/google/callback`
- Authorized JavaScript origin: `https://your-vercel-domain`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
