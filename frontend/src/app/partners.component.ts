import {Component,OnInit} from '@angular/core';import {CommonModule} from '@angular/common';import {FormsModule} from '@angular/forms';import {ApiService} from './api.service';
@Component({selector:'aca-partners',standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="section-heading"><div><h1>Partners</h1><p>Financial partner directory, independent of the future ACA CRM sync.</p></div></div>
<p *ngIf="error" class="notice error">{{error}}</p><p *ngIf="message" class="notice success">{{message}}</p>
<div class="panel"><h3>Partner profitability (only assessed orders)</h3><p class="help">Amounts exclude orders with missing price agreements, refunds, discounts or tax-inclusive totals. Estimated base owed is NOT a payable balance or proof of a settlement.</p><div class="table-scroll"><table><thead><tr><th>Partner</th><th>Orders</th><th>Evaluated lines</th><th>Needs review</th><th>Contribution</th><th>Base owed estimate</th></tr></thead><tbody><tr *ngFor="let p of profitability"><td>{{p.partner}}</td><td>{{p.orders}}</td><td>{{p.evaluatedLines}}</td><td>{{p.flaggedLines}}</td><td>{{p.contribution | currency:'EUR':'symbol':'1.0-0'}}</td><td>{{p.estimatedBaseOwed | currency:'EUR':'symbol':'1.0-0'}}</td></tr></tbody></table></div></div>
<div class="grid-two"><div class="panel"><h3>Partner directory</h3><div class="table-scroll"><table><thead><tr><th>Name</th><th>Shopify vendor</th><th>Variants</th><th>Active</th><th>Action</th></tr></thead><tbody><tr *ngFor="let p of partners"><td><b>{{p.name}}</b><small class="cell-sub" *ngIf="p.crmReference">CRM ref: {{p.crmReference}}</small></td><td>{{p.shopifyVendor||'—'}}</td><td>{{p.productsCount}}</td><td>{{p.active?'Yes':'No'}}</td><td><button class="text-link" (click)="edit(p)">Edit</button></td></tr></tbody></table></div><p *ngIf="!partners.length" class="empty">No partners yet. Enter your first partner.</p></div>
<div class="panel"><h3>{{form.id?'Edit partner':'Add partner'}}</h3><p class="muted">Used to connect product base-cost agreements with ACA.</p><div class="form-stack">
<label>Name<input [(ngModel)]="form.name" placeholder="Vietri ceramics studio"></label>
<label>Shopify vendor (optional)<input [(ngModel)]="form.shopifyVendor" placeholder="Shopify vendor field"></label>
<label>External ACA CRM reference (optional)<input [(ngModel)]="form.crmReference"></label>
<label>Notes<textarea [(ngModel)]="form.notes" rows="3"></textarea></label>
<label *ngIf="form.id"><input style="width:auto;min-height:0" type="checkbox" [(ngModel)]="form.active"> Active</label>
<div class="actions"><button class="button primary" [disabled]="busy||api.user()?.role!=='ADMIN'" (click)="save()">{{busy?'Saving...':'Save partner'}}</button><button class="button outline" (click)="reset()">Clear</button></div>
</div><p class="help">External CRM synchronization is not enabled without an agreed ACA CRM API contract. Local partner records work independently.</p></div></div>`})
export class PartnersComponent implements OnInit{
 partners:any[]=[];profitability:any[]=[];form:any={name:'',shopifyVendor:'',crmReference:'',notes:'',active:true};error='';message='';busy=false;constructor(public api:ApiService){}ngOnInit(){this.reset();this.load();}
 async load(){try{[this.partners,this.profitability]=await Promise.all([this.api.get('partners'),this.api.get('partners/profitability')]);}catch(e){this.error=(e as Error).message;}}
 reset(){this.form={name:'',shopifyVendor:'',crmReference:'',notes:'',active:true};} edit(p:any){this.form={...p};}
 async save(){this.busy=true;this.error='';try{const d={name:this.form.name,shopifyVendor:this.form.shopifyVendor||null,crmReference:this.form.crmReference||null,notes:this.form.notes||null,active:!!this.form.active};if(this.form.id)await this.api.patch('partners/'+this.form.id,d);else await this.api.post('partners',d);this.message='Partner saved';this.reset();await this.load();}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
}
