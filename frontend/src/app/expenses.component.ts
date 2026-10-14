import {Component,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService,euro} from './api.service';
const today=()=>new Date().toISOString().slice(0,10);
function blank(){return {title:'',category:'Marketing',supplier:'',notes:'',netAmount:0,vatRate:22,expenseDate:today(),dueDate:null as string|null,paidAt:null as string|null,status:'PENDING'};}
function templateBlank(){return {title:'',category:'Marketing',supplier:'',notes:'',netAmount:0,vatRate:22,frequency:'MONTHLY',startDate:today(),endDate:null as string|null,active:true};}
@Component({selector:'aca-expenses',standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="section-heading"><div><span class="eyebrow">FINANCIAL MANAGEMENT</span><h1>Expenses</h1><p>Track real expenses, payments, invoices and monthly recurring costs.</p></div><div class="actions"><button class="button outline" (click)="tab=tab==='recurring'?'list':'recurring'">{{tab==='recurring'?'All expenses':'Recurring expenses'}}</button><button class="button primary" (click)="openNew()">+ Add expense</button></div></div>
<div *ngIf="error" class="notice error">{{error}}</div><div *ngIf="success" class="notice success">{{success}}</div>
<ng-container *ngIf="tab==='list'">
 <div class="kpi-grid compact"><div class="kpi"><small>Recorded (gross)</small><strong>{{money(sumGross())}}</strong></div><div class="kpi"><small>Paid (gross)</small><strong>{{money(sumPaid())}}</strong></div><div class="kpi"><small>Outstanding / planned</small><strong>{{money(sumOutstanding())}}</strong></div><div class="kpi"><small>Number of expenses</small><strong>{{items.length}}</strong></div></div>
 <div class="panel"><div class="toolbar"><input placeholder="Search description or supplier..." [(ngModel)]="search" (keyup.enter)="load()"><select [(ngModel)]="filterStatus" (change)="load()"><option value="">All statuses</option><option value="PLANNED">Planned</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option></select><input type="number" placeholder="Year (optional)" [(ngModel)]="filterYear" min="2020" max="2100"><button class="button outline" (click)="load()">Apply filters</button></div>
 <div class="table-scroll"><table><thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Status</th><th class="right">Net</th><th class="right">Gross</th><th>Actions</th></tr></thead><tbody><tr *ngFor="let x of items"><td><b>{{x.title}}</b><small class="cell-sub">{{x.supplier||'No supplier'}} <span *ngIf="x.recurringId">• Recurring</span></small></td><td>{{x.category}}</td><td>{{x.expenseDate | date:'mediumDate'}}</td><td><span class="tag" [class.paid]="x.status==='PAID'">{{x.status}}</span></td><td class="right">{{money(x.netAmount)}}</td><td class="right"><b>{{money(x.grossAmount)}}</b></td><td class="table-actions"><button (click)="edit(x)">Edit</button><label class="text-link">Receipt<input type="file" hidden accept="application/pdf,image/png,image/jpeg" (change)="upload($event,x.id)"></label><a *ngIf="x.receiptName" [href]="'/api/expenses/'+x.id+'/receipt'" target="_blank" rel="noopener">View</a><button class="danger-text" (click)="remove(x)">Delete</button></td></tr><tr *ngIf="items.length===0"><td colspan="7" class="empty">No expenses match these filters. Start by adding a real expense.</td></tr></tbody></table></div>
 </div>
</ng-container>
<ng-container *ngIf="tab==='recurring'"><div class="panel"><div class="panel-title"><div><h3>Recurring expense templates</h3><p>Monthly and yearly expenses are generated as pending when their dates arrive.</p></div><button class="button primary" (click)="editRecurring(null)">+ New recurring</button></div><div class="table-scroll"><table><thead><tr><th>Description</th><th>Category</th><th>Period</th><th>Net amount</th><th>Active</th><th>Actions</th></tr></thead><tbody><tr *ngFor="let r of recurring"><td><b>{{r.title}}</b></td><td>{{r.category}}</td><td>{{r.frequency}}</td><td>{{money(r.netAmount)}}</td><td>{{r.active?'Yes':'No'}}</td><td class="table-actions"><button (click)="editRecurring(r)">Edit</button><button class="danger-text" (click)="stopRecurring(r)" *ngIf="r.active">Deactivate</button></td></tr></tbody></table></div></div></ng-container>
<div class="modal-backdrop" *ngIf="showForm"><div class="modal"><div class="modal-title"><h2>{{editingId?'Edit expense':'Add expense'}}</h2><button class="icon-button" (click)="showForm=false">✕</button></div><form (ngSubmit)="save()" class="form-grid">
<label class="span-2">Description<input [(ngModel)]="form.title" name="title" required minlength="2"></label>
<label>Category<select [(ngModel)]="form.category" name="category"><option *ngFor="let c of categories">{{c}}</option></select></label>
<label>Supplier<input [(ngModel)]="form.supplier" name="supplier"></label>
<label>Net amount (€)<input type="number" min="0" step="0.01" [(ngModel)]="form.netAmount" name="netAmount" required></label>
<label>VAT (%)<input type="number" min="0" max="100" step="0.01" [(ngModel)]="form.vatRate" name="vatRate" required></label>
<label>Expense date<input type="date" [(ngModel)]="form.expenseDate" name="expenseDate" required></label>
<label>Due date<input type="date" [(ngModel)]="form.dueDate" name="dueDate"></label>
<label>Status<select [(ngModel)]="form.status" name="status"><option *ngFor="let s of statuses">{{s}}</option></select></label>
<label>Paid at<input type="date" [(ngModel)]="form.paidAt" name="paidAt"></label>
<label class="span-2">Notes<textarea [(ngModel)]="form.notes" name="notes" rows="3"></textarea></label>
<div class="span-2 form-footer"><span class="muted">Gross: {{money((+form.netAmount||0)*(1+(+form.vatRate||0)/100))}}</span><button type="button" class="button outline" (click)="showForm=false">Cancel</button><button class="button primary" [disabled]="busy">{{busy?'Saving...':'Save expense'}}</button></div>
</form></div></div>
<div class="modal-backdrop" *ngIf="showRecurring"><div class="modal"><div class="modal-title"><h2>{{recurringId?'Edit recurring cost':'New recurring cost'}}</h2><button class="icon-button" (click)="showRecurring=false">✕</button></div><form (ngSubmit)="saveRecurring()" class="form-grid">
<label class="span-2">Description<input name="rt" [(ngModel)]="recForm.title" required></label>
<label>Category<select name="rc" [(ngModel)]="recForm.category"><option *ngFor="let c of categories">{{c}}</option></select></label>
<label>Supplier<input name="rs" [(ngModel)]="recForm.supplier"></label>
<label>Net amount (€)<input type="number" name="ra" min="0" [(ngModel)]="recForm.netAmount"></label>
<label>VAT (%)<input type="number" name="rv" min="0" max="100" [(ngModel)]="recForm.vatRate"></label>
<label>Frequency<select name="rf" [(ngModel)]="recForm.frequency"><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label>
<label>Start date<input type="date" name="rd" [(ngModel)]="recForm.startDate"></label>
<label>End date<input type="date" name="re" [(ngModel)]="recForm.endDate"></label>
<label class="span-2">Notes<textarea name="rn" [(ngModel)]="recForm.notes"></textarea></label>
<div class="span-2 form-footer"><button type="button" class="button outline" (click)="showRecurring=false">Cancel</button><button class="button primary">Save recurring cost</button></div></form></div></div>`})
export class ExpensesComponent implements OnInit{
 items:any[]=[];recurring:any[]=[];error='';success='';tab:'list'|'recurring'='list';filterStatus='';filterYear:number|null=null;search='';showForm=false;showRecurring=false;busy=false;
 editingId:string|null=null;form:any=blank();recurringId:string|null=null;recForm:any=templateBlank();
 categories=['Marketing','Design','Software & Hosting','Accounting & Legal','Contractors','Personnel','Operations','Other'];statuses=['PLANNED','PENDING','PAID','CANCELLED'];
 constructor(private api:ApiService){}
 ngOnInit(){this.load();this.loadRecurring();}
 money=euro;
 async load(){try{let q=new URLSearchParams();if(this.filterYear)q.set('year',String(this.filterYear));if(this.filterStatus)q.set('status',this.filterStatus);if(this.search)q.set('search',this.search);this.items=await this.api.get('expenses?'+q);}catch(e){this.error=(e as Error).message;}}
 async loadRecurring(){try{this.recurring=await this.api.get('recurring');}catch(e){this.error=(e as Error).message;}}
 sumGross(){return this.items.filter(x=>x.status!=='CANCELLED').reduce((s,x)=>s+Number(x.grossAmount),0);}
 sumPaid(){return this.items.filter(x=>x.status==='PAID').reduce((s,x)=>s+Number(x.grossAmount),0);}
 sumOutstanding(){return this.sumGross()-this.sumPaid();}
 openNew(){this.editingId=null;this.form=blank();this.showForm=true;this.error='';}
 edit(x:any){this.editingId=x.id;this.form={title:x.title,category:x.category,supplier:x.supplier||'',notes:x.notes||'',netAmount:Number(x.netAmount),vatRate:Number(x.vatRate),expenseDate:String(x.expenseDate).slice(0,10),dueDate:x.dueDate?String(x.dueDate).slice(0,10):null,paidAt:x.paidAt?String(x.paidAt).slice(0,10):null,status:x.status};this.showForm=true;}
 async save(){this.busy=true;this.error='';try{const payload={...this.form,dueDate:this.form.dueDate||null,paidAt:this.form.paidAt||null};if(this.editingId)await this.api.patch('expenses/'+this.editingId,payload);else await this.api.post('expenses',payload);this.showForm=false;this.success='Expense saved';await this.load();}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
 async remove(x:any){if(!confirm('Delete this expense? It will be soft-deleted and retained for audit.'))return;try{await this.api.delete('expenses/'+x.id);await this.load();}catch(e){this.error=(e as Error).message;}}
 async upload(ev:Event,id:string){const input=ev.target as HTMLInputElement;const f=input.files?.[0];if(!f)return;try{await this.api.uploadReceipt(id,f);this.success='Receipt uploaded';await this.load();}catch(e){this.error=(e as Error).message;}input.value='';}
 editRecurring(x:any){this.recurringId=x?.id||null;this.recForm=x?{title:x.title,category:x.category,supplier:x.supplier||'',notes:x.notes||'',netAmount:Number(x.netAmount),vatRate:Number(x.vatRate),frequency:x.frequency,startDate:String(x.startDate).slice(0,10),endDate:x.endDate?String(x.endDate).slice(0,10):null,active:x.active}:templateBlank();this.showRecurring=true;}
 async saveRecurring(){try{const payload={...this.recForm,endDate:this.recForm.endDate||null};if(this.recurringId)await this.api.patch('recurring/'+this.recurringId,payload);else await this.api.post('recurring',payload);this.showRecurring=false;await this.loadRecurring();}catch(e){this.error=(e as Error).message;}}
 async stopRecurring(x:any){if(!confirm('Deactivate this recurring expense? Existing expenses remain.'))return;try{await this.api.delete('recurring/'+x.id);await this.loadRecurring();}catch(e){this.error=(e as Error).message;}}
}
