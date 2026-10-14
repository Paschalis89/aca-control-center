import {Component,OnInit,signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService,euro} from './api.service';
import {OverviewComponent} from './overview.component';
import {ExpensesComponent} from './expenses.component';
import {ForecastComponent} from './forecast.component';
import {SettingsComponent} from './settings.component';
import {SalesComponent} from './sales.component';
import {PartnersComponent} from './partners.component';
import {MarketingComponent} from './marketing.component';
import {ReportsComponent} from './reports.component';
import {InsightsComponent} from './insights.component';

type Page='overview'|'forecast'|'expenses'|'settings'|'sales'|'partners'|'marketing'|'reports'|'insights';
@Component({selector:'aca-root',standalone:true,imports:[CommonModule,FormsModule,OverviewComponent,ExpensesComponent,ForecastComponent,SettingsComponent,SalesComponent,PartnersComponent,MarketingComponent,ReportsComponent,InsightsComponent],template:`
<div *ngIf="loading()" class="loading-screen"><div class="spinner"></div><p>Loading ACA Control Center...</p></div>
<div *ngIf="!loading() && !api.user()" class="login-page">
  <div class="login-card">
    <img src="assets/aca-logo-horizontal.png" class="login-logo" alt="Amalfi Coast Artistry">
    <div class="eyebrow">PRIVATE BUSINESS WORKSPACE</div>
    <h1>ACA Control Center</h1><p class="muted">Business Intelligence & Financial Planning</p>
    <form (ngSubmit)="login()" class="form-stack">
      <label>Email address<input type="email" name="email" [(ngModel)]="email" autocomplete="username" required></label>
      <label>Password<input type="password" name="password" [(ngModel)]="password" autocomplete="current-password" required></label>
      <p class="notice error" *ngIf="error">{{error}}</p>
      <button class="button primary" [disabled]="busy">{{busy?'Signing in...':'Sign in securely'}}</button>
    </form>
    <small>Authorized ACA team members only.</small>
  </div>
  <div class="login-art" aria-hidden="true"><img src="assets/aca-ceramics.jpg" alt=""></div>
</div>
<div *ngIf="!loading() && api.user()" class="layout">
 <aside class="sidebar" [class.open]="mobileMenu()">
   <div class="brand"><img src="assets/aca-logo-horizontal.png" alt="Amalfi Coast Artistry"><b>ACA Control Center</b><span>Business Intelligence &amp; Financial Planning</span></div>
   <nav class="nav">
    <button [class.active]="page()==='overview'" (click)="go('overview')"><span class="navicon">◫</span>Overview</button>
    <button [class.active]="page()==='forecast'" (click)="go('forecast')"><span class="navicon">▥</span>Forecast</button>
    <button [class.active]="page()==='expenses'" (click)="go('expenses')"><span class="navicon">▣</span>Expenses</button>
    <div class="navcaption">BUSINESS OPERATIONS</div>
    <button [class.active]="page()==='sales'" (click)="go('sales')"><span class="navicon">◈</span>Sales &amp; Margins</button>
    <button [class.active]="page()==='partners'" (click)="go('partners')"><span class="navicon">♧</span>Partners</button>
    <button [class.active]="page()==='marketing'" (click)="go('marketing')"><span class="navicon">⌁</span>Marketing</button>
    <button [class.active]="page()==='reports'" (click)="go('reports')"><span class="navicon">▤</span>Reports</button>
    <button [class.active]="page()==='insights'" (click)="go('insights')"><span class="navicon">✦</span>Insights</button>
    <button [class.active]="page()==='settings'" (click)="go('settings')"><span class="navicon">⚙</span>Settings</button>
   </nav>
   <div class="sidebar-bottom"><div class="avatar">{{(api.user()?.name||'A').slice(0,1).toUpperCase()}}</div><div><b>{{api.user()?.name}}</b><span>{{api.user()?.role==='ADMIN'?'Administrator':'Business Manager'}}</span></div><button class="icon-button" title="Log out" (click)="signout()">↪</button></div>
 </aside>
 <main class="main">
  <header class="topbar"><button class="icon-button menu-toggle" (click)="mobileMenu.set(!mobileMenu())">☰</button><div class="top-search"><span>⌕</span>ACA / {{pageTitle()}}</div><div class="top-right"><span class="status-pill"><span class="status-dot"></span> ACA Management</span><span class="initials">{{(api.user()?.name||'A').slice(0,1).toUpperCase()}}</span></div></header>
  <div class="content">
   <aca-overview *ngIf="page()==='overview'"></aca-overview>
   <aca-forecast *ngIf="page()==='forecast'"></aca-forecast>
   <aca-expenses *ngIf="page()==='expenses'"></aca-expenses>
   <aca-settings *ngIf="page()==='settings'"></aca-settings>
   <aca-sales *ngIf="page()==='sales'"></aca-sales>
   <aca-partners *ngIf="page()==='partners'"></aca-partners>
   <aca-marketing *ngIf="page()==='marketing'"></aca-marketing>
   <aca-reports *ngIf="page()==='reports'"></aca-reports>
   <aca-insights *ngIf="page()==='insights'"></aca-insights>

  </div>
 </main>
</div>`})
export class AppComponent implements OnInit{
 loading=signal(true);mobileMenu=signal(false);page=signal<Page>('overview');email='';password='';error='';busy=false;
 constructor(public api:ApiService){}
 async ngOnInit(){await this.api.init();this.loading.set(false);}
 pageTitle(){return ({overview:'Overview',forecast:'Forecast',expenses:'Expenses',settings:'Settings',sales:'Sales & Margins',partners:'Partners',marketing:'Marketing',reports:'Reports',insights:'Insights'} as any)[this.page()];}
 go(p:Page){this.page.set(p);this.mobileMenu.set(false);window.scrollTo({top:0,behavior:'smooth'});}
 async login(){this.error='';this.busy=true;try{await this.api.login(this.email,this.password);this.password='';}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
 async signout(){try{await this.api.logout();this.go('overview');}catch(e){this.error=(e as Error).message;}}
}
