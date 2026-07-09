import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Favorite } from './favorites.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFavoritesDto } from './dto/add-favorites.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
  ) {}

  async create(userId: string, dto: CreateFavoritesDto) {
    const exist = await this.favoritesRepository.findOne({
      where: { userId, listingId: dto.listingId },
    });
    if (exist) {
      throw new ConflictException('Favorite already exists');
    }

    const favorite = this.favoritesRepository.create({
      userId,
      ...dto,
    });
    return this.favoritesRepository.save(favorite);
  }

  async findAll(userId: string) {
    return this.favoritesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async remove(userId: string, id: string) {
    const favorite = await this.favoritesRepository.findOne({
      where: { id, userId },
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    await this.favoritesRepository.remove(favorite);
    return { message: 'Favorite deleted' };
  }
}
