import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { SocialIdentity } from './entities/social-identity.entity';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkedInLoginDto } from './dto/linkedin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SocialIdentity)
    private readonly socialIdentityRepo: Repository<SocialIdentity>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return {
      accessToken: this.generateToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${dto.idToken}`,
      ),
    ).catch(() => {
      throw new UnauthorizedException('Invalid Google token');
    });

    if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException('Token audience mismatch');
    }

    const { sub: providerUserId, email, given_name: firstName, family_name: lastName, picture: avatarUrl } = data;

    const { user, isNewUser } = await this.findOrCreateSocialUser(
      'google',
      providerUserId,
      email,
      { firstName, lastName, avatarUrl },
    );

    return {
      accessToken: this.generateToken(user),
      user: { ...this.sanitizeUser(user), isNewUser },
    };
  }

  async linkedinLogin(dto: LinkedInLoginDto) {
    const tokenRes = await firstValueFrom(
      this.httpService.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: dto.code,
          redirect_uri: dto.redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    ).catch(() => {
      throw new UnauthorizedException('LinkedIn token exchange failed');
    });

    const accessToken = tokenRes.data.access_token;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [profileRes, emailRes] = await Promise.all([
      firstValueFrom(this.httpService.get('https://api.linkedin.com/v2/me', { headers })),
      firstValueFrom(this.httpService.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', { headers })),
    ]);

    const { id: providerUserId, localizedFirstName: firstName, localizedLastName: lastName } = profileRes.data;
    const email = emailRes.data.elements[0]['handle~'].emailAddress;

    const { user, isNewUser } = await this.findOrCreateSocialUser(
      'linkedin',
      providerUserId,
      email,
      { firstName, lastName },
    );

    return {
      accessToken: this.generateToken(user),
      user: { ...this.sanitizeUser(user), isNewUser },
    };
  }

  async createPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 10);
    await this.userRepo.update(userId, { passwordHash, hasPassword: true });
  }

  async send2FALink(userId: string, phoneNumber: string, notificationClient: any): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.userRepo.update(userId, {
      twoFactorPhoneNumber: phoneNumber,
      twoFactorVerified: false,
    });

    const token = this.jwtService.sign(
      { sub: userId, type: '2fa' },
      { expiresIn: '24h' },
    );

    const link = `${process.env.FRONTEND_URL || 'https://marketeq-projects.vercel.app'}/verify-2fa?token=${token}`;

    notificationClient.emit('send_magic_link_email', {
      email: user.email,
      userId,
      link,
      type: '2fa',
    });
  }

  async verify2FA(userId: string): Promise<void> {
    await this.userRepo.update(userId, { twoFactorVerified: true });
  }

  private async findOrCreateSocialUser(
    provider: string,
    providerUserId: string,
    email: string,
    profile: { firstName?: string; lastName?: string; avatarUrl?: string },
  ): Promise<{ user: User; isNewUser: boolean }> {
    const existing = await this.socialIdentityRepo.findOne({
      where: { provider, providerUserId },
      relations: ['user'],
    });

    if (existing) {
      return { user: existing.user, isNewUser: false };
    }

    let user = await this.userRepo.findOne({ where: { email } });
    let isNewUser = false;

    if (!user) {
      user = this.userRepo.create({ email, ...profile });
      await this.userRepo.save(user);
      isNewUser = true;
    }

    const identity = this.socialIdentityRepo.create({
      provider,
      providerUserId,
      email,
      userId: user.id,
    });
    await this.socialIdentityRepo.save(identity);

    return { user, isNewUser };
  }

  private generateToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    );
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      hasPassword: user.hasPassword,
      twoFactorVerified: user.twoFactorVerified,
    };
  }
}
