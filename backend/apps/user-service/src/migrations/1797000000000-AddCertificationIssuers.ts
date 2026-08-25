import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificationIssuers1797000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "certification_issuers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "logoUrl" character varying,
        "websiteUrl" character varying,
        "domain" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_certification_issuers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_certification_issuers_name"
      ON "certification_issuers" ("name")
    `);

    // Add issuerLogoUrl column to certifications table
    await queryRunner.query(`
      ALTER TABLE "certifications"
      ADD COLUMN IF NOT EXISTS "issuerLogoUrl" character varying
    `);

    // Seed well-known issuers with logo URLs (Clearbit Logo API for real logos)
    await queryRunner.query(`
      INSERT INTO "certification_issuers" ("name", "logoUrl", "websiteUrl", "domain") VALUES
        ('Adobe', 'https://logo.clearbit.com/adobe.com', 'https://www.adobe.com/products/aftereffects/certification.html', 'adobe.com'),
        ('Google', 'https://logo.clearbit.com/google.com', 'https://grow.google/certificates/', 'google.com'),
        ('WordPress', 'https://logo.clearbit.com/wordpress.org', 'https://developer.wordpress.org/', 'wordpress.org'),
        ('Amazon Web Services', 'https://logo.clearbit.com/aws.amazon.com', 'https://aws.amazon.com/certification/', 'aws.amazon.com'),
        ('Microsoft', 'https://logo.clearbit.com/microsoft.com', 'https://learn.microsoft.com/en-us/certifications/', 'microsoft.com'),
        ('Cisco', 'https://logo.clearbit.com/cisco.com', 'https://www.cisco.com/c/en/us/training-events/training-certifications/certifications.html', 'cisco.com'),
        ('CompTIA', 'https://logo.clearbit.com/comptia.org', 'https://www.comptia.org/certifications', 'comptia.org'),
        ('Salesforce', 'https://logo.clearbit.com/salesforce.com', 'https://trailhead.salesforce.com/en/credentials', 'salesforce.com'),
        ('Oracle', 'https://logo.clearbit.com/oracle.com', 'https://education.oracle.com/certification', 'oracle.com'),
        ('HashiCorp', 'https://logo.clearbit.com/hashicorp.com', 'https://www.hashicorp.com/certifications', 'hashicorp.com'),
        ('Kubernetes', 'https://logo.clearbit.com/cncf.io', 'https://www.cncf.io/training/certification/', 'cncf.io'),
        ('Linux Foundation', 'https://logo.clearbit.com/linuxfoundation.org', 'https://training.linuxfoundation.org/certification-catalog/', 'linuxfoundation.org'),
        ('PMI', 'https://logo.clearbit.com/pmi.org', 'https://www.pmi.org/certifications', 'pmi.org'),
        ('Scrum Alliance', 'https://logo.clearbit.com/scrumalliance.org', 'https://www.scrumalliance.org/get-certified', 'scrumalliance.org'),
        ('Scrum.org', 'https://logo.clearbit.com/scrum.org', 'https://www.scrum.org/assessments', 'scrum.org'),
        ('Atlassian', 'https://logo.clearbit.com/atlassian.com', 'https://www.atlassian.com/university/certification', 'atlassian.com'),
        ('Autodesk', 'https://logo.clearbit.com/autodesk.com', 'https://www.autodesk.com/certification', 'autodesk.com'),
        ('Figma', 'https://logo.clearbit.com/figma.com', 'https://www.figma.com/', 'figma.com'),
        ('HubSpot', 'https://logo.clearbit.com/hubspot.com', 'https://academy.hubspot.com/certification', 'hubspot.com'),
        ('Stripe', 'https://logo.clearbit.com/stripe.com', 'https://stripe.com/docs', 'stripe.com'),
        ('MongoDB', 'https://logo.clearbit.com/mongodb.com', 'https://university.mongodb.com/certification', 'mongodb.com'),
        ('Databricks', 'https://logo.clearbit.com/databricks.com', 'https://www.databricks.com/learn/certification', 'databricks.com'),
        ('Snowflake', 'https://logo.clearbit.com/snowflake.com', 'https://www.snowflake.com/certifications/', 'snowflake.com'),
        ('Alibaba Cloud', 'https://logo.clearbit.com/alibabacloud.com', 'https://edu.alibabacloud.com/certification', 'alibabacloud.com'),
        ('IBM', 'https://logo.clearbit.com/ibm.com', 'https://www.ibm.com/training/credentials', 'ibm.com'),
        ('Red Hat', 'https://logo.clearbit.com/redhat.com', 'https://www.redhat.com/en/services/certification', 'redhat.com'),
        ('Blockchain Council', 'https://logo.clearbit.com/blockchain-council.org', 'https://www.blockchain-council.org/', 'blockchain-council.org'),
        ('Meta', 'https://logo.clearbit.com/meta.com', 'https://www.meta.com/certification/', 'meta.com'),
        ('Apple', 'https://logo.clearbit.com/apple.com', 'https://training.apple.com/certification', 'apple.com'),
        ('SAP', 'https://logo.clearbit.com/sap.com', 'https://training.sap.com/certification', 'sap.com'),
        ('Tableau', 'https://logo.clearbit.com/tableau.com', 'https://www.tableau.com/learn/certification', 'tableau.com'),
        ('ISACA', 'https://logo.clearbit.com/isaca.org', 'https://www.isaca.org/credentialing', 'isaca.org'),
        ('ISC2', 'https://logo.clearbit.com/isc2.org', 'https://www.isc2.org/certifications', 'isc2.org'),
        ('EC-Council', 'https://logo.clearbit.com/eccouncil.org', 'https://www.eccouncil.org/programs/', 'eccouncil.org'),
        ('Terraform', 'https://logo.clearbit.com/hashicorp.com', 'https://www.hashicorp.com/certifications/terraform-associate', 'hashicorp.com'),
        ('Docker', 'https://logo.clearbit.com/docker.com', 'https://www.docker.com/', 'docker.com'),
        ('GitHub', 'https://logo.clearbit.com/github.com', 'https://resources.github.com/learn/certifications/', 'github.com'),
        ('Shopify', 'https://logo.clearbit.com/shopify.com', 'https://www.shopify.com/partners', 'shopify.com'),
        ('Twilio', 'https://logo.clearbit.com/twilio.com', 'https://www.twilio.com/', 'twilio.com'),
        ('Cloudflare', 'https://logo.clearbit.com/cloudflare.com', 'https://www.cloudflare.com/', 'cloudflare.com')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "certification_issuers"`);
  }
}
