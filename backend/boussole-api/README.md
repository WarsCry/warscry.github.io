# DanPC Boussole public averages

This Cloudflare Worker stores one anonymous five-party score per browser token.
It never stores names, email addresses, IP addresses, or the ten raw answers.
The browser token is protected with a server-side HMAC secret before storage.

Deployment checklist:

1. Create the D1 database named `danpc-boussole-results`.
2. Put its database ID in `wrangler.jsonc`.
3. Apply `schema.sql` to the remote database.
4. Add a Worker secret named `HASH_SECRET` with at least 32 random characters.
5. Deploy the Worker and put its `/api/results` URL in the website's
   `boussole-api` meta tag.

The API accepts requests only from the configured DanPC/GitHub Pages origins.
Duplicate protection is one submission per randomly generated browser token.
This limits ordinary repeat submissions, but it is not a scientific polling or
anti-fraud system.
