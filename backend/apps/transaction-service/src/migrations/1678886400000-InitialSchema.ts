import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1678886400000 implements MigrationInterface {
  name = 'InitialSchema1678886400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Ensure schema exists
    await queryRunner.query(
      `CREATE SCHEMA IF NOT EXISTS transaction_service`
    );

    // Step 2: Create all enum types
    await queryRunner.query(`
      CREATE TYPE transaction_service.transaction_type_enum AS ENUM (
        'daily_installment','weekly_installment','monthly_installment',
        'quarterly_installment','annual_installment','hourly_payment',
        'final_payment','paid_in_full','refund_issued','credit_applied',
        'deposit','wire_transfer_fee','purchase','basic_membership',
        'pro_membership','enterprise_membership','ledger_correction',
        'case','project_payment'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.transaction_status_enum AS ENUM (
        'paid','processing','scheduled','payment_pending','failed',
        'overdue','succeeded','credited','refunded','pending',
        'partially_refunded','cancelled','in_dispute'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.invoice_status_enum AS ENUM (
        'paid','processing','scheduled','payment_pending',
        'failed','overdue','partially_paid'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.payment_method_type_enum AS ENUM (
        'bank_ach','credit_card','klarna','google_pay','apple_pay'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.contract_type_enum AS ENUM (
        'project','service','team','individual'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.billing_frequency_enum AS ENUM (
        'daily','weekly','biweekly','monthly','quarterly','annual'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.membership_tier_enum AS ENUM (
        'basic','pro','enterprise','agency'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE transaction_service.amount_direction_enum AS ENUM (
        'debit','credit'
      )
    `);

    // Step 3: contracts (no dependencies)
    await queryRunner.query(`
      CREATE TABLE transaction_service.contracts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type            transaction_service.contract_type_enum NOT NULL,
        client_name     VARCHAR(100) NOT NULL,
        client_username VARCHAR(100) NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT contracts_client_username_unique UNIQUE (client_username)
      )
    `);

    // Step 4: payment_methods (no dependencies)
    await queryRunner.query(`
      CREATE TABLE transaction_service.payment_methods (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        type        transaction_service.payment_method_type_enum NOT NULL,
        label       VARCHAR(50) NOT NULL,
        identifier  VARCHAR(100) NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Step 5: transactions (depends on contracts)
    // Full DDL matches Section 3.3 — abbreviated here for migration runner
    await queryRunner.query(`
      CREATE TABLE transaction_service.transactions (
        id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id                VARCHAR(20) NOT NULL,
        date                          DATE NOT NULL,
        description_type              transaction_service.transaction_type_enum NOT NULL,
        description_project_name      VARCHAR(255),
        description_contractor_handle VARCHAR(100),
        description_billing_period    VARCHAR(20),
        description_hours             INTEGER,
        description_months            INTEGER,
        invoice_number                VARCHAR(20),
        amount                        NUMERIC(12,2) NOT NULL,
        amount_direction              transaction_service.amount_direction_enum NOT NULL,
        status                        transaction_service.transaction_status_enum NOT NULL,
        payment_method_type           transaction_service.payment_method_type_enum NOT NULL,
        payment_method_label          VARCHAR(50) NOT NULL,
        payment_method_identifier     VARCHAR(100) NOT NULL,
        contract_type                 transaction_service.contract_type_enum NOT NULL,
        contract_id                   UUID NOT NULL,
        billing_frequency             transaction_service.billing_frequency_enum,
        membership_tier               transaction_service.membership_tier_enum,
        paid_at                       TIMESTAMPTZ,
        user_id                       UUID NOT NULL,
        parent_transaction_id         UUID,
        usd_equivalent                NUMERIC(12,2) NOT NULL,
        created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT transactions_transaction_id_unique UNIQUE (transaction_id),
        CONSTRAINT transactions_hours_positive CHECK (description_hours IS NULL OR description_hours > 0),
        CONSTRAINT transactions_months_positive CHECK (description_months IS NULL OR description_months > 0),
        CONSTRAINT transactions_amount_nonzero CHECK (description_type = 'ledger_correction' OR amount <> 0),
        CONSTRAINT transactions_paid_in_full_project_only CHECK (description_type <> 'paid_in_full' OR contract_type = 'project'),
        CONSTRAINT transactions_paid_at_after_date CHECK (paid_at IS NULL OR paid_at::DATE >= date),
        CONSTRAINT transactions_description_consistency CHECK (
          (contract_type = 'individual' AND description_contractor_handle IS NOT NULL)
          OR (contract_type <> 'individual' AND description_project_name IS NOT NULL)
        ),
        CONSTRAINT transactions_parent_fk FOREIGN KEY (parent_transaction_id) REFERENCES transaction_service.transactions (id) ON DELETE RESTRICT,
        CONSTRAINT transactions_contract_fk FOREIGN KEY (contract_id) REFERENCES transaction_service.contracts (id) ON DELETE RESTRICT
      )
    `);

    // Step 6: invoices (depends on contracts)
    await queryRunner.query(`
      CREATE TABLE transaction_service.invoices (
        id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id                 VARCHAR(20) NOT NULL,
        stripe_invoice_id          VARCHAR(100),
        date_issued                DATE NOT NULL,
        description_type           VARCHAR(255) NOT NULL,
        description_billing_period VARCHAR(20),
        due_date                   DATE NOT NULL,
        status                     transaction_service.invoice_status_enum NOT NULL,
        amount                     NUMERIC(12,2) NOT NULL,
        contract_id                UUID NOT NULL,
        user_id                    UUID NOT NULL,
        created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT invoices_id_format CHECK (invoice_id ~ '^INV-[0-9]{4}-[0-9]{3,}$'),
        CONSTRAINT invoices_due_after_issued CHECK (due_date >= date_issued),
        CONSTRAINT invoices_amount_positive CHECK (amount > 0),
        CONSTRAINT invoices_id_unique UNIQUE (invoice_id),
        CONSTRAINT invoices_contract_fk FOREIGN KEY (contract_id) REFERENCES transaction_service.contracts (id) ON DELETE RESTRICT
      )
    `);

    // Step 7: transaction_detail (depends on transactions)
    await queryRunner.query(`
      CREATE TABLE transaction_service.transaction_detail (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id         UUID NOT NULL,
        account_label          VARCHAR(50) NOT NULL,
        transaction_type_label VARCHAR(50) NOT NULL,
        amount                 NUMERIC(12,2) NOT NULL,
        paid_at                TIMESTAMPTZ,
        installment_label      VARCHAR(50),
        description_full       TEXT NOT NULL,
        disclaimer_text        TEXT NOT NULL DEFAULT 'Transaction details are provided for reference and may be preliminary or incomplete. They may not exactly match the final records shown on your official bank or account statements.',
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT transaction_detail_transaction_id_unique UNIQUE (transaction_id),
        CONSTRAINT transaction_detail_transaction_fk FOREIGN KEY (transaction_id) REFERENCES transaction_service.transactions (id) ON DELETE CASCADE
      )
    `);

    // Step 8: Create all indexes
    await queryRunner.query(`CREATE INDEX idx_contracts_type ON transaction_service.contracts (type)`);
    await queryRunner.query(`CREATE INDEX idx_contracts_client_username ON transaction_service.contracts (client_username)`);
    await queryRunner.query(`CREATE INDEX idx_payment_methods_user_id ON transaction_service.payment_methods (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_user_id ON transaction_service.transactions (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_status ON transaction_service.transactions (status)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_date ON transaction_service.transactions (date DESC)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_contract_id ON transaction_service.transactions (contract_id)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_type ON transaction_service.transactions (description_type)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_payment_type ON transaction_service.transactions (payment_method_type)`);
    await queryRunner.query(`CREATE INDEX idx_transactions_parent ON transaction_service.transactions (parent_transaction_id)`);
    await queryRunner.query(`CREATE INDEX idx_invoices_user_id ON transaction_service.invoices (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_invoices_status ON transaction_service.invoices (status)`);
    await queryRunner.query(`CREATE INDEX idx_invoices_date_issued ON transaction_service.invoices (date_issued DESC)`);
    await queryRunner.query(`CREATE INDEX idx_invoices_contract_id ON transaction_service.invoices (contract_id)`);
    await queryRunner.query(`CREATE INDEX idx_invoices_due_date ON transaction_service.invoices (due_date)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS transaction_service.transaction_detail`);
    await queryRunner.query(`DROP TABLE IF EXISTS transaction_service.invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS transaction_service.transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS transaction_service.payment_methods`);
    await queryRunner.query(`DROP TABLE IF EXISTS transaction_service.contracts`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.transaction_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.transaction_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.invoice_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.payment_method_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.contract_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.billing_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.membership_tier_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_service.amount_direction_enum`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS transaction_service CASCADE`);
  }
}