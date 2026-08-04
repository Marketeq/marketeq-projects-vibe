import { CategoryMatchingService } from '../src/app/category-matching.service';
import { CategoryEntity } from '../src/app/entities/category.entity';

/**
 * Exercises the derivation rules — thresholding, the match cap, and parent
 * promotion — against the lexical embedding fallback.
 *
 * Deliberately no HUGGINGFACE_API_KEY: the fallback is deterministic and needs
 * no network, so these assertions are stable in CI. That does mean matches here
 * come from literal shared tokens between a job title and a category's
 * name/tags rather than from meaning — which is exactly why the service embeds
 * tags alongside the category name. Real semantic behaviour is a deployment
 * concern, verified against live profiles when tuning the match threshold.
 */

function category(
  id: number,
  name: string,
  opts: { parent?: CategoryEntity; tags?: string[] } = {},
): CategoryEntity {
  return {
    id,
    uuid: `uuid-${id}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    approved: true,
    published_in_marketplace: true,
    parentId: opts.parent ? opts.parent.id : null,
    parent: opts.parent ?? null,
    tags: (opts.tags ?? []).map((t, i) => ({ id: i, name: t })),
  } as unknown as CategoryEntity;
}

const development = category(1, 'Development');
const design = category(2, 'Design');
const frontend = category(3, 'Frontend Development', {
  parent: development,
  tags: ['React', 'Vue', 'CSS'],
});
const brand = category(4, 'Brand Identity', {
  parent: design,
  tags: ['Logo', 'Typography'],
});

// Third level: the real taxonomy nests this deep (Development > Web
// Development > Full Stack Development), so ancestor handling has to survive
// more than one hop.
const fullStack = category(5, 'Full Stack Development', {
  parent: frontend,
  tags: ['Node', 'Express'],
});

const TAXONOMY = [development, design, frontend, brand, fullStack];

function makeService(rows: CategoryEntity[] = TAXONOMY) {
  const repo = {
    find: jest.fn().mockResolvedValue(rows),
  };
  return new CategoryMatchingService(repo as any);
}

describe('CategoryMatchingService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.HUGGINGFACE_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('matches a job title to a subcategory via that category’s tags', async () => {
    const service = makeService();

    const result = await service.matchTexts(['Senior React Developer']);

    expect(result.subcategories).toContain('Frontend Development');
  });

  it('promotes the parent category of every matched subcategory', async () => {
    const service = makeService();

    const result = await service.matchTexts(['Senior React Developer']);

    // The sidebar drills down from L1, so a profile carrying only the leaf
    // would be invisible to anyone filtering on the discipline above it.
    expect(result.categories).toContain('Development');
  });

  it('promotes every ancestor of a match, not just the immediate parent', async () => {
    const service = makeService();

    const result = await service.matchTexts(['Full Stack Node Developer']);

    expect(result.subcategories).toContain('Full Stack Development');
    // Both levels above it, so a filter at any depth finds this profile.
    expect(result.categories).toEqual(
      expect.arrayContaining(['Frontend Development', 'Development']),
    );
  });

  it('returns nothing for text unrelated to the taxonomy', async () => {
    const service = makeService();

    const result = await service.matchTexts(['Underwater basket weaver']);

    expect(result.categories).toEqual([]);
    expect(result.subcategories).toEqual([]);
  });

  it('returns nothing when the profile has no job titles or roles', async () => {
    const service = makeService();

    expect(await service.matchTexts([])).toEqual({
      categories: [],
      subcategories: [],
    });
    expect(await service.matchTexts(['', '   '])).toEqual({
      categories: [],
      subcategories: [],
    });
  });

  it('scores each node by its best text, so unrelated job titles both match', async () => {
    const service = makeService();

    // Max, not mean: a profile's three job titles may legitimately span
    // disciplines, and averaging would wash each of them out.
    const result = await service.matchTexts([
      'Senior React Developer',
      'Brand Identity Designer',
    ]);

    expect(result.subcategories).toEqual(
      expect.arrayContaining(['Frontend Development', 'Brand Identity']),
    );
    expect(result.categories).toEqual(
      expect.arrayContaining(['Development', 'Design']),
    );
  });

  it('caps matched nodes at three', async () => {
    // Four separately-matching leaves under one parent, so the cap is the only
    // thing that can keep the result at three.
    const service = makeService([
      design,
      category(10, 'Logo Design', { parent: design, tags: ['Logo'] }),
      category(11, 'Typography Design', { parent: design, tags: ['Typography'] }),
      category(12, 'Packaging Design', { parent: design, tags: ['Packaging'] }),
      category(13, 'Motion Design', { parent: design, tags: ['Motion'] }),
    ]);

    const result = await service.matchTexts([
      'Logo Designer',
      'Typography Designer',
      'Packaging Designer',
      'Motion Designer',
    ]);

    // Three nodes kept, plus the promoted parent — the cap governs matched
    // nodes, not the parents they drag in.
    expect(result.subcategories).toHaveLength(3);
    expect(result.categories).toEqual(['Design']);
  });

  it('returns nothing when the taxonomy is empty', async () => {
    const service = makeService([]);

    expect(await service.matchTexts(['Senior React Developer'])).toEqual({
      categories: [],
      subcategories: [],
    });
  });

  it('rebuilds the taxonomy after invalidate()', async () => {
    const repo = { find: jest.fn().mockResolvedValue(TAXONOMY) };
    const service = new CategoryMatchingService(repo as any);

    await service.matchTexts(['Senior React Developer']);
    await service.matchTexts(['Brand Identity Designer']);
    expect(repo.find).toHaveBeenCalledTimes(1); // cached across calls

    service.invalidate();
    await service.matchTexts(['Senior React Developer']);
    expect(repo.find).toHaveBeenCalledTimes(2);
  });

  describe('matchCandidates', () => {
    it('returns only candidates matching the selected category', async () => {
      const service = makeService();

      const matched = await service.matchCandidates(
        ['Frontend Development'],
        [
          { id: 'a', texts: ['Senior React Developer'] },
          { id: 'b', texts: ['Underwater basket weaver'] },
        ],
      );

      expect(matched.map((m) => m.id)).toEqual(['a']);
      expect(matched[0].subcategories).toContain('Frontend Development');
    });

    it('treats a picked parent as its whole subtree', async () => {
      const service = makeService();

      // Mirrors the drilldown filter: picking "Development" must still find
      // someone who only reads as Frontend Development.
      const matched = await service.matchCandidates(
        ['Development'],
        [{ id: 'a', texts: ['Senior React Developer'] }],
      );

      expect(matched.map((m) => m.id)).toEqual(['a']);
    });

    it('reaches a leaf from a top-level pick three levels up', async () => {
      const service = makeService();

      // Regression: expanding a pick to only its direct children made a
      // top-level "Development" filter miss anyone matched at L3, which is
      // where most real job titles land.
      const matched = await service.matchCandidates(
        ['Development'],
        [{ id: 'a', texts: ['Full Stack Node Developer'] }],
      );

      expect(matched.map((m) => m.id)).toEqual(['a']);
    });

    it('returns nothing when the selected name is not in the taxonomy', async () => {
      const service = makeService();

      const matched = await service.matchCandidates(
        ['Nonexistent Category'],
        [{ id: 'a', texts: ['Senior React Developer'] }],
      );

      expect(matched).toEqual([]);
    });

    it('returns nothing for empty selections or candidates', async () => {
      const service = makeService();

      expect(await service.matchCandidates([], [{ id: 'a', texts: ['x'] }])).toEqual(
        [],
      );
      expect(await service.matchCandidates(['Development'], [])).toEqual([]);
    });
  });

  describe('listCategoryNames', () => {
    it('splits the published taxonomy into parents and children', async () => {
      const service = makeService();

      const names = await service.listCategoryNames();

      expect(names.categories).toEqual(['Development', 'Design']);
      // Everything below the top level counts as a subcategory, at any depth.
      expect(names.subcategories).toEqual([
        'Frontend Development',
        'Brand Identity',
        'Full Stack Development',
      ]);
    });
  });
});
