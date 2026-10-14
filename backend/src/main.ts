import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {json} from 'express';
async function bootstrap(){
 if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<48)throw new Error('JWT_SECRET must contain at least 48 characters');
 const app=await NestFactory.create(AppModule,{bodyParser:false});
 app.use(helmet()); app.use(json({limit:'256kb'})); app.use(cookieParser());
 app.setGlobalPrefix('api');
 app.use((req:any,res:any,next:any)=>{
  const method=req.method; if(!['GET','HEAD','OPTIONS'].includes(method)){
   const origin=req.headers.origin; const allowed=process.env.PUBLIC_ORIGIN;
   if(origin&&allowed&&origin!==allowed)return res.status(403).json({message:'Untrusted origin'});
  }
  next();
 });
 await app.listen(3000,'0.0.0.0');
}
bootstrap();
