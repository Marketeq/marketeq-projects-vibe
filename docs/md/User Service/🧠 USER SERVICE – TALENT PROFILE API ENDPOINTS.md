## **🧠 USER SERVICE -- TALENT PROFILE API ENDPOINTS**

### **🔍 Public Access**

- GET /users/:username\
  → Fetch a public talent profile by username

### **✏️ Profile Editing (Talent or Admin)**

- PUT /users/:id\
  → Update core profile (name, bio, availability, timezone, etc.)

### **🔄 Username Management**

- POST /users/check-username

- PUT /users/:id/username

### **🧠 Skills**

- GET /users/:id/skills

- POST /users/:id/skills

- PUT /users/:id/skills/:skillId

- DELETE /users/:id/skills/:skillId

### **💼 Industry Expertise**

- GET /users/:id/industries

- POST /users/:id/industries

- PUT /users/:id/industries/:industryId

- DELETE /users/:id/industries/:industryId

### **🎓 Education**

- GET /users/:id/education

- POST /users/:id/education

- PUT /users/:id/education/:eduId

- DELETE /users/:id/education/:eduId

### **🧳 Work Experience**

- GET /users/:id/work

- POST /users/:id/work

- PUT /users/:id/work/:workId

- DELETE /users/:id/work/:workId

### **📜 Certifications**

- GET /users/:id/certifications

- POST /users/:id/certifications

- PUT /users/:id/certifications/:certId

- DELETE /users/:id/certifications/:certId

### **🌐 Languages**

- GET /users/:id/languages

- POST /users/:id/languages

- PUT /users/:id/languages/:langId

- DELETE /users/:id/languages/:langId

### **🌍 Availability & Timezone**

- PUT /users/:id/availability

- PUT /users/:id/timezone

### **📍 Location**

- PUT /users/:id/location

- GET /location/countries

- GET /location/cities?country=\...

### **🧠 Overview / Bio**

- PUT /users/:id/overview

- PUT /users/:id/bio

### **💲 Rate**

- PUT /users/:id/rate

### **🖼️ Portfolio / Case Studies**

- GET /users/:id/portfolio

- POST /users/:id/portfolio

- PUT /users/:id/portfolio/:itemId

- DELETE /users/:id/portfolio/:itemId

## **❗ EXTERNAL SERVICES (Referenced but not hosted in User Service)**

### **📊 Reviews (review-service)**

- GET /reviews?userId=\...\
  → Must be called from the review-service

### **📦 Listings (listing-service)**

- GET /listings?userId=\...\
  → Must be called from the listing-service

### **📈 Talent Metrics (Requires aggregation logic)**

- client_success_rating → from review-service

- repeat_hire_rate → from review-service

- response_time → from messaging-service
