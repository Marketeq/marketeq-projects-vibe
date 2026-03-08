# **💌 Notification-Service Integration with E2EE Messaging**

## **🎯 Core rule**

  **🔐**                                                                                                   **What it means**
  -------------------------------------------------------------------------------------------------------- -------------------
  ✅ The notification-service **never decrypts message content.**                                          
  ✅ It only receives **safe metadata** (sender name, conversation name) to construct notification text.   
  ✅ Full message text stays encrypted, only decrypted on the recipient's device when they open the app.   

## **🚀 Typical payload to notification service**

When a message is created, your messaging service emits a **lightweight
payload** to your notification-service via your message queue (RabbitMQ,
Redis pub/sub, or even Ably event).

Example JSON:

{

\"type\": \"new_message\",

\"recipientId\": \"user-456\",

\"conversationId\": \"project-abc\",

\"senderName\": \"Anna\",

\"conversationName\": \"Landing Page Redesign\",

\"snippet\": null

}

✅ Notice:

- There's **no decrypted message content**.

- You can optionally add snippet: null or skip entirely to emphasize
  this by design.

## **🔔 Generating the notification**

  -----------------------------------------------------------------
  **Type**    **Content Example**
  ----------- -----------------------------------------------------
  **Push**    \"Anna sent you a new message in Landing Page
              Redesign\"

  **Email**   \"Anna sent you a message. Click here to view it
              securely.\"
  -----------------------------------------------------------------

The actual message body is only retrieved & decrypted when the user
opens the app.

## **⚙️ Email + push template (pseudo)**

****Subject: New message from Anna

Body:

Hi,

Anna sent you a new message in the conversation \"Landing Page
Redesign\".

Click below to open and read it securely:

\[View Message\]

\- The Marketeq Team



## **🔐 Privacy guarantees**

  **✅**                                                                        **Why it's secure**
  ----------------------------------------------------------------------------- ---------------------
  🛡 Only encrypted ciphertext is stored in your DB or logs.                     
  🔍 The notification-service never sees or requests decrypted content.         
  🚀 Keeps your E2EE promise intact, while still providing normal UX signals.   

## **🚀 Bonus: deep links**

For push notifications on mobile, or secure email CTAs, direct the user
to a route like:

https://app.marketeqdigital.com/chat/project-abc

Their browser then loads the encrypted messages, decrypts with their
private key in IndexedDB, and renders securely.

## **✅ Summary playbook**

  ------------------------------------------------------
  **🔥 What to do**
  ------------------------------------------------------
  ✅ Notifications always built from safe metadata
  (sender + convo name).

  ✅ Never decrypt message text server-side.

  ✅ Let the browser or mobile app decrypt on load,
  fully E2EE.
  ------------------------------------------------------
