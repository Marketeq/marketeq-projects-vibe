### **Authenticating Sender Email with SendGrid using GoDaddy**  By following the steps below, your domain **marketeqdigital.com** will be **authenticated** in **SendGrid** using **GoDaddy** DNS records. This will ensure that **info@marketeqdigital.com** can send emails securely and reliably, without being flagged as spam.

To authenticate your sender email for **SendGrid** when your domain is
hosted by **GoDaddy**, follow these steps:

### **Step 1: Log in to SendGrid and Go to Sender Authentication**

1.  **Log in to your SendGrid account**:

    - Visit [[SendGrid\'s login
      page]{.underline}](https://app.sendgrid.com/login) and log into
      your account.

2.  **Navigate to Sender Authentication**:

    - In the **left sidebar** of your SendGrid dashboard, click on
      **Settings**.

    - Then click on **Sender Authentication** under the \"Settings\"
      section.

3.  **Authenticate Your Domain**:

    - In the **Sender Authentication** page, click on **Get Started**
      under **Domain Authentication**.

4.  **Choose your DNS host**:

    - Select **GoDaddy** from the dropdown list as your DNS provider.

5.  **Enter your domain**:

    - Enter your domain name (e.g., **marketeqdigital.com**) in the
      field provided and click **Next**.

### **Step 2: Add DNS Records in GoDaddy**

Now, you need to log in to your **GoDaddy account** and add the DNS
records provided by **SendGrid** to authenticate your domain.

1.  **Log in to GoDaddy**:

    - Go to [[GoDaddy's website]{.underline}](https://www.godaddy.com/)
      and log into your account.

2.  **Go to your DNS Management Page**:

    - In your GoDaddy dashboard, click on **My Products**.

    - Under the **Domains** section, find your domain
      (**marketeqdigital.com**) and click on **DNS**.

3.  **Add the DNS Records Provided by SendGrid**:

    - **SPF Record** (Sender Policy Framework): This helps prevent
      others from using your domain to send spam.

    - **DKIM Record** (DomainKeys Identified Mail): This adds an
      additional level of verification for emails sent from your domain.

    - **CNAME Records** (Optional but recommended for better
      deliverability): These records help ensure your email is
      authenticated and properly signed.

4.  **In SendGrid**:

    - SendGrid will show you **DNS records** to add in GoDaddy.

      - **For SPF**: A record like v=spf1 include:sendgrid.net \~all

      - **For DKIM**: Specific DKIM entries that may look like
        s1.\_domainkey.marketeqdigital.com (or a similar record).

      - **For CNAME**: Records that look like email.marketeqdigital.com
        pointing to a SendGrid domain.

5.  **In GoDaddy**:

    - In the **DNS Management** page, click on **Add** to add each of
      these records.

    - Select **TXT** or **CNAME** depending on the record type provided
      by SendGrid.

6.  **Example DNS records**:

    - **SPF**: v=spf1 include:sendgrid.net \~all

    - **DKIM**: s1.\_domainkey.marketeqdigital.com (or whatever DKIM
      record SendGrid provides)

    - **CNAME** (for additional verification): email.marketeqdigital.com
      pointing to sendgrid.net or another SendGrid address.

7.  **Save the DNS Records**:

    - Once all records are added, click **Save** in GoDaddy.

### **Step 3: Verify DNS Records and Complete Authentication**

1.  **Return to SendGrid**:

    - After adding the DNS records in GoDaddy, return to your
      **SendGrid** dashboard.

    - SendGrid will check the DNS records you\'ve added.

2.  **Wait for DNS Propagation**:

    - DNS changes can take **up to 48 hours** to propagate, although
      they often happen much sooner. Once the records are verified,
      SendGrid will complete the **domain authentication**.

3.  **Verify Your Email**:

    - If **info@marketeqdigital.com** isn\'t already verified in
      SendGrid, you'll be asked to **verify the email address** by
      clicking on the verification link sent to that email.

### **Step 4: Testing Email Sending via SendGrid**

Once the domain and email address are authenticated, you can proceed
with **sending test emails** through **SendGrid**.

1.  **Test Sending**:

    - Go to **SendGrid** and use the **Email API** or the **SendGrid
      UI** to send a test email from **info@marketeqdigital.com**.

    - Ensure that emails are delivered successfully and not flagged as
      spam.

2.  **Check the Spam Folder**:

    - Ensure that the **email sent from SendGrid** doesn't end up in the
      recipient's **spam folder**. If it does, check your **SPF** and
      **DKIM** records for any misconfigurations.
