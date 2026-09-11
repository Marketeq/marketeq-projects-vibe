# Encryption / KMS Approach — Discussion Only — identity-verification-service

Doc 03 §10 flagged field-level encryption for document_number as an unresolved Infrastructure/Security decision. No document since has resolved it. This file does not resolve it either — it lays out the generic categories of option a real decision would choose between, for discussion, with no vendor named and nothing implemented.

## Current state

- **document_number:** plain varchar column, no encryption at rest.
- **document_image_reference:** a pointer into Cloudflare R2; the actual image's protection depends entirely on R2 bucket-level access control, which is not confirmed by any source.
- **Every credential this service uses** is a plain environment variable, read directly via process.env — no secrets manager, no vault.

## Options for document_number encryption at rest (not chosen)

1. **Column-level encryption via Postgres pgcrypto** — narrowest footprint, no new infrastructure dependency. But the symmetric key itself still needs KMS-backed storage and rotation, and every read/write path would need updating to encrypt/decrypt around it.

2. **Application-layer envelope encryption via a cloud KMS** — this is the shape most platforms converge on, but no cloud provider or KMS product is named anywhere in this project's confirmed sources — choosing one is an Infrastructure/Security decision.

3. **Tokenization/vaulting** — replace document_number with an opaque token and store the real value in a separate vault. Strongest isolation, heaviest to build — unlikely without a specific compliance requirement that no source confirms today.

## Options for this service's secrets (not chosen)

- **Today:** plain environment variables, loaded via process.env directly, consolidated in .env.example. No rotation mechanism beyond manually editing the deployed environment.

- **A secrets-manager service** would remove plaintext secrets from deployment config and enable rotation — at the cost of a new operational dependency that no source confirms this platform has adopted anywhere today.

## What this document does not do

- It does not choose an option from either list.
- It does not implement pgcrypto, a KMS integration, tokenization, or a secrets manager.
- It does not modify Doc 03's schema or migration.
- It does not change Doc 05's or Doc 06's environment-variable loading code.
- It does not name a cloud provider, a KMS product, or a secrets-manager product as this project's choice.
