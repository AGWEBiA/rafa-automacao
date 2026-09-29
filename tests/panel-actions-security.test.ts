import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  account: vi.fn(),
  automation: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ requirePanelSession: mocks.session }));
vi.mock('@/lib/repo/accounts', () => ({ getFirstAccount: mocks.account }));
vi.mock('@/lib/repo/automations', () => ({
  getAutomation: mocks.automation,
  createAutomation: mocks.create,
  saveAutomation: mocks.save,
  deleteAutomation: mocks.remove,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { criarAutomacao, excluirAutomacao, salvarAutomacao } from '@/app/(painel)/actions';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue(undefined);
  mocks.account.mockResolvedValue({ id: 1 });
  mocks.automation.mockResolvedValue({ id: 7, accountId: 1, steps: [] });
});

describe('automation action boundaries', () => {
  it.each(['comment', 'dm', 'story_reply'])('creates %s for the connected account and opens its editor', async (gatilho) => {
    mocks.create.mockResolvedValue(42);
    const data = new FormData();
    data.set('nome', 'Material gratuito');
    data.set('gatilho', gatilho);
    await expect(criarAutomacao(data)).rejects.toThrow('redirect:/automacoes/42');
    expect(mocks.create).toHaveBeenCalledWith(1, 'Material gratuito', gatilho);
  });

  it('checks the session before any repository call', async () => {
    mocks.session.mockRejectedValue(new Error('unauthenticated'));
    const data = new FormData();
    data.set('id', '7');
    for (const action of [criarAutomacao, salvarAutomacao, excluirAutomacao]) {
      await expect(action(data)).rejects.toThrow('unauthenticated');
    }
    expect(mocks.account).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('rejects another account’s automation before mutation', async () => {
    mocks.automation.mockResolvedValue({ id: 7, accountId: 2, steps: [] });
    const data = new FormData();
    data.set('id', '7');
    await expect(salvarAutomacao(data)).rejects.toThrow('não encontrada');
    await expect(excluirAutomacao(data)).rejects.toThrow('não encontrada');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
