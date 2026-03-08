## **❌ No Foreign Keys Across Microservices**

### **🛑 Do Not Use Foreign Keys to Reference External Service Data**

In a microservices architecture, **foreign keys should not be used to
reference data owned by another microservice**. Each microservice must
own its database schema and operate independently.

### **🚫 What You Should Avoid**

**Do not do this:**

****// Inside project-service or listing-service

\@ManyToOne(() =\> UserEntity)

\@JoinColumn({ name: \'userId\' })

user: UserEntity;

This creates:

- A foreign key to a table owned by another service (user-service)

- A hard dependency that breaks deployments, versioning, and schema
  synchronization

- Problems like the one currently blocking your schema sync

### **✅ What You Should Do Instead**

Use a **simple ID reference** and fetch related data via service APIs.

// Use plain ID field

\@Column()

userId: string;

Then, when rendering the full Project Details Page or related data:

1.  **Query your local data** (e.g. tasks, assignments, project scope)

2.  **Fetch external data via API**:

// pseudo-code

const user = await userService.getUserById(userId);



### **🕓 What If the External Microservice Isn't Ready Yet?**

If the user-service API is not finalized yet:

- **✅ You may keep the userId field** (as a string)

- **🛑 But you must remove the foreign key and relation decorators\**

  - This includes \@ManyToOne, \@JoinColumn, etc.

- **⏳ Wait to implement the actual API call** until the service is
  available

### **🧼 Should We Delete the Foreign Key?**

**Yes, you must delete the foreign key from the database schema** if it
references another service's table.

You can do this safely by:

- Removing the TypeORM decorators from the entity

- Running a migration (or manually altering the table) to drop the
  constraint

\-- PostgreSQL example:

ALTER TABLE project DROP CONSTRAINT fk_userid; \-- or the actual FK name



### **✅ Summary**

  ---------------------------------------------------------------------
  **Do**                            **Don't**
  --------------------------------- -----------------------------------
  Use userId as a plain string      Use \@ManyToOne(() =\> UserEntity)

  Fetch user data through           Use ORM joins or cross-service
  user-service API                  foreign keys

  Wait for the user-service API to  Block schema updates or
  be ready                          tight-couple services
  ---------------------------------------------------------------------
