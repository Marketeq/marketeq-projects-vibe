import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CertificationIssuer } from './certification-issuer.entity';

@Injectable()
export class CertificationIssuersService {
  constructor(
    @InjectRepository(CertificationIssuer)
    private readonly issuerRepo: Repository<CertificationIssuer>,
  ) {}

  async findAll(): Promise<CertificationIssuer[]> {
    return this.issuerRepo.find({ order: { name: 'ASC' } });
  }

  async findByName(name: string): Promise<CertificationIssuer | null> {
    return this.issuerRepo.findOne({ where: { name } });
  }

  async search(query: string): Promise<CertificationIssuer[]> {
    return this.issuerRepo.find({
      where: { name: ILike(`%${query}%`) },
      order: { name: 'ASC' },
      take: 20,
    });
  }

  /**
   * Resolve issuer logo from a certification name.
   * Matches the certification name against known issuer names.
   */
  async resolveIssuerLogo(
    certificationName: string,
    issuerName?: string,
  ): Promise<{ logoUrl: string | null; issuerName: string | null }> {
    // Try exact issuer match first
    if (issuerName) {
      const issuer = await this.issuerRepo.findOne({
        where: { name: ILike(`%${issuerName}%`) },
      });
      if (issuer) {
        return { logoUrl: issuer.logoUrl, issuerName: issuer.name };
      }
    }

    // Fall back to matching certification name against issuer names
    const allIssuers = await this.issuerRepo.find();
    const certLower = certificationName.toLowerCase();
    for (const issuer of allIssuers) {
      if (certLower.includes(issuer.name.toLowerCase())) {
        return { logoUrl: issuer.logoUrl, issuerName: issuer.name };
      }
    }

    // If the certification has a credential URL, try to derive logo from domain
    return { logoUrl: null, issuerName: null };
  }

  /**
   * Resolve logos for multiple certifications at once.
   */
  async resolveLogos(
    certifications: Array<{ name: string; issuer?: string }>,
  ): Promise<
    Array<{ name: string; logoUrl: string | null; issuerName: string | null }>
  > {
    const allIssuers = await this.issuerRepo.find();
    return certifications.map((cert) => {
      // Try issuer name match
      if (cert.issuer) {
        const match = allIssuers.find((i) =>
          cert.issuer!.toLowerCase().includes(i.name.toLowerCase()),
        );
        if (match) {
          return {
            name: cert.name,
            logoUrl: match.logoUrl,
            issuerName: match.name,
          };
        }
      }

      // Try certification name match
      const certLower = cert.name.toLowerCase();
      const match = allIssuers.find((i) =>
        certLower.includes(i.name.toLowerCase()),
      );
      if (match) {
        return {
          name: cert.name,
          logoUrl: match.logoUrl,
          issuerName: match.name,
        };
      }

      // Fallback: derive from credentialUrl domain via Clearbit
      return { name: cert.name, logoUrl: null, issuerName: null };
    });
  }
}
