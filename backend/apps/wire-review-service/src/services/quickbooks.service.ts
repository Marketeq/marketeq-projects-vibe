import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickBooksCustomerMap } from '../entities/quickbooks-customer-map.entity';

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);
  //private readonly baseUrl = `https://quickbooks.api.intuit.com/v3/company/${process.env.QUICKBOOKS_REALM_ID}`;
  private readonly baseUrl = `https://${process.env.QUICKBOOKS_BASE_URL}/v3/company/${process.env.QUICKBOOKS_REALM_ID}`;

  constructor(
    @InjectRepository(QuickBooksCustomerMap)
    private readonly qboMapRepo: Repository<QuickBooksCustomerMap>,
  ) {}

  async createQuickBooksCustomer(input: { displayName: string; email: string }): Promise<string> {
    try {
      const token = await this.refreshAccessToken();

      this.logger.debug(`Creating customer with data: ${JSON.stringify(input)}`);
      this.logger.debug(`Using base URL: ${this.baseUrl}`);
      this.logger.debug(`Access token length: ${token.length}`);

      const response = await axios.post(
        `${this.baseUrl}/customer`,
        {
          DisplayName: input.displayName,
          PrimaryEmailAddr: {
            Address: input.email,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.Customer.Id;
    } catch (error) {
      this.logger.error('Error creating QuickBooks customer:', error.response?.data || error.message);
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response headers:', error.response.headers);
        this.logger.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async getOrCreateCustomerId(clientId: string, userData: { displayName: string; email: string }): Promise<string> {
    const existing = await this.qboMapRepo.findOne({ where: { clientId } });
    if (existing) return existing.quickbooksCustomerId;

    const quickbooksCustomerId = await this.createQuickBooksCustomer(userData);
    await this.qboMapRepo.save({ clientId, quickbooksCustomerId });

    return quickbooksCustomerId;
  }

  async createInvoiceInQuickBooks(input: {
    amount: number;
    clientId: string;
    invoiceId: string;
    displayName: string;
    email: string;
  }): Promise<string> {
    try {
      const accessToken = await this.refreshAccessToken();
      const customerId = await this.getOrCreateCustomerId(input.clientId, {
        displayName: input.displayName,
        email: input.email,
      });

      const payload = {
        Line: [
          {
            Amount: input.amount,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: '1', name: 'Wire Payment' },
            },
          },
        ],
        CustomerRef: { value: customerId },
      /*   CustomField: [
          {
            DefinitionId: '1',
            StringValue: input.invoiceId,
            Name: 'MarketeqRef',
          },
        ], */
        CustomField: [
  {
    DefinitionId: '1',
    StringValue: input.invoiceId,
    Name: `MarketeqRef-${input.invoiceId}`, // <- make this unique
  },
]
      };

      this.logger.debug(`Creating invoice with payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.debug(`Using base URL: ${this.baseUrl}`);
      this.logger.debug(`Access token length: ${accessToken.length}`);

      const response = await axios.post(
        `${this.baseUrl}/invoice`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.Invoice.Id;
    } catch (error) {
      this.logger.error('Error creating QuickBooks invoice:', error.response?.data || error.message);
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response headers:', error.response.headers);
        this.logger.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      // Validate environment variables
      if (!process.env.QUICKBOOKS_CLIENT_ID || !process.env.QUICKBOOKS_CLIENT_SECRET || !process.env.QUICKBOOKS_REFRESH_TOKEN) {
        throw new Error('Missing required QuickBooks environment variables');
      }

      this.logger.debug('Refreshing access token...');
      this.logger.debug(`Client ID: ${process.env.QUICKBOOKS_CLIENT_ID}`);
      this.logger.debug(`Refresh token length: ${process.env.QUICKBOOKS_REFRESH_TOKEN?.length || 0}`);

      const auth = Buffer.from(
        `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
      ).toString('base64');

      const payload = {
        grant_type: 'refresh_token',
        refresh_token: process.env.QUICKBOOKS_REFRESH_TOKEN,
      };

      const res = await axios.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        qs.stringify(payload),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.logger.debug('Token refresh successful');
      return res.data.access_token;
    } catch (error) {
      this.logger.error('Error refreshing access token:', error.response?.data || error.message);
      if (error.response) {
        this.logger.error('Token refresh response status:', error.response.status);
        this.logger.error('Token refresh response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

    async fetchInvoiceDetails(invoiceId: string): Promise<any> {
    const token = await this.refreshAccessToken();
    const response = await axios.get(`${this.baseUrl}/invoice/${invoiceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async fetchPaymentDetails(paymentId: string, realmId: string): Promise<any> {
    try {
        const token = await this.refreshAccessToken();
        const response = await axios.get(`${this.baseUrl}/payment/${paymentId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        this.logger.error(`Error fetching payment details for ID ${paymentId}: ${error.response?.data || error.message}`);
        return null;
    }
}

  async fetchPaidInvoices(): Promise<any[]> {
    try {
      const token = await this.refreshAccessToken();
      const query = `SELECT * FROM Invoice WHERE Balance <= '0.00'`;;

      const response = await axios.get(`${this.baseUrl}/query`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: { query },
      });

      return response.data.QueryResponse.Invoice || [];
    } catch (error) {
      this.logger.error('Error fetching paid invoices:', error.response?.data || error.message);
      throw error;
    }
  }

  // Add this method to test your connection
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.refreshAccessToken();
      const response = await axios.get(`${this.baseUrl}/companyinfo/1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      
      this.logger.log(`Connection successful. Company: ${response.data.QueryResponse.CompanyInfo[0].CompanyName}`);
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error.response?.data || error.message);
      return false;
    }
  }
}
/* import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickBooksCustomerMap } from '../entities/quickbooks-customer-map.entity';

@Injectable()
export class QuickBooksService {
  private readonly baseUrl = `https://quickbooks.api.intuit.com/v3/company/${process.env.QUICKBOOKS_REALM_ID}`;

  constructor(
    @InjectRepository(QuickBooksCustomerMap)
    private readonly qboMapRepo: Repository<QuickBooksCustomerMap>,
  ) {}

  async createQuickBooksCustomer(input: { displayName: string; email: string }): Promise<string> {
    const token = await this.refreshAccessToken();

    const response = await axios.post(
      `${this.baseUrl}/customer`,
      {
        DisplayName: input.displayName,
        PrimaryEmailAddr: {
          Address: input.email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.Customer.Id;
  }

  async getOrCreateCustomerId(clientId: string, userData: { displayName: string; email: string }): Promise<string> {
    const existing = await this.qboMapRepo.findOne({ where: { clientId } });
    if (existing) return existing.quickbooksCustomerId;

    const quickbooksCustomerId = await this.createQuickBooksCustomer(userData);
    await this.qboMapRepo.save({ clientId, quickbooksCustomerId });

    return quickbooksCustomerId;
  }

  async createInvoiceInQuickBooks(input: {
    amount: number;
    clientId: string;
    invoiceId: string;
    displayName: string;
    email: string;
  }): Promise<string> {
    const accessToken = await this.refreshAccessToken();
    const customerId = await this.getOrCreateCustomerId(input.clientId, {
      displayName: input.displayName,
      email: input.email,
    });

    const payload = {
      Line: [
        {
          Amount: input.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1', name: 'Wire Payment' },
          },
        },
      ],
      CustomerRef: { value: customerId },
      CustomField: [
        {
          DefinitionId: '1',
          StringValue: input.invoiceId,
          Name: 'MarketeqRef',
        },
      ],
    };

    const response = await axios.post(
      `${this.baseUrl}/invoice`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.Invoice.Id;
  }

  private async refreshAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
    ).toString('base64');

    const payload = {
      grant_type: 'refresh_token',
      refresh_token: process.env.QUICKBOOKS_REFRESH_TOKEN,
    };

    const res = await axios.post(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      qs.stringify(payload),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return res.data.access_token;
  }

  async fetchPaidInvoices(): Promise<any[]> {
    const token = await this.refreshAccessToken();
    const query = `SELECT * FROM Invoice WHERE Balance = 0`;

    const response = await axios.get(`${this.baseUrl}/query`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      params: { query },
    });

    return response.data.QueryResponse.Invoice || [];
  }
} */

/* 
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';
import * as env from 'dotenv';

@Injectable()
export class QuickBooksService {
  private readonly baseUrl = `https://quickbooks.api.intuit.com/v3/company/${process.env.QUICKBOOKS_REALM_ID}`;

  async createInvoiceInQuickBooks(input: {
    amount: number;
    clientId: string;
    invoiceId: string;
  }): Promise<string> {
    const accessToken = await this.refreshAccessToken();

    const payload = {
      Line: [
        {
          Amount: input.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1', name: 'Wire Payment' },
          },
        },
      ],
      CustomerRef: { value: input.clientId },
      //CustomerRef: { value: "1" },
      CustomField: [
        {
          DefinitionId: '1',
          StringValue: input.invoiceId,
          Name: 'MarketeqRef',
        },
      ],
    };

    this.logger.debug(`QuickBooks access token length: ${accessToken.length}`);

    const response = await axios.post(
      `${this.baseUrl}/invoice`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.Invoice.Id;
  }

  private async refreshAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
    ).toString('base64');

    const payload = {
      grant_type: 'refresh_token',
      refresh_token: process.env.QUICKBOOKS_REFRESH_TOKEN,
    };

    const res = await axios.post(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      qs.stringify(payload),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return res.data.access_token;
  }

  async fetchPaidInvoices(): Promise<any[]> {
    const token = await this.refreshAccessToken();
    const query = `SELECT * FROM Invoice WHERE Balance = 0`;

    const response = await axios.get(`${this.baseUrl}/query`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      params: { query },
    });

    return response.data.QueryResponse.Invoice || [];
  }
} */