# InApp Browser Redirect Worker - Setup Guide

This Cloudflare Worker replicates InApp Redirect functionality, automatically redirecting users from in-app browsers (Instagram, Facebook, TikTok) to their native browser.

## Features

- ✅ Automatic detection of in-app browsers (Instagram, Facebook, TikTok, etc.)
- ✅ Platform-specific redirect methods (iOS vs Android)
- ✅ Preserves all URL parameters (UTM, tracking, etc.)
- ✅ Fallback instructions for users
- ✅ Serves your static linktree page
- ✅ FREE (no monthly subscription needed)

## How It Works

1. **Direct Links**: `yoursite.com` - serves your linktree page normally
2. **Redirect Links**: `yoursite.com/go/https://twitter.com/you` - detects in-app browser and redirects
3. **Query Format**: `yoursite.com/go/?url=https://twitter.com/you` - alternative format

## Deployment Options

### Option 1: Deploy via Cloudflare Dashboard (No Wrangler Needed!)

1. **Delete your existing Pages project** (we're switching to Workers)
   - Go to your Cloudflare Dashboard → Workers & Pages
   - Find your linktree project → Settings → Delete

2. **Create a new Worker**
   - Go to Workers & Pages → Create Application → Create Worker
   - Name it `linktree-redirect`
   - Click "Deploy"

3. **Upload the code**
   - After deployment, click "Edit Code" (or go to the Worker → Quick Edit)
   - Delete the default code
   - Copy and paste the entire contents of `worker.js`
   - Click "Save and Deploy"

4. **Add your static files**
   - Unfortunately, the dashboard doesn't support Workers Sites directly
   - **You'll need to use wrangler for this part** (see Option 2)
   - OR use a hybrid approach: Keep your linktree on Pages and only use the Worker for the `/go/` redirect endpoint

### Option 2: Deploy via Wrangler (Recommended - Full Features)

1. **Install Node.js and Wrangler**
   ```bash
   # Install Node.js from nodejs.org if you don't have it
   
   # Install Wrangler globally
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Deploy the Worker**
   ```bash
   # From the directory containing worker.js and wrangler.toml
   wrangler deploy
   ```

4. **Done!** Your worker will be live at `linktree-redirect.your-subdomain.workers.dev`

### Option 3: Hybrid Approach (Best of Both - No Wrangler!)

Keep your Pages site for the linktree, add a Worker just for redirects:

1. **Keep your existing Pages deployment** at `yoursite.pages.dev`

2. **Create a new Worker** (via dashboard as described in Option 1, step 2-3)

3. **Modify the Worker code** - Remove the static site serving part:
   ```javascript
   // In worker.js, change the fetch handler to:
   export default {
     async fetch(request, env, ctx) {
       const url = new URL(request.url);
       const userAgent = request.headers.get('user-agent') || '';
       
       // Only handle /go/ paths
       if (url.pathname.startsWith('/go/')) {
         return handleRedirect(request, url, userAgent);
       }
       
       // For everything else, redirect to your Pages site
       return Response.redirect('https://yoursite.pages.dev' + url.pathname, 302);
     },
   };
   ```

4. **Use the Worker URL for redirects**:
   - Linktree page: `yoursite.pages.dev`
   - Redirect links: `linktree-redirect.your-subdomain.workers.dev/go/https://twitter.com/you`

## Usage Examples

Once deployed, use the redirect URL format for any links you want to force to native browser:

### In Your Instagram Bio:
```
https://linktree-redirect.your-subdomain.workers.dev/go/https://yoursite.pages.dev
```

### For Individual Social Links:
```
Twitter: https://yoursite.workers.dev/go/https://twitter.com/yourusername
Instagram: https://yoursite.workers.dev/go/https://instagram.com/yourusername
Website: https://yoursite.workers.dev/go/https://yourwebsite.com
```

### Updating Your Linktree Links

Modify the links in `public/index.html` to use the redirect format:

```html
<!-- Before -->
<a href="https://twitter.com/yourusername" class="link-button">Twitter</a>

<!-- After -->
<a href="/go/https://twitter.com/yourusername" class="link-button">Twitter</a>
```

## Testing

1. Deploy the worker
2. Open Instagram on your phone
3. Put the worker URL in your bio: `yourworker.workers.dev`
4. Click it from Instagram
5. You should be automatically redirected to your native browser

## Custom Domain (Optional)

To use your own domain (e.g., `links.yourdomain.com`):

1. In your Worker settings → Triggers → Routes
2. Add a route: `links.yourdomain.com/*`
3. Make sure your domain is added to Cloudflare

## Cost

- **FREE** on Cloudflare's free plan (100,000 requests/day)
- No monthly subscription needed
- Unlimited redirects

## Troubleshooting

**Worker not serving the HTML page?**
- Make sure the `public` folder exists with `index.html` inside
- Workers Sites requires the `[site]` configuration in `wrangler.toml`

**Redirects not working?**
- Check the browser console for errors
- Make sure the destination URL is properly encoded
- Test on both iOS and Android devices

**Want to keep it simple?**
- Use the Hybrid Approach (Option 3) - keep your Pages site and just use the Worker for the `/go/` redirects
