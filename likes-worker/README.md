# Like counter (Cloudflare Worker)

One shared like count for the whole site. Free Cloudflare account is enough.

```bash
cd likes-worker
npx wrangler login
npx wrangler secret put SALT          # any random string; used to hash visitor IPs
npx wrangler deploy                   # prints https://packet-journey-likes.<you>.workers.dev
curl https://packet-journey-likes.<you>.workers.dev/likes   # {"count":0,"liked":false}
```

Then give the site the URL (GitHub → Settings → Secrets and variables → Actions → Variables):

```
VITE_LIKES_API = https://packet-journey-likes.<you>.workers.dev/likes
```

and add the same origin to `connect-src` in `nginx/security-headers.conf` if you also serve the Docker image.
