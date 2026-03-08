# **Postman/Insomnia Collection & Example Payloads**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service\
**Scope:** Ready-to-import requests for **About, Skills, Experience,
Education, Rates, Portfolio, Progress**. JSON-only, owner-scoped.

## **A) Postman Collection (v2.1) --- import this JSON**

> Uses variables: {{baseUrl}}, {{userId}}, {{token}}.\
> Set {{token}} to a **Bearer** JWT value **without** the Bearer prefix.

  -----------------------------------------------------------------------------------
  {\
  \"info\": {\
  \"name\": \"Complete My Profile \-- Edit Modals (User Service)\",\
  \"\_postman_id\": \"2f3b2f0c-8e48-4a6f-9d86-0d9e0a1c1abc\",\
  \"description\": \"CRUD for profile edit modals + progress endpoint. JSON-only.\",\
  \"schema\":
  \"https://schema.getpostman.com/json/collection/v2.1.0/collection.json\"\
  },\
  \"item\": \[\
  {\
  \"name\": \"About \-- Upsert\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/about\", \"host\":
  \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"about\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"contentHtml\\\":
  \\\"\<p\>Full-stack engineer with marketplace experience.\</p\>\\\"\\n}\" }\
  },\
  \"response\": \[\]\
  },\
  {\
  \"name\": \"Skills \-- List\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": {\
  \"raw\":
  \"{{baseUrl}}/v1/users/{{userId}}/profile/skills?page=1&pageSize=50&q=react\",\
  \"host\": \[\"{{baseUrl}}\"\],\
  \"path\": \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"skills\"\],\
  \"query\": \[{ \"key\": \"page\", \"value\": \"1\" }, { \"key\": \"pageSize\",
  \"value\": \"50\" }, { \"key\": \"q\", \"value\": \"react\" }\]\
  }\
  },\
  \"response\": \[\]\
  },\
  {\
  \"name\": \"Skills \-- Add\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/skills\", \"host\":
  \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"skills\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"value\\\": \\\"React\\\"\\n}\"
  }\
  },\
  \"response\": \[\]\
  },\
  {\
  \"name\": \"Skills \-- Delete\",\
  \"request\": {\
  \"method\": \"DELETE\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/skills/:skillId\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"skills\",\":skillId\"\] }\
  },\
  \"response\": \[\]\
  },\
  {\
  \"name\": \"Experience \-- List\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\":
  \"{{baseUrl}}/v1/users/{{userId}}/profile/experience?page=1&pageSize=20\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"experience\"\], \"query\": \[{
  \"key\": \"page\", \"value\": \"1\" }, { \"key\": \"pageSize\", \"value\": \"20\"
  }\] }\
  }\
  },\
  {\
  \"name\": \"Experience \-- Create\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/experience\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"experience\"\] },\
  \"body\": {\
  \"mode\": \"raw\",\
  \"raw\": \"{\\n \\\"employer\\\": \\\"Acme Corp\\\",\\n \\\"title\\\": \\\"Senior
  Developer\\\",\\n \\\"startDate\\\": \\\"2022-01-01\\\",\\n \\\"endDate\\\":
  null,\\n \\\"descriptionHtml\\\": \\\"\<p\>Led marketplace
  initiative.\</p\>\\\"\\n}\"\
  }\
  }\
  },\
  {\
  \"name\": \"Experience \-- Update\",\
  \"request\": {\
  \"method\": \"PATCH\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/experience/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"experience\",\":id\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"title\\\": \\\"Staff
  Developer\\\",\\n \\\"endDate\\\": \\\"2024-12-31\\\"\\n}\" }\
  }\
  },\
  {\
  \"name\": \"Experience \-- Delete\",\
  \"request\": {\
  \"method\": \"DELETE\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/experience/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"experience\",\":id\"\] }\
  }\
  },\
  {\
  \"name\": \"Education \-- List\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\":
  \"{{baseUrl}}/v1/users/{{userId}}/profile/education?page=1&pageSize=20\", \"host\":
  \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"education\"\], \"query\": \[{
  \"key\": \"page\", \"value\": \"1\" }, { \"key\": \"pageSize\", \"value\": \"20\"
  }\] }\
  }\
  },\
  {\
  \"name\": \"Education \-- Create\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/education\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"education\"\] },\
  \"body\": {\
  \"mode\": \"raw\",\
  \"raw\": \"{\\n \\\"institution\\\": \\\"State University\\\",\\n \\\"degree\\\":
  \\\"MS Computer Science\\\",\\n \\\"startDate\\\": \\\"2021-09-01\\\",\\n
  \\\"endDate\\\": \\\"2023-06-15\\\",\\n \\\"descriptionHtml\\\": \\\"\<p\>Thesis in
  ML systems.\</p\>\\\"\\n}\"\
  }\
  }\
  },\
  {\
  \"name\": \"Education \-- Update\",\
  \"request\": {\
  \"method\": \"PATCH\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/education/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"education\",\":id\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"degree\\\": \\\"M.S. Computer
  Science\\\",\\n \\\"endDate\\\": null\\n}\" }\
  }\
  },\
  {\
  \"name\": \"Education \-- Delete\",\
  \"request\": {\
  \"method\": \"DELETE\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/education/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"education\",\":id\"\] }\
  }\
  },\
  {\
  \"name\": \"Rates \-- List\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\":
  \"{{baseUrl}}/v1/users/{{userId}}/profile/rates?page=1&pageSize=20\", \"host\":
  \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"rates\"\], \"query\": \[{ \"key\":
  \"page\", \"value\": \"1\" }, { \"key\": \"pageSize\", \"value\": \"20\" }\] }\
  }\
  },\
  {\
  \"name\": \"Rates \-- Create\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/rates\", \"host\":
  \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"rates\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"title\\\": \\\"Senior Full-Stack
  Developer\\\",\\n \\\"currency\\\": \\\"USD\\\",\\n \\\"amount\\\":
  \\\"125.00\\\",\\n \\\"isPrimary\\\": true\\n}\" }\
  }\
  },\
  {\
  \"name\": \"Rates \-- Update\",\
  \"request\": {\
  \"method\": \"PATCH\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/rates/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"rates\",\":id\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"amount\\\": \\\"110.00\\\",\\n
  \\\"currency\\\": \\\"EUR\\\"\\n}\" }\
  }\
  },\
  {\
  \"name\": \"Rates \-- Delete\",\
  \"request\": {\
  \"method\": \"DELETE\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/rates/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"rates\",\":id\"\] }\
  }\
  },\
  {\
  \"name\": \"Rates \-- Set Primary\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/rates/:id/primary\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"rates\",\":id\",\"primary\"\] }\
  }\
  },\
  {\
  \"name\": \"Portfolio \-- List\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": {\
  \"raw\":
  \"{{baseUrl}}/v1/users/{{userId}}/profile/portfolio?page=1&pageSize=20&q=case\",\
  \"host\": \[\"{{baseUrl}}\"\],\
  \"path\": \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"portfolio\"\],\
  \"query\": \[{ \"key\": \"page\", \"value\": \"1\" }, { \"key\": \"pageSize\",
  \"value\": \"20\" }, { \"key\": \"q\", \"value\": \"case\" }\]\
  }\
  }\
  },\
  {\
  \"name\": \"Portfolio \-- Create\",\
  \"request\": {\
  \"method\": \"POST\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/portfolio\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"portfolio\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"title\\\": \\\"Case Study \--
  Marketplace\\\",\\n \\\"description\\\": \\\"Flags, A/B infra\\\",\\n \\\"url\\\":
  \\\"https://Example.com:443/case?utm_source=li#x\\\"\\n}\" }\
  }\
  },\
  {\
  \"name\": \"Portfolio \-- Update\",\
  \"request\": {\
  \"method\": \"PATCH\",\
  \"header\": \[\
  { \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" },\
  { \"key\": \"Content-Type\", \"value\": \"application/json\" }\
  \],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/portfolio/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"portfolio\",\":id\"\] },\
  \"body\": { \"mode\": \"raw\", \"raw\": \"{\\n \\\"title\\\": \\\"Marketplace Case
  Study\\\",\\n \\\"url\\\": \\\"https://example.com/case\\\"\\n}\" }\
  }\
  },\
  {\
  \"name\": \"Portfolio \-- Get One\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/portfolio/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"portfolio\",\":id\"\] }\
  }\
  },\
  {\
  \"name\": \"Portfolio \-- Delete\",\
  \"request\": {\
  \"method\": \"DELETE\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/portfolio/:id\",
  \"host\": \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"portfolio\",\":id\"\] }\
  }\
  },\
  {\
  \"name\": \"Progress \-- Get\",\
  \"request\": {\
  \"method\": \"GET\",\
  \"header\": \[{ \"key\": \"Authorization\", \"value\": \"Bearer {{token}}\" }\],\
  \"url\": { \"raw\": \"{{baseUrl}}/v1/users/{{userId}}/profile/progress\", \"host\":
  \[\"{{baseUrl}}\"\], \"path\":
  \[\"v1\",\"users\",\"{{userId}}\",\"profile\",\"progress\"\] }\
  }\
  }\
  \],\
  \"event\": \[\],\
  \"variable\": \[\
  { \"key\": \"baseUrl\", \"value\": \"https://api.example.com\" },\
  { \"key\": \"userId\", \"value\": \"REPLACE_WITH_USER_ID\" },\
  { \"key\": \"token\", \"value\": \"REPLACE_WITH_JWT\" }\
  \]\
  }
  -----------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------

## **B) Insomnia Workspace (YAML) --- import this YAML**

> Variables: {{ baseUrl }}, {{ userId }}, {{ token }}.\
> Set Environment → Base Environment values after import.

  -----------------------------------------------------------------------
  \_type: export\
  \_\_export_format: 4\
  \_\_export_date: 2025-10-28T00:00:00.000Z\
  \_\_export_source: insomnia.desktop.app\
  resources:\
  - \_id: wrk_edit_modals\
  parentId: null\
  modified: 0\
  created: 0\
  \_type: workspace\
  name: Complete My Profile \-- Edit Modals\
  - \_id: env_base\
  parentId: wrk_edit_modals\
  \_type: environment\
  name: Base Environment\
  data:\
  baseUrl: https://api.example.com\
  userId: REPLACE_WITH_USER_ID\
  token: REPLACE_WITH_JWT\
  - \_id: fld_about\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: About\
  - \_id: req_about_upsert\
  parentId: fld_about\
  \_type: request\
  name: About \-- Upsert\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/about\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"contentHtml\": \"\<p\>Full-stack engineer with marketplace
  experience.\</p\>\" }\
  - \_id: fld_skills\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: Skills\
  - \_id: req_skills_list\
  parentId: fld_skills\
  \_type: request\
  name: Skills \-- List\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId
  }}/profile/skills?page=1&pageSize=50&q=react\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_skills_add\
  parentId: fld_skills\
  \_type: request\
  name: Skills \-- Add\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/skills\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"value\": \"React\" }\
  - \_id: req_skills_delete\
  parentId: fld_skills\
  \_type: request\
  name: Skills \-- Delete\
  method: DELETE\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/skills/:skillId\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: fld_exp\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: Experience\
  - \_id: req_exp_list\
  parentId: fld_exp\
  \_type: request\
  name: Experience \-- List\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId
  }}/profile/experience?page=1&pageSize=20\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_exp_create\
  parentId: fld_exp\
  \_type: request\
  name: Experience \-- Create\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/experience\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  {\
  \"employer\": \"Acme Corp\",\
  \"title\": \"Senior Developer\",\
  \"startDate\": \"2022-01-01\",\
  \"endDate\": null,\
  \"descriptionHtml\": \"\<p\>Led marketplace initiative.\</p\>\"\
  }\
  - \_id: req_exp_update\
  parentId: fld_exp\
  \_type: request\
  name: Experience \-- Update\
  method: PATCH\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/experience/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"title\": \"Staff Developer\", \"endDate\": \"2024-12-31\" }\
  - \_id: req_exp_delete\
  parentId: fld_exp\
  \_type: request\
  name: Experience \-- Delete\
  method: DELETE\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/experience/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: fld_edu\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: Education\
  - \_id: req_edu_list\
  parentId: fld_edu\
  \_type: request\
  name: Education \-- List\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId
  }}/profile/education?page=1&pageSize=20\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_edu_create\
  parentId: fld_edu\
  \_type: request\
  name: Education \-- Create\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/education\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  {\
  \"institution\": \"State University\",\
  \"degree\": \"MS Computer Science\",\
  \"startDate\": \"2021-09-01\",\
  \"endDate\": \"2023-06-15\",\
  \"descriptionHtml\": \"\<p\>Thesis in ML systems.\</p\>\"\
  }\
  - \_id: req_edu_update\
  parentId: fld_edu\
  \_type: request\
  name: Education \-- Update\
  method: PATCH\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/education/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"degree\": \"M.S. Computer Science\", \"endDate\": null }\
  - \_id: req_edu_delete\
  parentId: fld_edu\
  \_type: request\
  name: Education \-- Delete\
  method: DELETE\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/education/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: fld_rates\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: Rates\
  - \_id: req_rates_list\
  parentId: fld_rates\
  \_type: request\
  name: Rates \-- List\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId
  }}/profile/rates?page=1&pageSize=20\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_rates_create\
  parentId: fld_rates\
  \_type: request\
  name: Rates \-- Create\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/rates\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"title\": \"Senior Full-Stack Developer\", \"currency\": \"USD\",
  \"amount\": \"125.00\", \"isPrimary\": true }\
  - \_id: req_rates_update\
  parentId: fld_rates\
  \_type: request\
  name: Rates \-- Update\
  method: PATCH\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/rates/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \"{ \\\"amount\\\": \\\"110.00\\\", \\\"currency\\\": \\\"EUR\\\"
  }\"\
  - \_id: req_rates_delete\
  parentId: fld_rates\
  \_type: request\
  name: Rates \-- Delete\
  method: DELETE\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/rates/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_rates_primary\
  parentId: fld_rates\
  \_type: request\
  name: Rates \-- Set Primary\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/rates/:id/primary\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: fld_portfolio\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: Portfolio\
  - \_id: req_port_list\
  parentId: fld_portfolio\
  \_type: request\
  name: Portfolio \-- List\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId
  }}/profile/portfolio?page=1&pageSize=20&q=case\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_port_create\
  parentId: fld_portfolio\
  \_type: request\
  name: Portfolio \-- Create\
  method: POST\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/portfolio\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"title\": \"Case Study \-- Marketplace\", \"description\": \"Flags,
  A/B infra\", \"url\": \"https://Example.com:443/case?utm_source=li#x\"
  }\
  - \_id: req_port_update\
  parentId: fld_portfolio\
  \_type: request\
  name: Portfolio \-- Update\
  method: PATCH\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/portfolio/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - name: Content-Type\
  value: application/json\
  body:\
  mimeType: application/json\
  text: \|\
  { \"title\": \"Marketplace Case Study\", \"url\":
  \"https://example.com/case\" }\
  - \_id: req_port_get\
  parentId: fld_portfolio\
  \_type: request\
  name: Portfolio \-- Get One\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/portfolio/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: req_port_delete\
  parentId: fld_portfolio\
  \_type: request\
  name: Portfolio \-- Delete\
  method: DELETE\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/portfolio/:id\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"\
  - \_id: fld_progress\
  parentId: wrk_edit_modals\
  \_type: request_group\
  name: Progress\
  - \_id: req_progress_get\
  parentId: fld_progress\
  \_type: request\
  name: Progress \-- Get\
  method: GET\
  url: \"{{ baseUrl }}/v1/users/{{ userId }}/profile/progress\"\
  headers:\
  - name: Authorization\
  value: \"Bearer {{ token }}\"
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **C) Example Payloads (copy/paste)**

