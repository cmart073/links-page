/**
 * Cloudflare Worker to redirect in-app browsers to native browsers
 * This replicates InApp Redirect functionality
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check if this is the redirect endpoint
    if (url.pathname.startsWith('/go/')) {
      return handleRedirect(request, url, userAgent);
    }
    
    // For all other requests, serve the static site
    return env.ASSETS.fetch(request);
  },
};

/**
 * Detect if the request is from an in-app browser
 */
function isInAppBrowser(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Common in-app browser signatures
  const inAppBrowsers = [
    'instagram',
    'fban',        // Facebook App
    'fbav',        // Facebook App
    'twitter',
    'line/',       // LINE app
    'micromessenger', // WeChat
    'kakao',       // KakaoTalk
    'telegram',
  ];
  
  return inAppBrowsers.some(browser => ua.includes(browser));
}

/**
 * Detect platform (iOS vs Android)
 */
function getPlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) {
    return 'ios';
  } else if (ua.includes('android')) {
    return 'android';
  }
  return 'unknown';
}

/**
 * Handle the redirect logic
 */
async function handleRedirect(request, url, userAgent) {
  // Get the destination URL from the path or query parameter
  // Format: /go/https://example.com or /go/?url=https://example.com
  let destinationUrl;
  
  // Try to get URL from path first
  const pathParts = url.pathname.split('/go/');
  if (pathParts.length > 1 && pathParts[1]) {
    destinationUrl = decodeURIComponent(pathParts[1]);
  } else {
    // Fallback to query parameter
    destinationUrl = url.searchParams.get('url');
  }
  
  // If no destination URL, return error
  if (!destinationUrl) {
    return new Response('Missing destination URL. Use /go/https://example.com or /go/?url=https://example.com', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  // Ensure the destination URL is valid
  try {
    new URL(destinationUrl);
  } catch (e) {
    return new Response('Invalid destination URL', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  // Check if this is an in-app browser
  if (!isInAppBrowser(userAgent)) {
    // Not an in-app browser, just redirect normally
    return Response.redirect(destinationUrl, 302);
  }
  
  // Detect platform
  const platform = getPlatform(userAgent);
  
  // Return an HTML page that handles the redirect based on platform
  return new Response(generateRedirectHTML(destinationUrl, platform), {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * Generate HTML page that performs the redirect
 */
function generateRedirectHTML(destinationUrl, platform) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening in browser...</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: white;
        }
        
        .container {
            max-width: 500px;
            text-align: center;
        }
        
        .loader {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 30px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        h1 {
            font-size: 24px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        p {
            font-size: 16px;
            line-height: 1.6;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .manual-link {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        
        .manual-link:hover {
            transform: scale(1.05);
        }
        
        .instructions {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loader"></div>
        <h1>Opening in your browser...</h1>
        <p>You're being redirected to your default browser for a better experience.</p>
        
        <div class="instructions">
            <strong>If the redirect doesn't work:</strong><br>
            Tap the <strong>"•••"</strong> menu at the top and select<br>
            <strong>"Open in Browser"</strong> or <strong>"Open in Safari/Chrome"</strong>
        </div>
        
        <a href="${destinationUrl}" class="manual-link">Continue Manually</a>
    </div>

    <script>
        const destinationUrl = ${JSON.stringify(destinationUrl)};
        const platform = ${JSON.stringify(platform)};
        
        // Function to attempt redirect
        function attemptRedirect() {
            if (platform === 'android') {
                // Android: Use intent URL to force external browser
                const intentUrl = 'intent://' + destinationUrl.replace(/https?:\\/\\//, '') + '#Intent;end';
                window.location.href = intentUrl;
                
                // Fallback after a delay
                setTimeout(() => {
                    window.location.href = destinationUrl;
                }, 500);
            } else if (platform === 'ios') {
                // iOS: Try multiple methods
                
                // Method 1: Try googlechrome:// or firefox:// schemes
                const isChrome = navigator.userAgent.includes('CriOS');
                const isFirefox = navigator.userAgent.includes('FxiOS');
                
                if (isChrome) {
                    const chromeUrl = 'googlechrome://' + destinationUrl.replace(/https?:\\/\\//, '');
                    window.location.href = chromeUrl;
                    setTimeout(() => {
                        window.location.href = destinationUrl;
                    }, 500);
                } else if (isFirefox) {
                    const firefoxUrl = 'firefox://' + destinationUrl.replace(/https?:\\/\\//, '');
                    window.location.href = firefoxUrl;
                    setTimeout(() => {
                        window.location.href = destinationUrl;
                    }, 500);
                } else {
                    // Default: Try x-safari-https scheme
                    const safariUrl = 'x-safari-https://' + destinationUrl.replace(/https?:\\/\\//, '');
                    window.location.href = safariUrl;
                    setTimeout(() => {
                        window.location.href = destinationUrl;
                    }, 500);
                }
            } else {
                // Unknown platform or desktop - just redirect
                window.location.href = destinationUrl;
            }
        }
        
        // Attempt redirect on load
        window.addEventListener('load', () => {
            setTimeout(attemptRedirect, 1000);
        });
        
        // Also try immediately (belt and suspenders approach)
        attemptRedirect();
    </script>
</body>
</html>`;
}
