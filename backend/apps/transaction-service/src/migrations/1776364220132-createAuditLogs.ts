import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogs1776364220132 implements MigrationInterface {
    name = 'CreateAuditLogs1776364220132'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_service"."transaction_detail" DROP CONSTRAINT "transaction_detail_transaction_fk"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_contract_fk"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_parent_fk"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" DROP CONSTRAINT "invoices_contract_fk"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_contracts_type"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_contracts_client_username"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_user_id"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_status"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_date"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_contract_id"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_type"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_payment_type"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_transactions_parent"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_invoices_user_id"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_invoices_status"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_invoices_date_issued"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_invoices_contract_id"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_invoices_due_date"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."idx_payment_methods_user_id"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_hours_positive"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_months_positive"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_amount_nonzero"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_paid_in_full_project_only"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_paid_at_after_date"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "transactions_description_consistency"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" DROP CONSTRAINT "invoices_id_format"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" DROP CONSTRAINT "invoices_due_after_issued"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" DROP CONSTRAINT "invoices_amount_positive"`);
        await queryRunner.query(`CREATE TABLE "transaction_service"."audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying(50) NOT NULL, "user_id" uuid NOT NULL, "transaction_id" uuid, "invoice_id" uuid, "scope" character varying(50), "format" character varying(10), "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        // Rename old enum to _old
        await queryRunner.query(`ALTER TYPE "transaction_service"."contract_type_enum" RENAME TO "contract_type_enum_old"`);
        // Create new enum
        await queryRunner.query(`CREATE TYPE "transaction_service"."contracts_type_enum" AS ENUM('project', 'service', 'team', 'individual')`);
        // Update contracts.type to new enum
        await queryRunner.query(`ALTER TABLE "transaction_service"."contracts" ALTER COLUMN "type" TYPE "transaction_service"."contracts_type_enum" USING "type"::text::"transaction_service"."contracts_type_enum"`);
        // Update transactions.contract_type to new enum
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "contract_type" TYPE "transaction_service"."contracts_type_enum" USING "contract_type"::text::"transaction_service"."contracts_type_enum"`);
        // Drop old enum
        await queryRunner.query(`DROP TYPE "transaction_service"."contract_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."transaction_type_enum" RENAME TO "transaction_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transactions_description_type_enum" AS ENUM('daily_installment', 'weekly_installment', 'monthly_installment', 'quarterly_installment', 'annual_installment', 'hourly_payment', 'final_payment', 'paid_in_full', 'refund_issued', 'credit_applied', 'deposit', 'wire_transfer_fee', 'purchase', 'basic_membership', 'pro_membership', 'enterprise_membership', 'ledger_correction', 'case', 'project_payment')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "description_type" TYPE "transaction_service"."transactions_description_type_enum" USING "description_type"::"text"::"transaction_service"."transactions_description_type_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transaction_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."amount_direction_enum" RENAME TO "amount_direction_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transactions_amount_direction_enum" AS ENUM('debit', 'credit')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "amount_direction" TYPE "transaction_service"."transactions_amount_direction_enum" USING "amount_direction"::"text"::"transaction_service"."transactions_amount_direction_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."amount_direction_enum_old"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."transaction_status_enum" RENAME TO "transaction_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transactions_status_enum" AS ENUM('paid', 'processing', 'scheduled', 'payment_pending', 'failed', 'overdue', 'succeeded', 'credited', 'refunded', 'pending', 'partially_refunded', 'cancelled', 'in_dispute')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "status" TYPE "transaction_service"."transactions_status_enum" USING "status"::"text"::"transaction_service"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transaction_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."payment_method_type_enum" RENAME TO "payment_method_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transactions_payment_method_type_enum" AS ENUM('bank_ach', 'credit_card', 'klarna', 'google_pay', 'apple_pay')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "payment_method_type" TYPE "transaction_service"."transactions_payment_method_type_enum" USING "payment_method_type"::"text"::"transaction_service"."transactions_payment_method_type_enum"`);
        // Drop payment_methods_type_enum if it already exists (for reruns)
        await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_methods_type_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'transaction_service')) THEN DROP TYPE "transaction_service"."payment_methods_type_enum"; END IF; END $$;`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."payment_methods_type_enum" AS ENUM('bank_ach', 'credit_card', 'klarna', 'google_pay', 'apple_pay')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."payment_methods" ALTER COLUMN "type" TYPE "transaction_service"."payment_methods_type_enum" USING "type"::text::"transaction_service"."payment_methods_type_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."payment_method_type_enum_old"`);
        // Removed duplicate contract_type_enum migration block
        await queryRunner.query(`ALTER TYPE "transaction_service"."billing_frequency_enum" RENAME TO "billing_frequency_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transactions_billing_frequency_enum" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "billing_frequency" TYPE "transaction_service"."transactions_billing_frequency_enum" USING "billing_frequency"::"text"::"transaction_service"."transactions_billing_frequency_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."billing_frequency_enum_old"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."membership_tier_enum" RENAME TO "membership_tier_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transactions_membership_tier_enum" AS ENUM('basic', 'pro', 'enterprise', 'agency')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "membership_tier" TYPE "transaction_service"."transactions_membership_tier_enum" USING "membership_tier"::"text"::"transaction_service"."transactions_membership_tier_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."membership_tier_enum_old"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."invoice_status_enum" RENAME TO "invoice_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."invoices_status_enum" AS ENUM('paid', 'processing', 'scheduled', 'payment_pending', 'failed', 'overdue', 'partially_paid', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ALTER COLUMN "status" TYPE "transaction_service"."invoices_status_enum" USING "status"::"text"::"transaction_service"."invoices_status_enum"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."invoice_status_enum_old"`);
        // Removed duplicate payment_methods_type_enum migration block
        await queryRunner.query(`CREATE INDEX "IDX_e408d02ad9f8b479a7a9695185" ON "transaction_service"."contracts" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_866b6fb0f779f778f48379906b" ON "transaction_service"."contracts" ("client_username") `);
        await queryRunner.query(`CREATE INDEX "IDX_d66471a99dd3836e1528d39a1e" ON "transaction_service"."transactions" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transaction_service"."transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_bfe2efd1fdd9675f2f64d75d51" ON "transaction_service"."transactions" ("contract_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e9acc6efa76de013e8c1553ed2" ON "transaction_service"."transactions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_243818c22605e0af66783be127" ON "transaction_service"."invoices" ("date_issued") `);
        await queryRunner.query(`CREATE INDEX "IDX_0457ee681a50419881ea2ee796" ON "transaction_service"."invoices" ("due_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_ac0f09364e3701d9ed35435288" ON "transaction_service"."invoices" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a1393659dc4aa043ed203c888" ON "transaction_service"."invoices" ("contract_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_26daf5e433d6fb88ee32ce9363" ON "transaction_service"."invoices" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7d7fb15569674aaadcfbc0428" ON "transaction_service"."payment_methods" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transaction_detail" ADD CONSTRAINT "FK_7b6499577106332cfdc37cd427f" FOREIGN KEY ("transaction_id") REFERENCES "transaction_service"."transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "FK_bfe2efd1fdd9675f2f64d75d51c" FOREIGN KEY ("contract_id") REFERENCES "transaction_service"."contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ADD CONSTRAINT "FK_2a1393659dc4aa043ed203c8886" FOREIGN KEY ("contract_id") REFERENCES "transaction_service"."contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" DROP CONSTRAINT "FK_2a1393659dc4aa043ed203c8886"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" DROP CONSTRAINT "FK_bfe2efd1fdd9675f2f64d75d51c"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transaction_detail" DROP CONSTRAINT "FK_7b6499577106332cfdc37cd427f"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_d7d7fb15569674aaadcfbc0428"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_26daf5e433d6fb88ee32ce9363"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_2a1393659dc4aa043ed203c888"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_ac0f09364e3701d9ed35435288"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_0457ee681a50419881ea2ee796"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_243818c22605e0af66783be127"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_e9acc6efa76de013e8c1553ed2"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_bfe2efd1fdd9675f2f64d75d51"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_da87c55b3bbbe96c6ed88ea7ee"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_d66471a99dd3836e1528d39a1e"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_866b6fb0f779f778f48379906b"`);
        await queryRunner.query(`DROP INDEX "transaction_service"."IDX_e408d02ad9f8b479a7a9695185"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."payment_method_type_enum_old" AS ENUM('bank_ach', 'credit_card', 'klarna', 'google_pay', 'apple_pay')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."payment_methods" ALTER COLUMN "type" TYPE "transaction_service"."payment_method_type_enum_old" USING "type"::"text"::"transaction_service"."payment_method_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."payment_methods_type_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."payment_method_type_enum_old" RENAME TO "payment_method_type_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."invoice_status_enum_old" AS ENUM('paid', 'processing', 'scheduled', 'payment_pending', 'failed', 'overdue', 'partially_paid')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ALTER COLUMN "status" TYPE "transaction_service"."invoice_status_enum_old" USING "status"::"text"::"transaction_service"."invoice_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."invoices_status_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."invoice_status_enum_old" RENAME TO "invoice_status_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."membership_tier_enum_old" AS ENUM('basic', 'pro', 'enterprise', 'agency')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "membership_tier" TYPE "transaction_service"."membership_tier_enum_old" USING "membership_tier"::"text"::"transaction_service"."membership_tier_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_membership_tier_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."membership_tier_enum_old" RENAME TO "membership_tier_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."billing_frequency_enum_old" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "billing_frequency" TYPE "transaction_service"."billing_frequency_enum_old" USING "billing_frequency"::"text"::"transaction_service"."billing_frequency_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_billing_frequency_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."billing_frequency_enum_old" RENAME TO "billing_frequency_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."contract_type_enum_old" AS ENUM('project', 'service', 'team', 'individual')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "contract_type" TYPE "transaction_service"."contract_type_enum_old" USING "contract_type"::"text"::"transaction_service"."contract_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_contract_type_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."contract_type_enum_old" RENAME TO "contract_type_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."payment_method_type_enum_old" AS ENUM('bank_ach', 'credit_card', 'klarna', 'google_pay', 'apple_pay')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "payment_method_type" TYPE "transaction_service"."payment_method_type_enum_old" USING "payment_method_type"::"text"::"transaction_service"."payment_method_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_payment_method_type_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."payment_method_type_enum_old" RENAME TO "payment_method_type_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transaction_status_enum_old" AS ENUM('paid', 'processing', 'scheduled', 'payment_pending', 'failed', 'overdue', 'succeeded', 'credited', 'refunded', 'pending', 'partially_refunded', 'cancelled', 'in_dispute')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "status" TYPE "transaction_service"."transaction_status_enum_old" USING "status"::"text"::"transaction_service"."transaction_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."transaction_status_enum_old" RENAME TO "transaction_status_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."amount_direction_enum_old" AS ENUM('debit', 'credit')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "amount_direction" TYPE "transaction_service"."amount_direction_enum_old" USING "amount_direction"::"text"::"transaction_service"."amount_direction_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_amount_direction_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."amount_direction_enum_old" RENAME TO "amount_direction_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."transaction_type_enum_old" AS ENUM('daily_installment', 'weekly_installment', 'monthly_installment', 'quarterly_installment', 'annual_installment', 'hourly_payment', 'final_payment', 'paid_in_full', 'refund_issued', 'credit_applied', 'deposit', 'wire_transfer_fee', 'purchase', 'basic_membership', 'pro_membership', 'enterprise_membership', 'ledger_correction', 'case', 'project_payment')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ALTER COLUMN "description_type" TYPE "transaction_service"."transaction_type_enum_old" USING "description_type"::"text"::"transaction_service"."transaction_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."transactions_description_type_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."transaction_type_enum_old" RENAME TO "transaction_type_enum"`);
        await queryRunner.query(`CREATE TYPE "transaction_service"."contract_type_enum_old" AS ENUM('project', 'service', 'team', 'individual')`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."contracts" ALTER COLUMN "type" TYPE "transaction_service"."contract_type_enum_old" USING "type"::"text"::"transaction_service"."contract_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "transaction_service"."contracts_type_enum"`);
        await queryRunner.query(`ALTER TYPE "transaction_service"."contract_type_enum_old" RENAME TO "contract_type_enum"`);
        await queryRunner.query(`DROP TABLE "transaction_service"."audit_logs"`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ADD CONSTRAINT "invoices_amount_positive" CHECK ((amount > (0)::numeric))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ADD CONSTRAINT "invoices_due_after_issued" CHECK ((due_date >= date_issued))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ADD CONSTRAINT "invoices_id_format" CHECK (((invoice_id)::text ~ '^INV-[0-9]{4}-[0-9]{3,}$'::text))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_description_consistency" CHECK ((((contract_type = 'individual'::transaction_service.contract_type_enum) AND (description_contractor_handle IS NOT NULL)) OR ((contract_type <> 'individual'::transaction_service.contract_type_enum) AND (description_project_name IS NOT NULL))))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_paid_at_after_date" CHECK (((paid_at IS NULL) OR ((paid_at)::date >= date)))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_paid_in_full_project_only" CHECK (((description_type <> 'paid_in_full'::transaction_service.transaction_type_enum) OR (contract_type = 'project'::transaction_service.contract_type_enum)))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_amount_nonzero" CHECK (((description_type = 'ledger_correction'::transaction_service.transaction_type_enum) OR (amount <> (0)::numeric)))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_months_positive" CHECK (((description_months IS NULL) OR (description_months > 0)))`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_hours_positive" CHECK (((description_hours IS NULL) OR (description_hours > 0)))`);
        await queryRunner.query(`CREATE INDEX "idx_payment_methods_user_id" ON "transaction_service"."payment_methods" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_invoices_due_date" ON "transaction_service"."invoices" ("due_date") `);
        await queryRunner.query(`CREATE INDEX "idx_invoices_contract_id" ON "transaction_service"."invoices" ("contract_id") `);
        await queryRunner.query(`CREATE INDEX "idx_invoices_date_issued" ON "transaction_service"."invoices" ("date_issued") `);
        await queryRunner.query(`CREATE INDEX "idx_invoices_status" ON "transaction_service"."invoices" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_invoices_user_id" ON "transaction_service"."invoices" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_parent" ON "transaction_service"."transactions" ("parent_transaction_id") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_payment_type" ON "transaction_service"."transactions" ("payment_method_type") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_type" ON "transaction_service"."transactions" ("description_type") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_contract_id" ON "transaction_service"."transactions" ("contract_id") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_date" ON "transaction_service"."transactions" ("date") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_status" ON "transaction_service"."transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_user_id" ON "transaction_service"."transactions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_contracts_client_username" ON "transaction_service"."contracts" ("client_username") `);
        await queryRunner.query(`CREATE INDEX "idx_contracts_type" ON "transaction_service"."contracts" ("type") `);
        await queryRunner.query(`ALTER TABLE "transaction_service"."invoices" ADD CONSTRAINT "invoices_contract_fk" FOREIGN KEY ("contract_id") REFERENCES "transaction_service"."contracts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_parent_fk" FOREIGN KEY ("parent_transaction_id") REFERENCES "transaction_service"."transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transactions" ADD CONSTRAINT "transactions_contract_fk" FOREIGN KEY ("contract_id") REFERENCES "transaction_service"."contracts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_service"."transaction_detail" ADD CONSTRAINT "transaction_detail_transaction_fk" FOREIGN KEY ("transaction_id") REFERENCES "transaction_service"."transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
