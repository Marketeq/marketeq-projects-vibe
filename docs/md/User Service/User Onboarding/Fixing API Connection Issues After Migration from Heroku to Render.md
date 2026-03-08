# **Fixing API Connection Issues After Migration from Heroku to Render**

### **Purpose:**

This document provides **detailed instructions** to resolve the issue of
**SSL certificate mismatch** caused by trying to connect to **Heroku\'s
API** while your application is now hosted on **Render**. This guide
covers how to **update API URLs**, configure **DNS**, and ensure
**correct SSL certificates** for **Render**.

### **Step 1: Update API URLs in Your Code**

Since you've migrated from **Heroku to Render**, you need to **update
all API URLs** in your project that were previously pointing to
**Heroku** to now point to **Render**. This includes your frontend,
backend, and any environment variables or configuration files.

#### **Backend API URL Update (NestJS Example)**

1.  **Locate the Heroku URL** in your backend configuration files (e.g.,
    .env, configuration files).

    - Example Heroku URL:

HEROKU_API_URL=https://api.heroku.com

2.  \
    **Replace the Heroku URL with your Render URL**.

    - **Render URL** can be found in your Render dashboard.

    - Example Render URL:

RENDER_API_URL=https://your-app-name.onrender.com

3.  \
    **In your backend code**, update the API endpoint to point to
    **Render** instead of **Heroku**.\
    \
    **Example NestJS Code** (Backend URL Update):

import { HttpService } from \'@nestjs/axios\';

\@Injectable()

export class ApiService {

constructor(private readonly httpService: HttpService) {}

// Previously pointing to Heroku, now pointing to Render

private readonly apiUrl = process.env.RENDER_API_URL; // Use the Render
URL

async getData() {

try {

const response = await
this.httpService.get(\`\${this.apiUrl}/endpoint\`).toPromise();

return response.data;

} catch (error) {

throw new Error(\'Failed to fetch data from API\');

}

}

}

4.  \
    **Frontend URL Update**:

    - For frontend code (Next.js), similarly update the URLs to
      **Render's endpoint**.

5.  **Next.js Example**:

const fetchData = async () =\> {

const response = await
fetch(\`\${process.env.RENDER_API_URL}/endpoint\`);

const data = await response.json();

return data;

};



### **Step 2: Update DNS Records for Render**

If you have any **custom domains** set up for your app, you need to
ensure that **DNS records** point to **Render's servers**.

#### **Update DNS for Render Hosting:**

1.  **Log into your domain provider** (e.g., **GoDaddy**, **Namecheap**,
    etc.).

2.  **Find the DNS settings** for your domain.

3.  **Update the DNS records** to point to Render's IPs and CNAMEs
    (provided in your Render dashboard).

    - Render typically provides DNS records to update in the **Render
      Dashboard** under your app settings. It will be in the format:

      - CNAME record: your-app-name.onrender.com

4.  **Example DNS record update**:

    - **CNAME Record**:

Type: CNAME

Host: www

Value: your-app-name.onrender.com

TTL: 3600

5.  \
    **Verify DNS Propagation**:

    - DNS changes may take **up to 48 hours** to propagate, but usually,
      they update much faster.

    - You can use tools like [[DNS
      Checker]{.underline}](https://dnschecker.org/) to verify that the
      DNS is correctly pointing to **Render**.

### **Step 3: Ensure Correct SSL Certificate for Render**

Render automatically manages SSL certificates for custom domains via
**Let's Encrypt**, but you need to ensure that the **custom domain** is
properly linked and that **SSL is enabled**.

#### **Step 1: Add Custom Domain to Render:**

1.  **Log into Render Dashboard**.

2.  **Navigate to your app**.

3.  Under **Settings**, click on **Custom Domains**.

4.  Add your **custom domain** (e.g., www.marketeqdigital.com) to
    Render.

#### **Step 2: Enable SSL on Render:**

1.  After adding your custom domain, Render will automatically issue an
    SSL certificate from **Let's Encrypt**.

2.  You should see an **SSL** status for your domain in the Render
    dashboard.

3.  If SSL is **not automatically enabled**, enable **SSL** via the
    Render dashboard and follow the steps to complete the SSL setup.

#### **Step 3: Verify SSL Certificate:**

1.  **Verify SSL**: Once the custom domain is added and SSL is enabled,
    make sure that the site can be accessed over HTTPS (e.g.,
    https://www.marketeqdigital.com).

2.  **Check SSL with Curl**:\
    Run the following command to verify that the **SSL certificate** is
    correctly applied:

curl -v https://your-app-name.onrender.com

3.  \
    This should show a successful connection with the **SSL
    certificate** being verified.

### **Step 4: Test the Connection to Render's API**

Once you've updated the API URL, DNS records, and SSL configuration,
it's essential to **test the connection** to ensure everything is
working as expected.

#### **Testing API Connection:**

1.  **Test API Calls**:

    - Call the **Render API** from both the **backend** and **frontend**
      to verify that the connection works correctly.

2.  **Frontend**: Test whether the **rendered app** is working after the
    DNS changes.

    - Go to your **Render URL** (e.g.,
      https://your-app-name.onrender.com) to verify that everything
      loads as expected.

3.  **Backend**: Test whether the **backend API** (via Render) is
    receiving requests correctly.

    - Use a **Postman** or **cURL** to send requests to the API and
      confirm that it's working.

4.  Example with cURL:

curl -X GET https://your-app-name.onrender.com/endpoint



### **Step 5: Clean Up Heroku References**

1.  **Remove Heroku Configurations**:

    - Since your app is now hosted on **Render**, remove any old
      **Heroku references** from your configuration files, environment
      variables, and DNS settings.

2.  **Check for Heroku-Specific Files**:

    - Look for any Heroku-specific configuration or references (e.g.,
      **Heroku buildpacks**, **Heroku URL**, etc.) and **remove them**.

3.  **Confirm Render Configuration**:

    - Ensure that your app is now fully **configured for Render** and
      that all URLs, environment variables, and configurations are
      correctly pointing to Render instead of Heroku.

### **Step 6: Verify Everything Is Working**

Once all the steps are completed, make sure to:

- Verify the **API connection** to **Render** (both frontend and
  backend).

- Ensure that **DNS records** have fully propagated.

- Check that **SSL is enabled** for the custom domain.

- Test the **app on Vercel** to ensure the **deployment works** as
  expected.

### **Conclusion**

By following these steps, you should be able to **fix the hostname/IP
mismatch issue** caused by the migration from **Heroku to Render**. The
steps cover updating the **API URLs**, configuring **DNS records**, and
ensuring **SSL certificates** are properly set up for your app on
**Render**.

Once you complete the process, you should have a fully working **Render
deployment** without SSL errors, ready for production!
