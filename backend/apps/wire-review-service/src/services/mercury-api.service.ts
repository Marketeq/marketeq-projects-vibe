import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { format } from 'date-fns';

@Injectable()
export class MercuryApiService {
  private readonly logger = new Logger(MercuryApiService.name);
  private readonly baseUrl = process.env.MERCURY_BASE_URL || 'https://api.mercury.com/api/v1';
  //https://api.mercury.com/api/v1/account/{id}/transactions
  //'https://api.mercury.com/v1'
  //private readonly baseUrl = process.env.MERCURY_BASE_URL || 'https://api-sandbox.mercury.com/api/v1/';
  private readonly apiKey = process.env.MERCURY_API_KEY;
  private readonly accountId = process.env.MERCURY_ACCOUNT_ID;


// You can remove this method if you don't need to fetch account IDs
// This method is useful if you have multiple accounts and want to fetch transactions for all of them
// If you only have one account, you can directly use the accountId from .env
async fetchAccountIds(): Promise<string[]> {
  try {
    const res = await axios.get(`${this.baseUrl}/accounts`, {
    //const res = await axios.get(`${this.baseUrl}/transactions`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    // Log the raw response data to see what Mercury is actually sending
    this.logger.debug('Raw response from /accounts:', JSON.stringify(res.data, null, 2));

    //const accounts = res.data?.data || [];
    const accounts = res.data?.accounts || [];

    this.logger.debug(`Found ${accounts.length} Mercury accounts.`);
    if (accounts.length > 0) {
        this.logger.debug('Account IDs found:', accounts.map((acc: any) => acc.id));
    }

    return accounts.map((acc: any) => acc.id);
  } catch (err) {
    this.logger.error('Failed to fetch Mercury accounts:', err?.response?.data || err.message);
    return [];
  }
} 

  async fetchTransactions(): Promise<any[]> {
    if (!this.apiKey || !this.accountId) {
      this.logger.error('MERCURY_API_KEY or MERCURY_ACCOUNT_ID missing in .env');
      return [];
    }

    try {

        // Define a broad date range to ensure you fetch all possible transactions
      const startDate = format(new Date('2022-01-01'), 'yyyy-MM-dd'); // Example: Start from Jan 1, 2022
      const endDate = format(new Date(), 'yyyy-MM-dd'); // Example: End at today's date


      const response = await axios.get(
       `${this.baseUrl}/account/${this.accountId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
           params: { // <--- Add query parameters here
            from: startDate,    // Fixed: changed from 'start' to 'from'
            to: endDate,        // Fixed: changed from 'end' to 'to'
            limit: 100 // You can adjust this; 500 is often a max for single requests
          }
        }
      );
      this.logger.debug('Raw response from /transactions:', JSON.stringify(response.data, null, 2));


        // The response structure is { total: number, transactions: [] }
      const transactions = response.data?.transactions || [];
      this.logger.debug(`Found ${transactions.length} transactions out of ${response.data?.total || 0} total`);

      return transactions;
    } catch (err) {
      this.logger.error('Failed to fetch Mercury transactions:');
      this.logger.error(err.response?.data || err.message);
      return [];
    }
  }
}

/* import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { format } from 'date-fns';

@Injectable()
export class MercuryApiService {
  private readonly logger = new Logger(MercuryApiService.name);
  private readonly baseUrl = process.env.MERCURY_BASE_URL || 'https://api.mercury.com/api/v1';
  //https://api.mercury.com/api/v1/account/{id}/transactions
  //'https://api.mercury.com/v1'
  //private readonly baseUrl = process.env.MERCURY_BASE_URL || 'https://api-sandbox.mercury.com/api/v1/';
  private readonly apiKey = process.env.MERCURY_API_KEY;
  private readonly accountId = process.env.MERCURY_ACCOUNT_ID;


// You can remove this method if you don't need to fetch account IDs
// This method is useful if you have multiple accounts and want to fetch transactions for all of them
// If you only have one account, you can directly use the accountId from .env
async fetchAccountIds(): Promise<string[]> {
  try {
    const res = await axios.get(`${this.baseUrl}/accounts`, {
    //const res = await axios.get(`${this.baseUrl}/transactions`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    // Log the raw response data to see what Mercury is actually sending
    this.logger.debug('Raw response from /accounts:', JSON.stringify(res.data, null, 2));

    //const accounts = res.data?.data || [];
    const accounts = res.data?.accounts || [];

    this.logger.debug(`Found ${accounts.length} Mercury accounts.`);
    if (accounts.length > 0) {
        this.logger.debug('Account IDs found:', accounts.map((acc: any) => acc.id));
    }

    return accounts.map((acc: any) => acc.id);
  } catch (err) {
    this.logger.error('Failed to fetch Mercury accounts:', err?.response?.data || err.message);
    return [];
  }
} 

  async fetchTransactions(): Promise<any[]> {
    if (!this.apiKey || !this.accountId) {
      this.logger.error('MERCURY_API_KEY or MERCURY_ACCOUNT_ID missing in .env');
      return [];
    }

    try {

        // Define a broad date range to ensure you fetch all possible transactions
      const startDate = format(new Date('2022-01-01'), 'yyyy-MM-dd'); // Example: Start from Jan 1, 2022
      const endDate = format(new Date(), 'yyyy-MM-dd'); // Example: End at today's date


      const response = await axios.get(
        `${this.baseUrl}/accounts/${this.accountId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
           params: { // <--- Add query parameters here
            start: startDate,
            end: endDate,
            limit: 100 // You can adjust this; 500 is often a max for single requests
          }
        }
      );
      this.logger.debug('Raw response from /transactions:', JSON.stringify(response.data, null, 2));


      return response.data || [];
    } catch (err) {
      this.logger.error('Failed to fetch Mercury transactions:');
      this.logger.error(err.response?.data || err.message);
      return [];
    }
  }
}
 */




/* async fetchTransactions(): Promise<any[]> {
  const accountIds = await this.fetchAccountIds();

  const allTxs = [];
  for (const id of accountIds) {
    try {
      const res = await axios.get(`${this.baseUrl}/account/${id}/transactions`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const txs = res.data?.data || [];
      const wireTxs = txs.filter(tx => tx.type === 'wire' && tx.status === 'settled');
      allTxs.push(...wireTxs);
    } catch (err) {
      this.logger.error(`Failed to fetch transactions for account ${id}:`, err?.response?.data || err.message);
    }
  }

  return allTxs;
}
 */


  /* async fetchTransactions(): Promise<any[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/transactions`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!Array.isArray(res.data)) return [];

      // Filter only wires (ACH and transfers usually excluded)
      return res.data.filter(tx => tx.type === 'wire' && tx.status === 'settled');
    } catch (err) {
      this.logger.error('Failed to fetch Mercury transactions:', err?.response?.data || err.message);
      return [];
    }
  } */
