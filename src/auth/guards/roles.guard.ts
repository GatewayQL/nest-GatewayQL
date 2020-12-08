import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from '../../users/models/user.interface';
import { UsersService } from '../../users/services/users.service';
import { Roles } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    return this.usersService.findOne(user.id).then((user: User) => {
      const hasRole = () => roles.indexOf(user.role) > -1;
      let hasPermission = false;

      if (hasRole()) {
        hasPermission = true;
      }
      return user && hasPermission;
    });
  }
}
