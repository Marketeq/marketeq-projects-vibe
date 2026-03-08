# **✅ docker-compose.yml (for local dev, optional)**

Place in the root of your monorepo.

version: \"3.9\"

services:

postgres:

image: postgres:14

ports:

\- \"5432:5432\"

environment:

POSTGRES_USER: postgres

POSTGRES_PASSWORD: password

POSTGRES_DB: marketeq

volumes:

\- pgdata:/var/lib/postgresql/data

user-service:

build:

context: ./apps/user-service

ports:

\- \"3001:3001\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

auth-service:

build:

context: ./apps/auth-service

ports:

\- \"3002:3002\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

listings-service:

build:

context: ./apps/listings-service

ports:

\- \"3003:3003\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

admin-service:

build:

context: ./apps/admin-service

ports:

\- \"3004:3004\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

api-gateway:

build:

context: ./apps/api-gateway

ports:

\- \"3000:3000\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

affiliate-referral-service:

build:

context: ./apps/affiliate-referral-service

ports:

\- \"3005:3005\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

algolia-service:

build:

context: ./apps/algolia-service

ports:

\- \"3006:3006\"

depends_on:

\- postgres

environment:

\- DATABASE_URL=postgres://postgres:password@postgres:5432/marketeq

volumes:

pgdata:



## **🔁 Summary of What to Do Now**

1.  ✅ **Delete all individually deployed services** in the Render
    dashboard (except the Postgres DB).

2.  ✅ **Push both render.yaml and docker-compose.yml** to your
    marketeq-projects-nestjs repo.

3.  ✅ From the Render dashboard, **create ONE new app** using the
    render.yaml file.

4.  🚀 Render will auto-detect and deploy all services inside one
    environment.
