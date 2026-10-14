import {Injectable} from '@nestjs/common';
import {Db} from '../db.service';
@Injectable() export class Audit {constructor(private db:Db){} async log(actorId:string|null,action:string,entity:string,entityId:string|null,detail?:any){await this.db.auditLog.create({data:{actorId,action,entity,entityId,detail:detail??undefined}});}}
