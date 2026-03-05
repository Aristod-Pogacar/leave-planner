import { SessionLocalsMiddleware } from './session-locals.middleware';

describe('SessionLocalsMiddleware', () => {
  it('should be defined', () => {
    expect(new SessionLocalsMiddleware()).toBeDefined();
  });
});
