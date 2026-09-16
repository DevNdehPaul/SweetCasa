import { Component, OnInit, signal } from '@angular/core';import { DecimalPipe,DatePipe } from '@angular/common';import { FormsModule } from '@angular/forms';import { ApiService } from '../../core/services/api.service';import { AuthService } from '../../core/services/auth.service';
@Component({selector:'sc-wallet',imports:[DecimalPipe,DatePipe,FormsModule],templateUrl:'./wallet.html',styleUrl:'./wallet.css'})
export class Wallet implements OnInit{
 wallet=signal<any>(null);tx=signal<any[]>([]);saved=signal<any[]>([]);loading=signal(true);error=signal('');message=signal('');modal=signal<'deposit'|'withdraw'|null>(null);busy=signal(false);
 listingId='';amount='';phone='';medium='mobile money';page=signal(1);readonly pageSize=6;
 constructor(private api:ApiService,public auth:AuthService){}
 ngOnInit(){this.load();if(this.auth.role()==='BUYER')this.loadSaved();}
 load(){this.api.clearCache('/wallet');this.api.get<any>('/wallet/me').subscribe({next:r=>{this.wallet.set(r.wallet);this.tx.set(r.transactions||[]);this.loading.set(false)},error:e=>{this.error.set(e.error?.error||'Could not load wallet.');this.loading.set(false)}})}
 loadSaved(){this.api.get<any>('/favourites',{},15000).subscribe({next:r=>this.saved.set((r.savedListings||[]).map((x:any)=>x.listing||x))})}
 deposit(){const amount=Number(this.amount);if(!this.listingId){this.error.set('Select one of your saved properties first.');return}if(!amount||amount<100||!this.phone.trim()){this.error.set('Enter a valid amount and mobile money number.');return}this.busy.set(true);this.error.set('');this.api.post<any>('/wallet/deposit',{listingId:Number(this.listingId),amount,phone:this.phone.trim(),medium:this.medium}).subscribe({next:r=>{this.busy.set(false);this.modal.set(null);this.message.set('Payment request started. Approve the prompt on your phone.');this.verify(r.transaction?.id,0)},error:e=>{this.busy.set(false);this.error.set(e.error?.error||'Could not start deposit.')}})}
 verify(id:number,attempt:number){if(!id||attempt>=10){this.load();return}setTimeout(()=>this.api.get<any>(`/wallet/deposit/${id}/verify`).subscribe({next:r=>{const s=r.transaction?.status;if(s==='Completed'){this.message.set('Deposit successful. Your funds are now protected in escrow.');this.load()}else if(s==='Failed'||s==='Cancelled'){this.error.set('The payment was not completed.');this.load()}else this.verify(id,attempt+1)},error:()=>this.verify(id,attempt+1)}),4000)}
 withdraw(){const amount=Number(this.amount);if(!amount||amount<100||!this.phone.trim()){this.error.set('Enter a valid amount and mobile money number.');return}this.busy.set(true);this.error.set('');this.api.post<any>('/wallet/withdraw',{amount,phone:this.phone.trim()}).subscribe({next:()=>{this.busy.set(false);this.modal.set(null);this.message.set('Withdrawal sent successfully.');this.load()},error:e=>{this.busy.set(false);this.error.set(e.error?.error||'Could not withdraw funds.')}})}
 pagedTx(){const start=(this.page()-1)*this.pageSize;return this.tx().slice(start,start+this.pageSize)}
pages(){return Math.max(1,Math.ceil(this.tx().length/this.pageSize))}
prev(){this.page.update(v=>Math.max(1,v-1))}
next(){this.page.update(v=>Math.min(this.pages(),v+1))}
open(type:'deposit'|'withdraw'){this.error.set('');this.message.set('');this.amount='';this.phone='';this.listingId='';this.modal.set(type)}
 close(){this.modal.set(null)}
}
