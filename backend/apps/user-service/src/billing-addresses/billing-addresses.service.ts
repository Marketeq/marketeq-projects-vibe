import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingAddress } from './billing-address.entity';
import { CreateBillingAddressDto } from './billing-address.dto';

export interface BillingAddressView {
  id: string;
  fullName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

const toView = (row: BillingAddress): BillingAddressView => ({
  id: row.id,
  fullName: row.fullName,
  addressLine1: row.addressLine1,
  addressLine2: row.addressLine2 ?? null,
  city: row.city,
  state: row.state ?? null,
  postalCode: row.postalCode,
  country: row.country,
  phoneNumber: row.phoneNumber,
});

@Injectable()
export class BillingAddressesService {
  constructor(
    @InjectRepository(BillingAddress)
    private readonly repo: Repository<BillingAddress>,
  ) {}

  async list(userId: string): Promise<BillingAddressView[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map(toView);
  }

  async create(
    userId: string,
    dto: CreateBillingAddressDto,
  ): Promise<BillingAddressView> {
    const row = this.repo.create({
      userId,
      fullName: dto.fullName,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2 || null,
      city: dto.city,
      state: dto.state || null,
      postalCode: dto.postalCode,
      country: dto.country,
      phoneNumber: dto.phoneNumber,
    });
    return toView(await this.repo.save(row));
  }
}
