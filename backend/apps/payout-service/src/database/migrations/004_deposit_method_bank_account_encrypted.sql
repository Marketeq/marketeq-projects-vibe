-- PS-08: real Stripe ACH micro-deposit verification for BANK_MANUAL accounts
-- requires the raw account number at send time (account_number_hash is a
-- one-way SHA-256 used only for duplicate detection and cannot be reversed).
-- Encrypted at rest with BankEncryptionService (AES-256-GCM), same as the
-- rest of the bank-detail fields are intended to be per the column comment
-- on bank_routing_number.
ALTER TABLE deposit_methods
  ADD COLUMN bank_account_number_encrypted TEXT NULL;
