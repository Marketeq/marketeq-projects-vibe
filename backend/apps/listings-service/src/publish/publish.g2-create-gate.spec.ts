import 'reflect-metadata';
import { PublishService } from './publish.service';
import { ProjectsService } from '../projects/projects.service';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';
import {
  IdentityVerificationUnavailableException,
  VerificationRequiredException,
} from '../identity-gate/identity-gate.exceptions';

// G2 (PMCM-652): starting a talent listing is gated. A closed gate refuses the draft/listing
// creation before anything is written, so a request that skips the UI is refused too.
const TALENT = '40000000-0000-4000-8000-000000000001';
const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = (m: string) => ({ gateOpen: false, missingRequirements: m });

describe('G2 - creating a talent listing is gated (publish draft/project, projects)', () => {
  const buildPublish = (checkGate: jest.Mock) => {
    const projectRepository: any = { create: jest.fn(async (p: any) => ({ id: 'p1', ...p })) };
    const phaseRepository: any = { create: jest.fn() };
    const taskRepository: any = { create: jest.fn() };
    const svc = new PublishService(
      projectRepository, {} as any, phaseRepository, taskRepository, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, { checkGate } as any,
    );
    return { svc, projectRepository, phaseRepository, taskRepository };
  };

  const buildProjects = (checkGate: jest.Mock) => {
    const repo: any = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ id: 'p1', ...v })),
      findOne: jest.fn(async () => null),
      manager: { query: jest.fn(async () => []) },
    };
    const svc = new ProjectsService(
      repo, {} as any, {} as any, {} as any, {} as any,
      new RosterGateService(new InMemoryGateState().asService), {} as any, { checkGate } as any,
    );
    jest.spyOn(svc as any, 'resolveUniqueSlug').mockResolvedValue('slug');
    jest.spyOn(svc as any, 'emitAlgoliaUpsert').mockImplementation(() => undefined);
    return { svc, repo };
  };

  describe.each([
    ['project', { title: '', listingType: 'project' }],
    ['service', { title: '', listingType: 'service' }],
  ])('POST /publish/project/draft (%s)', (_label, dto) => {
    it.each([['both'], ['identity'], ['location']])('refuses with VERIFICATION_REQUIRED (%s missing) and writes nothing', async (missing) => {
      const checkGate = jest.fn(async () => CLOSED(missing));
      const { svc, projectRepository } = buildPublish(checkGate as any);
      const err: any = await svc.createProjectDraft(TALENT, dto as any).catch((e) => e);
      expect(err).toBeInstanceOf(VerificationRequiredException);
      expect(err.getResponse()).toMatchObject({ error: 'VERIFICATION_REQUIRED', missingRequirements: missing });
      expect(checkGate).toHaveBeenCalledWith(TALENT);
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it('fails closed (503) and writes nothing when the gate cannot be evaluated', async () => {
      const checkGate = jest.fn(async () => { throw new IdentityVerificationUnavailableException(); });
      const { svc, projectRepository } = buildPublish(checkGate as any);
      await expect(svc.createProjectDraft(TALENT, dto as any)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it('creates the draft when the gate is open (verified or in grace)', async () => {
      const { svc, projectRepository } = buildPublish(jest.fn(async () => OPEN) as any);
      const out: any = await svc.createProjectDraft(TALENT, dto as any);
      expect(out).toMatchObject({ id: 'p1', status: 'draft', userId: TALENT });
      expect(projectRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /publish/create-gate (read-only check)', () => {
    it('answers allowed when the gate is open, and refuses with the missing requirement when closed', async () => {
      const open = buildPublish(jest.fn(async () => OPEN) as any);
      await expect(open.svc.assertCreateGateOpen(TALENT)).resolves.toBeUndefined();
      const closed = buildPublish(jest.fn(async () => CLOSED('both')) as any);
      const err: any = await closed.svc.assertCreateGateOpen(TALENT).catch((e) => e);
      expect(err.getResponse()).toMatchObject({ error: 'VERIFICATION_REQUIRED', missingRequirements: 'both' });
      expect(closed.projectRepository.create).not.toHaveBeenCalled();
    });

    it('is a GET on the publish controller that calls the gate and nothing else', async () => {
      const { PublishController } = await import('./publish.controller');
      expect(Reflect.getMetadata('method', PublishController.prototype.checkCreateGate)).toBe(0); // RequestMethod.GET
      expect(Reflect.getMetadata('path', PublishController.prototype.checkCreateGate)).toBe('create-gate');
      const assertCreateGateOpen = jest.fn(async () => undefined);
      const ctrl = new (PublishController as any)({ assertCreateGateOpen }, {});
      await expect(ctrl.checkCreateGate({ user: { sub: TALENT } })).resolves.toEqual({ allowed: true });
      expect(assertCreateGateOpen).toHaveBeenCalledWith(TALENT);
    });
  });

  describe('POST /publish/project', () => {
    it('refuses and writes nothing (not even inline scope) when the gate is closed', async () => {
      const { svc, projectRepository, phaseRepository } = buildPublish(jest.fn(async () => CLOSED('identity')) as any);
      await expect(
        svc.createNewProject(TALENT, { title: 't', scope: [{ name: 'p', tasks: [] }] } as any),
      ).rejects.toBeInstanceOf(VerificationRequiredException);
      expect(projectRepository.create).not.toHaveBeenCalled();
      expect(phaseRepository.create).not.toHaveBeenCalled();
    });

    it('creates when the gate is open', async () => {
      const { svc, projectRepository } = buildPublish(jest.fn(async () => OPEN) as any);
      await svc.createNewProject(TALENT, { title: 't' } as any);
      expect(projectRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /projects', () => {
    it('refuses and saves nothing when the gate is closed', async () => {
      const { svc, repo } = buildProjects(jest.fn(async () => CLOSED('location')) as any);
      const err: any = await svc.create({ title: 'T', description: 'D' } as any, TALENT).catch((e) => e);
      expect(err).toBeInstanceOf(VerificationRequiredException);
      expect(err.getResponse()).toMatchObject({ missingRequirements: 'location' });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates when the gate is open', async () => {
      const { svc, repo } = buildProjects(jest.fn(async () => OPEN) as any);
      await svc.create({ title: 'T', description: 'D' } as any, TALENT);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });
});
