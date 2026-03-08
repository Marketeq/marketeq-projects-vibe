# **🧠 Similar Profiles -- Talent Profile Matching Engine**

*A step-by-step implementation guide for identifying and ranking similar
talent profiles using vector similarity.*

## **📌 Purpose**

This module powers the **"Similar Profiles"** section of the Talent
Profile page by matching users based on a prioritized set of attributes.
It uses vector-based semantic similarity and custom ranking logic.

## **🧠 Overview**

For every talent profile, we calculate similarity to other profiles in
real-time using:

  -------------------------------------------------------------------
  **Factor**      **Weight**   **Description**
  --------------- ------------ --------------------------------------
  Skills          0.30         Semantic similarity using vector
                               embeddings

  Role (e.g.      0.20         Exact match or close match using tag
  \'UX\')                      intersection

  Hourly Rate     0.15         Numerical range difference

  Location        0.15         Regional match (continent/country)

  Experience      0.10         Numeric difference scoring
  (Years)                      

  Time Zone       0.05         Matching UTC offset

  Rating          0.05         Scored against a 5.0 max baseline
  -------------------------------------------------------------------

## **🔌 Dependencies**

****npm install \@xenova/transformers

npm install pgvector



## **🧱 File: lib/embedding.ts**

****import { pipeline } from \'@xenova/transformers\';

let embedder: any;

export async function getEmbeddings(texts: string\[\]):
Promise\<number\[\]\[\]\> {

if (!embedder) {

embedder = await pipeline(\'feature-extraction\',
\'Xenova/all-MiniLM-L6-v2\');

}

const embeddings = \[\];

for (const text of texts) {

const result = await embedder(text, { pooling: \'mean\', normalize: true
});

embeddings.push(result.data);

}

return embeddings;

}



## **🔁 File: lib/similarity.ts**

****export function cosineSimilarity(vecA: number\[\], vecB:
number\[\]): number {

const dotProduct = vecA.reduce((sum, a, i) =\> sum + a \* vecB\[i\], 0);

const normA = Math.sqrt(vecA.reduce((sum, a) =\> sum + a \* a, 0));

const normB = Math.sqrt(vecB.reduce((sum, b) =\> sum + b \* b, 0));

return dotProduct / (normA \* normB);

}



## **🎯 File: services/similar-profiles.service.ts**

****import { getEmbeddings } from \'../lib/embedding\';

import { cosineSimilarity } from \'../lib/similarity\';

interface TalentProfile {

id: number;

name: string;

skills: string\[\];

role: string;

hourlyRate: number;

location: string;

experience: number;

timezone: string;

rating: number;

}

export async function getSimilarProfiles(target: TalentProfile,
candidates: TalentProfile\[\]) {

const \[targetSkillVec\] = await getEmbeddings(\[target.skills.join(\',
\')\]);

const candidateSkillVecs = await getEmbeddings(candidates.map(c =\>
c.skills.join(\', \')));

const results = candidates.map((candidate, i) =\> {

const skillScore = cosineSimilarity(targetSkillVec,
candidateSkillVecs\[i\]) \* 0.3;

const roleScore = candidate.role === target.role ? 0.2 : 0;

const rateScore = 0.15 - Math.min(Math.abs(candidate.hourlyRate -
target.hourlyRate) / 200, 0.15);

const locationScore = candidate.location === target.location ? 0.15 : 0;

const experienceScore = 0.10 - Math.min(Math.abs(candidate.experience -
target.experience) / 20, 0.10);

const timezoneScore = candidate.timezone === target.timezone ? 0.05 : 0;

const ratingScore = (candidate.rating / 5) \* 0.05;

const totalScore = skillScore + roleScore + rateScore + locationScore +
experienceScore + timezoneScore + ratingScore;

return {

candidate,

score: parseFloat(totalScore.toFixed(4))

};

});

return results.sort((a, b) =\> b.score - a.score);

}



## **📥 Sample Input (Frontend or Controller)**

****const targetProfile = {

id: 101,

name: \'Jane\',

skills: \[\'UX Design\', \'Figma\', \'Wireframing\'\],

role: \'UX Designer\',

hourlyRate: 90,

location: \'Italy\',

experience: 6,

timezone: \'UTC+1\',

rating: 4.8

};

const candidates = \[\...\]; // fetched from DB (exclude target)

const recommendations = await getSimilarProfiles(targetProfile,
candidates);



## **✅ Notes**

- Results are sorted by combined weighted score.

- You can store vectors in Postgres via pgvector if you want to avoid
  re-embedding every time.

## **🔥 Final Recap**

- ✅ Uses Hugging Face model (all-MiniLM-L6-v2) via
  \@xenova/transformers

- ✅ Supports plug-in to your existing user-service or frontend
  controller

- ✅ Sorted results based on exact weights
