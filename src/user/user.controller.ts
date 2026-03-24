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

    if (userSite === Site.MADA) {
      return [Site.ABE1, Site.ABE2, Site.ANTSIRABE, Site.TANA, Site.MADA]; // pas de filtre
    }

    if (userSite === Site.ANTSIRABE) {
      return [Site.ABE1, Site.ABE2, Site.ANTSIRABE];
    }

    return [userSite];
  }

  private enumAllowed(userSite: string): (keyof typeof Site)[] {
    let values: Site[] = [];

    // 1. On définit d'abord les VALEURS autorisées
    if (userSite === Site.MADA) {
      values = [Site.ABE1, Site.ABE2, Site.ANTSIRABE, Site.TANA, Site.MADA];
    } else if (userSite === Site.ANTSIRABE) {
      values = [Site.ABE1, Site.ABE2, Site.ANTSIRABE];
    } else {
      values = [userSite as Site];
    }

    // 2. On transforme ces valeurs en CLES (le nom de l'enum)
    return values.map(val => {
      // On cherche la clé dans l'objet Site qui possède cette valeur
      const key = (Object.keys(Site) as (keyof typeof Site)[]).find(
        k => Site[k] === val
      );
      return key!; // Le '!' indique à TS qu'on est sûr de trouver la clé
    });
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
    const sites = this.getAllowedSitesForNewUsers(userSite)
    const allowedKeys = this.enumAllowed(userSite);
    const KEYS = Object.values(Site).map(val => {
      // On cherche la clé dans l'objet Site qui possède cette valeur
      const key = (Object.keys(Site) as (keyof typeof Site)[]).find(
        k => Site[k] === val
      );
      return key;
    });
    console.log("KEYS", KEYS)
    console.log("SITES", Site)
    console.log("AllValues", Object.values(Site))
    return {
      users: users,
      title: 'Users',
      userRole: UserRole,
      site: Site,
      allValues: Object.values(Site),
      allowedSites: sites,
      keys: KEYS
    };
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('new-user')
  @Render('new-user')
  async getNewUser(@Req() req: any) {
    const userSite = req.session.user.site;
    const sites = this.getAllowedSitesForNewUsers(userSite)
    const allowedKeys = this.enumAllowed(userSite);
    return {
      title: 'New user',
      userRole: UserRole,
      sites: sites,
      allowedKeys: allowedKeys
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
