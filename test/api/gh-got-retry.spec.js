const get = require('../../lib/api/gh-got-retry');
const ghGot = require('gh-got');

jest.mock('gh-got');

describe('api/gh-got-retry', () => {
  const body = ['a', 'b'];
  beforeEach(() => {
    jest.resetAllMocks();
    get.setAppMode(false);
  });
  it('supports app mode', async () => {
    get.setAppMode(true);
    await get('some-url', { headers: { accept: 'some-accept' } });
    expect(ghGot.mock.calls[0][1].headers.accept).toBe(
      'application/vnd.github.machine-man-preview+json, some-accept'
    );
  });
  it('should retry 502s', async () => {
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() => ({
      body,
    }));
    const res = await get('some-url');
    expect(res.body).toEqual(body);
  });
  it('should retry 502s until success', async () => {
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() => ({
      body,
    }));
    const res = await get('some-url');
    expect(ghGot.mock.calls).toHaveLength(3);
    expect(res.body).toEqual(body);
  });
  it('should retry until failure', async () => {
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 403,
        message: 'API rate limit exceeded for x.',
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 403,
        message:
          'You have triggered an abuse detection mechanism. Please wait a few minutes before you try again.',
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 404,
      })
    );
    let err;
    try {
      await get('some-url');
    } catch (e) {
      err = e;
    }
    expect(err.statusCode).toBe(404);
  });
  it('should give up after 5 retries', async () => {
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 500,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 500,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 403,
        message: 'API rate limit exceeded for x.',
      })
    );
    let err;
    try {
      await get('some-url');
    } catch (e) {
      err = e;
    }
    expect(err.statusCode).toBe(403);
  });
  it('should retry posts', async () => {
    ghGot.mockImplementationOnce(() =>
      Promise.reject({
        statusCode: 502,
      })
    );
    ghGot.mockImplementationOnce(() => ({
      body,
    }));
    const res = await get.post('some-url');
    expect(res.body).toEqual(body);
  });
});
