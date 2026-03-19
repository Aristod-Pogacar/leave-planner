import { SuperAdminGuard } from './superadmin.guard';

describe('SuperAdminGuard', () => {
  it('should be defined', () => {
    expect(new SuperAdminGuard()).toBeDefined();
  });
});
