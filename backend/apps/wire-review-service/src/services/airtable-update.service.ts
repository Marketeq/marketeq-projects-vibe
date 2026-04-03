// src/services/airtable-update.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AirtableUpdateService {
  private readonly logger = new Logger(AirtableUpdateService.name);
  private readonly airtableBaseId = process.env.AIRTABLE_BASE_ID;
  private readonly airtableApiKey = process.env.AIRTABLE_API_KEY;
  private readonly airtableTable = 'wire_reviews';

  async markVerified(transactionId: string) {
    try {
      const airtableUrl = `https://api.airtable.com/v0/${this.airtableBaseId}/${this.airtableTable}`;

      const response = await axios.get(airtableUrl, {
        headers: {
          Authorization: `Bearer ${this.airtableApiKey}`,
        },
        params: {
          filterByFormula: `{TransactionID} = '${transactionId}'`
        }
      });

      const recordId = response.data?.records?.[0]?.id;
      if (!recordId) {
        this.logger.warn(`No Airtable record found for transaction ${transactionId}`);
        return;
      }

      await axios.patch(`${airtableUrl}/${recordId}`, {
        fields: {
          Status: 'Verified',
          ReviewedBy: 'System – QuickBooks',
          ReviewedAt: new Date().toISOString(),
        },
      }, {
        headers: {
          Authorization: `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Airtable status updated for transaction ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to update Airtable for ${transactionId}: ${error.message}`);
    }
  }
}
