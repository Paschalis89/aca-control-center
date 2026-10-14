import {Body,Controller,Get,HttpCode,Post,Req,Res,UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {Db} from '../db.service';
import {Public,CurrentUser,comparePassword} from './auth';
import {parse} from '../validation';
import {z} from 'zod';
import {Response,Request} from 'express';
import {Audit} from '../audit/audit.service';
@Controller('auth') export class AuthController{
 constructor(private db:Db,private jwt:JwtService,private audit:Audit){}
 @Public() @Post('login') @HttpCode(200) async login(@Body() body:any,@Res({passthrough:true})res:Response){
  const data=parse(z.object({email:z.string().email(),password:z.string().min(1)}).strict(),body);
  const user=await this.db.user.findUnique({where:{email:data.email.toLowerCase()}});
  if(!user||!user.active||!(await comparePassword(data.password,user.passwordHash)))throw new UnauthorizedException('Invalid credentials');
  const token=await this.jwt.signAsync({sub:user.id,tv:user.tokenVersion});
  res.cookie('aca_session',token,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'strict',maxAge:86400000,path:'/api'});
  await this.audit.log(user.id,'LOGIN','USER',user.id);
  return {id:user.id,name:user.name,email:user.email,role:user.role};
 }
 @Get('me') me(@CurrentUser()user:any){return user;}
 @Post('logout') @HttpCode(200) async logout(@CurrentUser()user:any,@Res({passthrough:true})res:Response){
  await this.db.user.update({where:{id:user.id},data:{tokenVersion:{increment:1}}});
  res.clearCookie('aca_session',{path:'/api'});await this.audit.log(user.id,'LOGOUT','USER',user.id);return {ok:true};
 }
}
