import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';

@Component({selector:'sc-viewings',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./viewings.html',styleUrl:'./viewings.css'})
export class Viewings implements OnInit {
  rows=signal<any[]>([]); loading=signal(true); error=signal(''); busy=signal<number|null>(null);
  drafts:Record<number,{date:string,time:string,message:string}>={};
  constructor(private api:ApiService, public auth:AuthService, public i18n:I18nService, private router:Router){}
  get owner(){ return String(this.auth.role()||'').toUpperCase()==='SELLER'; }
  ngOnInit(){this.load()}
  load(){this.loading.set(true);this.error.set('');this.api.get<any>(this.owner?'/viewing-requests/received':'/viewing-requests/mine').subscribe({next:r=>{const v=r.viewingRequests||[];this.rows.set(v);for(const x of v)this.drafts[x.id]??={date:x.confirmedDate||x.preferredDate||'',time:x.confirmedTime||x.preferredTime||'',message:x.agentMessage||''};this.loading.set(false)},error:e=>{this.error.set(e.error?.error||'Could not load viewing requests.');this.loading.set(false)}})}
  image(v:any){return v.listing?.imageUrl||'/assets/seeker_lifestyle.png'}
  place(v:any){return [v.listing?.neighborhood,v.listing?.city,v.listing?.region].filter(Boolean).join(', ')}
  open(v:any){if(v.listing?.id)this.router.navigate([this.owner?'/owner/property':'/seeker/property',v.listing.id])}
  status(v:any){return this.i18n.text(({PENDING:'Pending',CONFIRMED:'Confirmed',DECLINED:'Declined',CANCELLED:'Cancelled',COMPLETED:'Completed'} as any)[v.status]||v.status)}
  cancel(v:any){if(!confirm(this.i18n.text('Cancel this viewing request?')))return;this.busy.set(v.id);this.api.patch<any>(`/viewing-requests/${v.id}/cancel`,{}).subscribe({next:()=>{this.busy.set(null);this.load()},error:e=>{this.busy.set(null);this.error.set(e.error?.error||'Could not cancel viewing request.')}})}
  confirmRequest(v:any){const d=this.drafts[v.id];if(!d?.date||!d?.time){this.error.set('Choose a confirmed date and time.');return}this.busy.set(v.id);this.api.patch<any>(`/viewing-requests/${v.id}/confirm`,{confirmedDate:d.date,confirmedTime:d.time,agentMessage:d.message?.trim()||undefined}).subscribe({next:()=>{this.busy.set(null);this.load()},error:e=>{this.busy.set(null);this.error.set(e.error?.error||'Could not confirm viewing request.')}})}
  decline(v:any){const d=this.drafts[v.id];this.busy.set(v.id);this.api.patch<any>(`/viewing-requests/${v.id}/decline`,{agentMessage:d?.message?.trim()||undefined}).subscribe({next:()=>{this.busy.set(null);this.load()},error:e=>{this.busy.set(null);this.error.set(e.error?.error||'Could not decline viewing request.')}})}
}
