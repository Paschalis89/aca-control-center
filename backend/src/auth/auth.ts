import {BadRequestException,CanActivate,ExecutionContext,Injectable,UnauthorizedException,ForbiddenException,SetMetadata,createParamDecorator} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {JwtService} from '@nestjs/jwt';
import {Db} from '../db.service';
import * as bcrypt from 'bcryptjs';
import {Request} from 'express';
export const PUBLIC='isPublic', ROLES='roles';
export const Public=()=>SetMetadata(PUBLIC,true);
export const Roles=(...roles:string[])=>SetMetadata(ROLES,roles);
export const CurrentUser=createParamDecorator((_data,ctx:ExecutionContext)=>ctx.switchToHttp().getRequest().user);
@Injectable()export class SessionGuard implements CanActivate {
 constructor(private db:Db,private jwt:JwtService,private reflector:Reflector){}
 async canActivate(ctx:ExecutionContext){
  if(this.reflector.getAllAndOverride<boolean>(PUBLIC,[ctx.getHandler(),ctx.getClass()]))return true;
  const req=ctx.switchToHttp().getRequest(); const token=req.cookies?.aca_session;
  if(!token)throw new UnauthorizedException('Please sign in');
  let payload:any; try{payload=await this.jwt.verifyAsync(token);}catch{throw new UnauthorizedException('Session expired');}
  const user=await this.db.user.findUnique({where:{id:payload.sub}});
  if(!user||!user.active||user.tokenVersion!==payload.tv)throw new UnauthorizedException('Account unavailable');
  const roles=this.reflector.getAllAndOverride<string[]>(ROLES,[ctx.getHandler(),ctx.getClass()]);
  if(roles?.length&&!roles.includes(user.role))throw new ForbiddenException('Insufficient permissions');
  req.user={id:user.id,email:user.email,name:user.name,role:user.role};return true;
 }
}
export async function hashPassword(password:string){if(password.length<12)throw new BadRequestException('Password must be at least 12 characters');return bcrypt.hash(password,12);}
export async function comparePassword(password:string,hash:string){return bcrypt.compare(password,hash);}
