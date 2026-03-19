import { Controller, Get, Post, Body, Patch, Param, Delete, Render, UseGuards, Res, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { UserRole, Site, User } from './entities/user.entity';
import { RolesGuard } from './role.guard';
import { Roles } from './role.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  private getAllowedSitesForNewUsers(userSite: string): string[] {

    if (userSite === Site.ADMIN) {
      return [Site.RABE, Site.LAG, Site.TANA, Site.ANTSIRABE, Site.ADMIN]; // pas de filtre
    }

    if (userSite === Site.ANTSIRABE) {
      return [Site.RABE, Site.LAG, Site.ANTSIRABE];
    }

    return [userSite];
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Get('list')
  @Render('users')
  async getList(@Req() req: any) {
    const admin = await this.userService.getAdminUser()
    const baseusers = await this.userService.findAll()
    const users = [admin, ...baseusers]
    const userSite = req.session.user.site;
    return {
      users: users,
      title: 'Users',
      userRole: UserRole,
      site: Site,
      allowedSites: this.getAllowedSitesForNewUsers(userSite)
    };
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('new-user')
  @Render('new-user')
  async getNewUser(@Req() req: any) {
    const userSite = req.session.user.site;
    return {
      title: 'New user',
      userRole: UserRole,
      site: this.getAllowedSitesForNewUsers(userSite)
    };
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('delete-user/:id')
  @Render('delete-user')
  async deleteUser(@Param('id') id: string) {
    return {
      title: 'Delete user',
      userRole: UserRole,
      users: await this.userService.findOne(id)
    };
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post('delete-user/:id')
  async deleteTheUser(@Param('id') id: string, @Res() res: any) {
    this.userService.remove(id);
    return res.redirect('/user/list');
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('edit-user/:id')
  @Render('edit-user')
  async editUser(@Param('id') id: string, @Req() req: any) {
    const userSite = req.session.user.site;
    return {
      title: 'Edit user',
      userRole: UserRole,
      users: await this.userService.findOne(id),
      site: this.getAllowedSitesForNewUsers(userSite)
    };
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post('edit-user/:id')
  async editTheUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Res() res: any) {
    this.userService.update(id, updateUserDto);
    return res.redirect('/user/list');
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
