import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
export type ACAUser = {id:string;name:string;email:string;role:'ADMIN'|'BUSINESS_MANAGER'};
@Injectable({providedIn:'root'})
export class ApiService{
  user=signal<ACAUser|null>(null);
  constructor(private http:HttpClient){}
  async request<T=any>(method:'GET'|'POST'|'PUT'|'PATCH'|'DELETE',path:string,body?:any):Promise<T>{
    try {return await firstValueFrom(this.http.request<T>(method,'/api/'+path,{body,withCredentials:true}));}
    catch(err){const e=err as HttpErrorResponse;if(e.status===401&&path!=='auth/login')this.user.set(null);throw new Error(typeof e.error?.message==='string'?e.error.message:e.error?.message?JSON.stringify(e.error.message):e.status===0?'Cannot reach ACA backend':`Request failed (${e.status})`);}
  }
  get<T=any>(p:string){return this.request<T>('GET',p);}
  post<T=any>(p:string,b?:any){return this.request<T>('POST',p,b);}
  put<T=any>(p:string,b?:any){return this.request<T>('PUT',p,b);}
  patch<T=any>(p:string,b?:any){return this.request<T>('PATCH',p,b);}
  delete<T=any>(p:string){return this.request<T>('DELETE',p);}
  async init(){try{this.user.set(await this.get<ACAUser>('auth/me'));}catch{this.user.set(null);}}
  async login(email:string,password:string){this.user.set(await this.post<ACAUser>('auth/login',{email,password}));}
  async logout(){await this.post('auth/logout',{});this.user.set(null);}
  async uploadReceipt(id:string,file:File){const fd=new FormData();fd.append('file',file);return firstValueFrom(this.http.post('/api/expenses/'+encodeURIComponent(id)+'/receipt',fd,{withCredentials:true}));}
}
export const euro=(n:any)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
export const amount=(n:any)=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:0}).format(Number(n)||0);
