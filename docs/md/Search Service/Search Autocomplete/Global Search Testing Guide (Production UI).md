# **Global Search Testing Guide (Production UI)**

This document guides developers on how to test the **global search bar**
in the **live application UI** using the **autocomplete microservice**.
It does **not require a sandbox page** and is meant for validating
real-time integration and production readiness.

## **✨ What You\'re Testing**

- Global search input field located in the **site header\**

- Real-time suggestions from the **autocomplete microservice\**

- Full integration flow from frontend UI → microservice → response
  rendering

## **🔹 Step-by-Step Testing Instructions**

### **1. Navigate to a Page with Global Search**

Global search is embedded in the header. Navigate to any of these
routes:

- /dashboard

- /projects

- /services

- /teams

You should see the search bar in the top nav/header.

### **2. Open Developer Tools**

- Use Cmd + Option + I (Mac) or Ctrl + Shift + I (Windows)

- Navigate to the **Network** tab

- Filter for requests hitting:

https://autocomplete.api.marketeq.com/autocomplete/



### **3. Start Typing in Global Search**

- Enter a test term like react, marketing, or UI

- You should see a request being made to:

GET https://autocomplete.api.marketeq.com/autocomplete/:type?q=term

- \
  Example:

GET /autocomplete/skills?q=react



### **4. Confirm Results Display**

- Suggestions should appear directly beneath the input

- Each result should include:

  - **Label** (e.g., React.js, UI/UX Design)

  - **Type** (e.g., Project, Service, Team, Talent)

### **5. Test All Supported Types**

The autocomplete microservice supports:

- skills

- job_titles

- services

- keywords

- teams

- projects

- talent

- users

> Note: The UI may not expose all types immediately (e.g., users), but
> the backend supports them for future use.

### **6. Validate Behavior for Unknown Terms**

- Type a gibberish term like asdfjasdf

- Confirm that no results are returned

- Check that the system handles it gracefully (no crashes or slowdowns)

## **🔧 Troubleshooting**

### **Issue: No Suggestions Appearing**

- Check browser console for errors

- Make sure the API is reachable at
  https://autocomplete.api.marketeq.com

- Check that autocomplete microservice is deployed in
  apps/autocomplete-service

- Validate that the microservice returns a 200 response with matching
  results

## **🏢 Production Checklist**

- Autocomplete-service is deployed and reachable from the frontend

- Global search input triggers correct API calls

- Microservice returns structured suggestions

- Suggestions render correctly in UI dropdown

- No UI or API errors during search interaction

## **🚀 You\'re Done**

The global search feature is now tested and validated using the live
production UI. No sandbox needed.

If you\'re using this for QA or staging validation, repeat these steps
using your preview or staging URL.
