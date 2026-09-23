import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe,DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
@Component({selector:'sc-wallet',imports:[DecimalPipe,DatePipe,FormsModule],templateUrl:'./wallet.html',styleUrl:'./wallet.css'})
export class Wallet implements OnInit{
 wallet=signal<any>(null);tx=signal<any[]>([]);properties=signal<any[]>([]);loading=signal(true);propertiesLoading=signal(false);error=signal('');message=signal('');modal=signal<'deposit'|'withdraw'|'purchase'|null>(null);busy=signal(false);
 listingId='';amount='';phone='';medium='mobile money';page=signal(1);readonly pageSize=6;
 constructor(private api:ApiService,public auth:AuthService,private router:Router){}
 ngOnInit(){this.load();}
 load(){this.api.clearCache('/wallet');this.api.get<any>('/wallet/me').subscribe({next:r=>{this.wallet.set(r.wallet);this.tx.set(r.transactions||[]);this.loading.set(false)},error:e=>{this.error.set(e.error?.error||'Could not load wallet.');this.loading.set(false)}})}
 loadProperties(){this.propertiesLoading.set(true);this.api.clearCache('/listings');this.fetchProperties(1,[])}
 private fetchProperties(page:number,acc:any[]){this.api.get<any>('/listings',{status:'Approved',page,limit:50}).subscribe({next:r=>{const rows=(r.listings||r.data||[]).filter((l:any)=>l.status==='Approved');const all=[...acc,...rows];const pages=Number(r.pages||1);if(page<pages)this.fetchProperties(page+1,all);else{this.properties.set(all);this.propertiesLoading.set(false)}},error:e=>{this.propertiesLoading.set(false);this.error.set(e.error?.error||'Could not load available properties.')}})}
 deposit(){const amount=Number(this.amount);if(!amount||amount<100||!this.phone.trim()){this.error.set('Enter a valid amount and mobile money number.');return}this.busy.set(true);this.error.set('');this.api.post<any>('/wallet/deposit',{amount,phone:this.phone.trim(),medium:this.medium}).subscribe({next:r=>{this.busy.set(false);this.modal.set(null);this.message.set('Payment request started. Approve the prompt on your phone.');this.verify(r.transaction?.id,0)},error:e=>{this.busy.set(false);this.error.set(e.error?.error||'Could not start deposit.')}})}
 verify(id:number,attempt:number){if(!id||attempt>=10){this.load();return}setTimeout(()=>this.api.get<any>(`/wallet/deposit/${id}/verify`).subscribe({next:r=>{const s=r.transaction?.status;if(s==='Completed'){this.message.set('Deposit successful. Your funds are now available in escrow.');this.load()}else if(s==='Failed'||s==='Cancelled'){this.error.set('The payment was not completed.');this.load()}else this.verify(id,attempt+1)},error:()=>this.verify(id,attempt+1)}),4000)}
 withdraw(){const amount=Number(this.amount);if(!amount||amount<100||!this.phone.trim()){this.error.set('Enter a valid amount and mobile money number.');return}this.busy.set(true);this.error.set('');this.api.post<any>('/wallet/withdraw',{amount,phone:this.phone.trim(),medium:this.medium}).subscribe({next:()=>{this.busy.set(false);this.modal.set(null);this.message.set('Withdrawal sent successfully.');this.load()},error:e=>{this.busy.set(false);this.error.set(e.error?.error||'Could not withdraw funds.')}})}
 chooseProperty(l:any){this.modal.set(null);this.router.navigate(['/seeker/lease',l.id]);}
 image(l:any){return l?.images?.[0]?.imageUrl||l?.images?.[0]?.url||''}
 kind(l:any){return l.paymentFrequency==='For Sale'?'For Sale':'For Rent'}
 requirement(l:any){const price=Number(l.price||0);return l.paymentFrequency==='For Sale'?Math.ceil(price*.25):price+Number(l.cautionFee||0)}
 pagedTx(){const start=(this.page()-1)*this.pageSize;return this.tx().slice(start,start+this.pageSize)} pages(){return Math.max(1,Math.ceil(this.tx().length/this.pageSize))} prev(){this.page.update(v=>Math.max(1,v-1))} next(){this.page.update(v=>Math.min(this.pages(),v+1))}
 open(type:'deposit'|'withdraw'|'purchase'){this.error.set('');this.message.set('');this.amount='';this.phone='';this.listingId='';this.modal.set(type);if(type==='purchase')this.loadProperties()}
 close(){this.modal.set(null)}
}
