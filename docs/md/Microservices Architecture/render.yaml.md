# **✅ render.yaml (Full Multi-Service Render Setup)**

****services:

\- type: web

name: user-service

env: docker

dockerfilePath: ./apps/user-service/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/user-service/\*\*

\- type: web

name: auth-service

env: docker

dockerfilePath: ./apps/auth-service/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/auth-service/\*\*

\- type: web

name: listings-service

env: docker

dockerfilePath: ./apps/listings-service/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/listings-service/\*\*

\- type: web

name: admin-service

env: docker

dockerfilePath: ./apps/admin-service/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/admin-service/\*\*

\- type: web

name: api-gateway

env: docker

dockerfilePath: ./apps/api-gateway/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/api-gateway/\*\*

\- type: web

name: affiliate-referral-service

env: docker

dockerfilePath: ./apps/affiliate-referral-service/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/affiliate-referral-service/\*\*

\- type: web

name: algolia-service

env: docker

dockerfilePath: ./apps/algolia-service/Dockerfile

startCommand: npm run start:prod

autoDeploy: true

plan: free

buildFilter:

paths:

\- apps/algolia-service/\*\*


