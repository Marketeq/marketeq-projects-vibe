**13 - Adding the Notification Service to the Monorepo (GitHub)**

**Purpose**

This document provides step-by-step instructions for adding the
notification-service as a new microservice inside the existing GitHub
monorepo. Developers should **not create the service from scratch**.
Instead, they should **copy an existing microservice** (e.g.,
messaging-service) to ensure structural consistency, configuration
alignment, and architectural integrity.

**Repo Structure Reminder**

Your monorepo is structured under a single GitHub repository with all
backend microservices stored in the app/ directory.

Each service lives at:

/app/\<service-name\>/

Example layout:

app/

├── user-service/

├── listing-service/

├── messaging-service/

├── notification-service/ ← this will be added



**Step-by-Step Instructions**

**1. Navigate to your local repo folder**

****cd marketeq-projects \# or whatever your monorepo directory is
called

**2. Copy an existing microservice as the base\**
We recommend using messaging-service as the template:

cp -r app/messaging-service app/notification-service

**3. Rename internal identifiers\**
Inside notification-service, update the following:

- Change MessagingModule to NotificationModule

- Rename files like messaging.controller.ts → notification.controller.ts

- Update service names, DTOs, and entities accordingly

- Change any internal hardcoded port numbers or tags

**4. Register the service in your Docker Compose\**
Open your root-level docker-compose.yml and add:

notification-service:

build:

context: ./app/notification-service

ports:

\- \"4006:3000\"

env_file:

\- .env.notification

depends_on:

\- rabbitmq

\- postgres

Ensure the port does not conflict with other services.

**5. Create a .env.notification file**

****ABLY_API_KEY=your_ably_key

SENDGRID_API_KEY=your_sendgrid_key

DATABASE_URL=postgres://\...

RABBITMQ_URL=amqp://\...



**6. Stage the new service files in Git**

****git add app/notification-service

**7. Commit and push to GitHub**

****git commit -m \"Add notification-service microservice based on
messaging-service\"

git push origin feature/notification-service

Use a feature branch for version control.

**8. Update README (Optional)\**
Document the new service's responsibilities and endpoint summary in the
monorepo's root-level README file.
