import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Offers } from './offers.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { CreateOfferDto } from './dtos/create-offer.dto';
import { UpdateOfferDto } from './dtos/update-offer.dto';
import { GetOfferResponseDto } from './dtos/get-offer-response.dto';
import { UserRole } from '../user/enums/user-role.enum';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offers)
    private readonly offersRepository: Repository<Offers>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllOffersForTalent(
    talentId: string,
  ): Promise<GetOfferResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: talentId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.TALENT) {
      throw new BadRequestException('User is not a talent');
    }

    const offers = await this.offersRepository.find({
      where: { userId: talentId },
    });
    return offers.map(({ id, title, description, priceUsd, deliveryDays }) => ({
      id,
      title,
      description,
      priceUsd,
      deliveryDays,
    }));
  }

  async create(talentId: string, dto: CreateOfferDto) {
    const user = await this.userRepository.findOne({
      where: { id: talentId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.TALENT) {
      throw new BadRequestException('User is not a talent');
    }
    const offer = this.offersRepository.create({
      ...dto,
      userId: talentId,
    });

    return this.offersRepository.save(offer);
  }

  async update(talentId: string, offerId: string, dto: UpdateOfferDto) {
    const offer = await this.offersRepository.findOne({
      where: { id: offerId, userId: talentId },
    });

    if (!offer) throw new NotFoundException('Offer not found');

    Object.assign(offer, dto);
    return this.offersRepository.save(offer);
  }

  async remove(talentId: string, offerId: string) {
    const offer = await this.offersRepository.findOne({
      where: { id: offerId, userId: talentId },
    });

    if (!offer) throw new NotFoundException('Offer not found');

    await this.offersRepository.remove(offer);
  }
}
