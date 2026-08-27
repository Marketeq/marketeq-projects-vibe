FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/invitations-service/package*.json ./apps/invitations-service/
COPY shared/ ./shared/
RUN npm ci
COPY . .
RUN npx nest build invitations-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/invitations-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3013
# decorators/public.decorator.ts and guards/jwt-auth.guard.ts import
# @libs/auth, which tsconfig.json path-maps to ./libs/auth/src, a sibling
# of apps/, not a descendant of apps/invitations-service/src. That widens
# tsc's inferred rootDir to the backend/ root, so the build output lands at
# dist/apps/invitations-service/apps/invitations-service/src/main.js
# instead of dist/main.js. ecosystem.config.js already compensates for this
# with svcNested().
#
# The COPY above takes the *contents* of dist/apps/invitations-service, so
# one level is stripped and the entrypoint lands at
# /app/dist/apps/invitations-service/src/main.js. WORKDIR is /app, so the
# path below must keep the dist/ prefix.
CMD ["node", "dist/apps/invitations-service/src/main.js"]
