# **🧠 Persisting Embeddings with pgvector in Postgres**

We'll store the vector embeddings for each talent profile in Postgres
using the [[pgvector]{.underline}](https://github.com/pgvector/pgvector)
extension. This avoids redundant re-embedding and allows fast similarity
searches directly in the database.

## **✅ Step 1: Enable pgvector in Postgres**

In your database (e.g. via Supabase, Render Postgres, or CLI):

CREATE EXTENSION IF NOT EXISTS vector;

> ⚠️ You only need to do this **once per database**.

## **✅ Step 2: Modify Your users Table**

Add a new embedding column to store the vector:

ALTER TABLE users ADD COLUMN embedding vector(384);

- \
  384 is the dimension size for all-MiniLM-L6-v2

- You can also store it in a separate table if preferred

## **✅ Step 3: Update Your Entity**

****import { Column, Entity, PrimaryGeneratedColumn } from \'typeorm\';

\@Entity()

export class User {

\@PrimaryGeneratedColumn()

id: number;

\@Column()

name: string;

\@Column(\"vector\", { nullable: true, length: 384 })

embedding: number\[\];

// other fields\...

}



## **✅ Step 4: Save Embedding When Creating User**

****import { getEmbeddings } from \'../lib/embedding\';

async function createUser(data: CreateUserDto) {

const \[embedding\] = await getEmbeddings(\[data.skills.join(\', \')\]);

const user = this.userRepo.create({

\...data,

embedding

});

return this.userRepo.save(user);

}



## **✅ Step 5: Perform Similarity Search in SQL (Optional)**

****const query = \`

SELECT id, name, embedding \<#\> \$1 AS distance

FROM users

WHERE id != \$2

ORDER BY embedding \<#\> \$1

LIMIT 5;

\`;

const similarUsers = await this.db.query(query, \[targetEmbedding,
targetUserId\]);

- \
  \<#\> is the **cosine distance operator** from pgvector

- This sorts by most similar users (lowest distance)

## **✅ Step 6: Re-indexing (Optional for Performance)**

****CREATE INDEX ON users USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);



## **✅ Final Recap**

  --------------------------------------------
  **✅**   **You now have:**
  -------- -----------------------------------
  🔒       Embeddings stored directly in
           Postgres

  ⚡       Fast similarity search with no
           re-embedding

  🧠       Integrated with pgvector and
           Hugging Face

  🛠        Full TypeORM + SQL support, no
           guesswork
  --------------------------------------------