**About --- Upsert (Request)**

  -----------------------------------------------------------------------
  { \"contentHtml\": \"\<p\>Full-stack engineer with marketplace
  experience.\</p\>\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Skills --- Add (Request)**

  -----------------------------------------------------------------------
  { \"value\": \"React\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Experience --- Create (Request)**

  -----------------------------------------------------------------------
  {\
  \"employer\": \"Acme Corp\",\
  \"title\": \"Senior Developer\",\
  \"startDate\": \"2022-01-01\",\
  \"endDate\": null,\
  \"descriptionHtml\": \"\<p\>Led marketplace initiative.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Education --- Create (Request)**

  -----------------------------------------------------------------------
  {\
  \"institution\": \"State University\",\
  \"degree\": \"MS Computer Science\",\
  \"startDate\": \"2021-09-01\",\
  \"endDate\": \"2023-06-15\",\
  \"descriptionHtml\": \"\<p\>Thesis in ML systems.\</p\>\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Rates --- Create (Request)**

  -----------------------------------------------------------------------
  { \"title\": \"Senior Full-Stack Developer\", \"currency\": \"USD\",
  \"amount\": \"125.00\", \"isPrimary\": true }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Rates --- Set Primary (no body)**

{}

**Portfolio --- Create (Request)**

  -----------------------------------------------------------------------
  { \"title\": \"Case Study \-- Marketplace\", \"description\": \"Flags,
  A/B infra\", \"url\": \"https://Example.com:443/case?utm_source=li#x\"
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Progress --- Get (Response shape)**

  -----------------------------------------------------------------------
  {\
  \"data\": {\
  \"totalSteps\": 5,\
  \"completedSteps\": 3,\
  \"percent\": 60,\
  \"steps\": \[\
  { \"id\": \"about\", \"title\": \"About Me\", \"required\": true,
  \"complete\": true, \"missing\": \[\] },\
  { \"id\": \"skills\", \"title\": \"Skills\", \"required\": true,
  \"complete\": true, \"missing\": \[\] },\
  { \"id\": \"experience\", \"title\": \"Work Experience\", \"required\":
  true, \"complete\": false, \"missing\": \[\"experience\[0\].title\"\]
  },\
  { \"id\": \"education\", \"title\": \"Education\", \"required\": true,
  \"complete\": false, \"missing\": \[\"education: none\"\] },\
  { \"id\": \"rates\", \"title\": \"Job Title & Rate\", \"required\":
  true, \"complete\": true, \"missing\": \[\] }\
  \]\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **D) Environment Hints**

- **baseUrl**: e.g., http://localhost:3000 (local) or your staging/prod
  URL.

- **userId**: must equal the JWT sub.

- **token**: paste the raw JWT (Postman/Insomnia templates already add
  Bearer).
