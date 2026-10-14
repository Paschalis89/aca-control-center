import {Component,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService,euro,amount} from './api.service';
@Component({selector:'aca-overview',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="hero"><div><span class="eyebrow">WELCOME TO</span><h1>ACA Control Center</h1><h2>Business Intelligence &amp; Financial Planning</h2><p>Turn creativity into clarity. Track performance, plan growth, and keep Amalfi Coast Artistry moving forward.</p></div><div class="hero-photo"><img src="assets/aca-ceramics.jpg" alt="Amalfi ceramic artwork"></div></section>
<div class="section-heading"><div><h2>Financial overview</h2><p>Approved forecast and actual expenses are shown separately.</p></div><select [(ngModel)]="year" (change)="load()"><option *ngFor="let y of years" [ngValue]="y">{{y}}</option></select></div>
<p class="notice error" *ngIf="error">{{error}}</p>
<div class="kpi-grid">
<div class="kpi"><div class="kpi-top"><span class="kpi-icon blue">▥</span><span>Projected ACA revenue</span></div><strong>{{money(data?.projected?.acaRevenue)}}</strong><small>Plan, not actual sales</small></div>
<div class="kpi"><div class="kpi-top"><span class="kpi-icon orange">▣</span><span>Expenses recorded</span></div><strong>{{money(data?.actual?.expenses)}}</strong><small>{{data?.actual?.expenseCount||0}} actual / planned entries</small></div>
<div class="kpi"><div class="kpi-top"><span class="kpi-icon green">↗</span><span>Projected operating result</span></div><strong [class.negative]="data?.projected?.operatingResult<0">{{money(data?.projected?.operatingResult)}}</strong><small>Before taxes, scenario CENTRAL</small></div>
<div class="kpi"><div class="kpi-top"><span class="kpi-icon blue">♙</span><span>Projected partners</span></div><strong>{{data?.projected?.partners??'—'}}</strong><small>Not connected to ACA CRM yet</small></div>
</div>
<div class="grid-two"><div class="panel"><div class="panel-title"><div><h3>Expenses by month</h3><p>Entered expenses (gross, not Shopify sales)</p></div><span class="tag">{{year}}</span></div><div class="bar-chart" *ngIf="data?.monthly"><div class="bar-item" *ngFor="let x of data.monthly"><div class="bar-track"><div class="bar-fill" [style.height.%]="barHeight(x.expenses)"></div></div><span>{{months[x.month-1]}}</span></div></div><div class="legend"><span class="legend-dot"></span> Registered expenses</div></div>
<div class="panel"><div class="panel-title"><div><h3>Recent activity</h3><p>Actions taken by the ACA team</p></div></div><div class="activity" *ngFor="let a of data?.activity"><span class="activity-icon">↗</span><div><b>{{a.action.replaceAll('_',' ')}}</b><small>{{a.entity}} • {{a.actor}}</small></div><time>{{a.createdAt | date:'shortDate'}}</time></div><p class="empty" *ngIf="!data?.activity?.length">No activity yet.</p></div></div>
<div class="panel"><h3>Data readiness</h3><div class="readiness"><span class="status-pill green">Forecast: {{data?.plan?.status||'not configured'}}</span><span class="status-pill">Shopify: not connected (Step 2)</span><span class="status-pill">Actual sales: not yet available</span></div><p class="subtle">Projected values come from the approved business plan. The system intentionally does not pretend that projected income has been collected.</p></div>`})
export class OverviewComponent implements OnInit{
 data:any=null;error='';year=2027;years=[2027,2028,2029,2030];months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 constructor(private api:ApiService){}
 ngOnInit(){this.load();}
 money=euro;
 async load(){try{this.data=await this.api.get('overview?year='+this.year);}catch(e){this.error=(e as Error).message;}}
 barHeight(n:any){const max=Math.max(1,...(this.data?.monthly||[]).map((x:any)=>Number(x.expenses)));return Math.max(n>0?3:0,Number(n)/max*100);}
}
