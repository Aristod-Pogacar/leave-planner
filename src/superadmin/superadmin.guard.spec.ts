import { SuperadminGuard } from './superadmin.guard';

describe('SuperadminGuard', () => {
  it('should be defined', () => {
    expect(new SuperadminGuard()).toBeDefined();
  });
});
