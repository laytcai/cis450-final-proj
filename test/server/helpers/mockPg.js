// Re-exports the shared `pool.query()` mock that helpers/setup.js installs
// on globalThis. Tests configure return values per-call:
//   queryMock.mockResolvedValueOnce({ rows: [...] })
//   queryMock.mockRejectedValueOnce(new Error('boom'))
// Use resetMocks() in beforeEach to wipe state between tests.
export const queryMock = globalThis.__queryMock;

export function resetMocks() {
  queryMock.mockReset();
}
