# **🚀 Marketeq Vercel Optimization & Debug Plan**

## **🔥 1. Fix the 50-Second Cold Start Delay**

A 50-second cold start is extreme --- here\'s how to eliminate that:

### **✅ Bundle Minimization**

- **Problem**: Large SSR function bundles lead to cold starts

- **Solution**:

  - In next.config.js:

module.exports = {

experimental: {

bundlePagesExternals: true, // for Pages Router

},

}

- \
  Use dynamic imports:

const Component = dynamic(() =\>
import(\'@/components/HeavyComponent\'), { ssr: false })

### **✅ Reduce Third-Party Package Weight**

- Audit node_modules via npm run analyze or webpack-bundle-analyzer

- Avoid heavy packages like full lodash, moment, etc.

- Prefer tree-shakable ESM builds

### **✅ Enable Edge Functions for SSR Routes**

- Move pages like /sign-in and / to **Edge Functions** for low-latency:

export const config = { runtime: \'edge\' }

- \
  Great for auth pages & middleware-based gating

### **✅ Move Auth Token Logic to Edge Middleware**

Use lightweight JWT validation with crypto.subtle in middleware.ts (no
heavy jsonwebtoken)

## **⚡ 2. Eliminate Cold Starts for Auth Pages**

### **Option 1: Use Edge Runtime for /sign-in and /**

- Add to those pages:

export const config = { runtime: \"edge\" }

### **Option 2: Warmup Function Ping (if stuck on Serverless)**

Use external ping every 5 minutes (n8n or CronJob) to keep SSR functions
warm.

## **🧠 3. Optimize getServerSideProps Usage**

### **Avoid heavy DB or API calls in GSSP**

- Cache results in Redis or use middleware + cookies to offload logic

### **Example:**

****export const getServerSideProps: GetServerSideProps = async ({ req
}) =\> {

const token = req.cookies.accessToken

if (!token) return redirectToLogin()

try {

const user = verifyAccessToken(token)

return { props: { user } }

} catch {

return redirectToLogin()

}

}



## **🕵️‍♂️ 4. Check Logs and Observability**

### **✅ Use Vercel Observability (Pro Plans)**

- Open your project → Click Observability

- Look for:

  - **High init durations\**

  - **Slow /api/login or /\_next/data\**

  - **Edge vs Serverless function split\**

### **✅ Use Runtime Logs**

- Go to Deployments → Logs → Check cold start markers (INIT_START, etc.)

## **🧼 5. Clean Up Persistent CDN/Data Cache**

### **When Code Changes Don\'t Show:**

- Run:

vercel deploy \--force

- \
  Or from dashboard:

  - Redeploy → "Redeploy without cache"

  - Purge CDN:

vercel cache purge \--type=cdn



## **🧰 6. Final Tools & Configs**

  ---------------------------------------------------------------------
  **Tool/Setting**       **Use**
  ---------------------- ----------------------------------------------
  vercel.json            Explicit config for routes, headers, caching

  middleware.ts          Lightweight global auth logic, especially with
                         Edge Runtime

  analytics.vercel.app   Add client performance tracking

  dynamic() imports      Reduce JS sent to SSR pages

  Edge Config (paid      Share state globally without SSR overhead
  plan)                  
  ---------------------------------------------------------------------

## **📋 Next Steps Checklist**

  --------------------------------------------------------------------
  **Priority**   **Action**
  -------------- -----------------------------------------------------
  ✅ High        Switch /sign-in, /, and all SSR pages to runtime:
                 edge

  ✅ High        Replace jsonwebtoken in middleware with crypto.subtle

  ✅ High        Add bundlePagesExternals: true to next.config.js

  🔄 Medium      Warm key endpoints every 5 min via ping (temporary if
                 free plan)

  🔍 Medium      Analyze bundles using next-bundle-analyzer

  🧹 Low         Remove stale useAuth and shift logic to
                 cookie/middleware-based SSR
  --------------------------------------------------------------------
