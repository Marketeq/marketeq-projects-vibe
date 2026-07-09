import { DataSource } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractType } from '../entities/enums';

export async function seedContracts(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Contract);

  const contracts = [
    {
      id:             '00000000-0000-0000-0000-000000000010',
      type:           ContractType.PROJECT,
      clientName:     'Acme Corp',
      clientUsername: '@acme_corp',
    },
    {
      id:             '00000000-0000-0000-0000-000000000011',
      type:           ContractType.SERVICE,
      clientName:     'Beta Ltd',
      clientUsername: '@beta_ltd',
    },
    {
      id:             '00000000-0000-0000-0000-000000000012',
      type:           ContractType.TEAM,
      clientName:     'Gamma Inc',
      clientUsername: '@gamma_inc',
    },
    {
      id:             '00000000-0000-0000-0000-000000000013',
      type:           ContractType.INDIVIDUAL,
      clientName:     'Delta LLC',
      clientUsername: '@delta_llc',
    },
  ];

  for (const contract of contracts) {
    await repo.save(repo.create(contract));
  }

  console.log(`  ✓ Seeded ${contracts.length} contracts`);
}
