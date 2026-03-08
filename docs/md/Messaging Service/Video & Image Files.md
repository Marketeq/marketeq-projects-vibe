**Video & Image Files**

### **🎥 Video Handling for Messaging**

- **Users may paste video links** (e.g. YouTube, Loom, Vimeo, etc.)
  directly into the chat.

- The system will:

  - Detect and validate supported URLs.

  - Optionally render an **inline preview** (thumbnail + play icon).

  - **Never upload** or proxy the video file itself.

### **✅ Final Media Services Summary**

  --------------------------------------------
  **Media    **Storage / Delivery Mechanism**
  Type**     
  ---------- ---------------------------------
  📎 Files   **Cloudflare R2** (via
             S3-compatible upload)

  🖼 Images   **Cloudflare Images** (optimized
             delivery)

  🎥 Videos  **External links only** (e.g.
             YouTube, Loom)
  --------------------------------------------
