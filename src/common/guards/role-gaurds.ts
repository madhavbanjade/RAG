import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ErrorHandler } from '../handlers/error-handlers';

@Injectable()
export class RoleProtectGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    console.log('RoleProtectGuard - user:', user);
    console.log('RoleProtectGuard - user.role:', user?.role);

    if (!user) {
      throw ErrorHandler.unauthorized('User missing');
    }

    if (user.role !== 'admin') {
      throw ErrorHandler.unauthorized('Only Admin can access!!');
    }

    return true;
  }
}