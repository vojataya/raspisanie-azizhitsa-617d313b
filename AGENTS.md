# Project rules (Russia block bypass — do not break)

Production is hosted on Yandex Cloud API Gateway + Object Storage (Vercel is a fallback); Lovable publishing is not used.

- src/integrations/supabase/client.ts: in prod the client URL is `${window.location.origin}/sb`, in dev `VITE_SUPABASE_URL`. If the file is regenerated, restore this logic. Why: supabase.co is unreliable from Russia.
- Never add direct supabase.co requests in client code. Why: they bypass the /sb proxy.
- Store canonical image URLs (https://<ref>.supabase.co/storage/v1/...) in the DB; display via `toDisplayUrl()` from src/lib/imageUrl.ts; never save `getPublicUrl()` output. Why: display host differs per environment.
- Compress photos before upload with src/lib/imageCompression.ts. Why: the gateway rejects files over 3.5 MB.
- /reset-password is a public route outside AuthRedirect and ProtectedRoute; src/lib/initialUrl.ts is the first import in src/main.tsx. Why: recovery link hash must be captured before the Supabase client parses it.
- vercel.json: the `/sb/:path*` rewrite stays first; vite.config.ts keeps a `/sb` proxy. Why: same /sb path in every environment.
- Do not restore Lovable default title or favicon.
