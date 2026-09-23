import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({selector:'sc-property-detail',imports:[RouterLink,DecimalPipe,FormsModule],templateUrl:'./property-detail.html',styleUrl:'./property-detail.css'})
export class PropertyDetail implements OnInit, OnDestroy {
  property=signal<any|null>(null); loading=signal(true); favourite=signal(false); favBusy=signal(false); imageIndex=signal(0); error=signal('');
  nearby=signal<any[]>([]); bookingOpen=signal(false); booking=signal(false); bookingMessage=signal('');
  viewingDate=''; viewingTime=''; viewingNote=''; mapUrl=signal<SafeResourceUrl|null>(null); private statusTimer:any=null; private listingId=0;
  constructor(private route:ActivatedRoute,private api:ApiService,public auth:AuthService,private router:Router,private sanitizer:DomSanitizer){}
  ngOnInit(){const id=Number(this.route.snapshot.paramMap.get('id'));this.listingId=id;if(!id){this.error.set('Property not found.');this.loading.set(false);return}this.api.get<any>(`/listings/${id}`).subscribe({next:r=>{const p=r.listing||r;this.property.set(p);this.loading.set(false);this.checkFavourite(id);this.loadNearby(id);this.makeMap(p);this.statusTimer=setInterval(()=>this.refreshListingStatus(),3000)},error:e=>{this.error.set(e.error?.error||'Could not load this property.');this.loading.set(false)}})}
  ngOnDestroy(){if(this.statusTimer)clearInterval(this.statusTimer)}
  refreshListingStatus(){if(!this.listingId)return;this.api.get<any>(`/listings/${this.listingId}`,{_statusCheck:Date.now()}).subscribe({next:r=>{const fresh=r.listing||r;if(fresh?.id)this.property.update(current=>current?{...current,...fresh}:fresh)},error:()=>{}})}
  images(){return (this.property()?.images||[]).map((x:any)=>x.imageUrl||x.url).filter(Boolean)} setImage(i:number){this.imageIndex.set(i)}
  facilities(){const v=this.property()?.facilities??this.property()?.amenities??[];if(Array.isArray(v))return v;try{return JSON.parse(v||'[]')}catch{return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}}
  locationText(){const p=this.property();return [p?.neighborhood,p?.city,p?.region].filter(Boolean).join(', ')}
  ownerName(){const p=this.property();return p?.agent?.name||p?.owner?.name||p?.ownerName||'Property owner'}
  ownerLocation(){const a=this.property()?.agent||this.property()?.owner||{};return [a.street,a.city,a.region,a.country].filter(Boolean).join(', ')||this.property()?.city||''}
  caution(){return Number(this.property()?.cautionFee||0)}
  video(){return this.property()?.videoUrl||this.property()?.video_url||null} floorPlan(){return this.property()?.floorPlanUrl||this.property()?.floor_plan_url||null}
  checkFavourite(id:number){if(this.auth.role()!=='BUYER')return;this.api.get<any>('/favourites',{},10000).subscribe({next:r=>this.favourite.set((r.savedListings||[]).map((x:any)=>(x.listing||x).id).includes(id))})}
  toggleFavourite(ev?:Event){ev?.stopPropagation();const p=this.property();if(!p||this.auth.role()!=='BUYER'||this.favBusy())return;this.favBusy.set(true);const done=()=>this.favBusy.set(false);if(this.favourite())this.api.delete<any>(`/favourites/${p.id}`).subscribe({next:()=>{this.favourite.set(false);this.api.clearCache('/favourites');done()},error:done});else this.api.post<any>(`/favourites/${p.id}`,{}).subscribe({next:()=>{this.favourite.set(true);this.api.clearCache('/favourites');done()},error:()=>this.api.post<any>('/favourites',{listingId:p.id}).subscribe({next:()=>{this.favourite.set(true);done()},error:done})})}
  mapRoute(){const p=this.property();return this.auth.role()==='SELLER'?['/owner/property',p.id,'map']:['/seeker/property',p.id,'map']}
  makeMap(p:any){const lat=Number(p?.latitude??p?.lat);const lng=Number(p?.longitude??p?.lng);if(Number.isFinite(lat)&&Number.isFinite(lng)){this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`))}}
  loadNearby(id:number){this.api.get<any>(`/listings/${id}/nearby-facilities`).subscribe({next:r=>this.nearby.set(Array.isArray(r?.facilities)?r.facilities:[]),error:()=>this.nearby.set([])})}
  groupedNearby(){const g:Record<string,any[]>={};for(const x of this.nearby()){const k=x.category||x.type||'Nearby places';(g[k]??=[]).push(x)}return Object.entries(g)}
  messageOwner(){const p=this.property();if(!p)return;this.api.post<any>('/messages/conversations',{listingId:p.id,recipientId:p.agent?.id||p.owner?.id}).subscribe({next:r=>{const id=r.conversation?.id||r.conversationId||r.id;if(!id)return;const seeker=this.auth.profile()?.name||this.auth.profile()?.fullName||'a SweetCasa house seeker';const location=[p.neighborhood,p.city,p.region].filter(Boolean).join(', ');const content=`Hello ${this.ownerName()}, my name is ${seeker}. I found your property, “${p.title}”${location?` in ${location}`:''}, on SweetCasa. I'm interested in it and would like to know more. Please let me know when you would be available for a viewing. Thank you.`;this.api.post<any>(`/messages/conversations/${id}/messages`,{content,text:content}).subscribe({next:()=>{this.api.clearCache('/messages/conversations');this.router.navigate(['/seeker/messages'],{queryParams:{conversation:id}})},error:()=>this.router.navigate(['/seeker/messages'],{queryParams:{conversation:id}})})},error:()=>this.router.navigate(['/seeker/messages'])})}
  requestViewing(){const p=this.property();if(!p||this.booking())return;this.bookingMessage.set('');if(!this.viewingDate||!this.viewingTime){this.bookingMessage.set('Choose your preferred date and time.');return}this.booking.set(true);this.api.post<any>('/viewing-requests',{listingId:p.id,preferredDate:this.viewingDate,preferredTime:this.viewingTime,note:this.viewingNote.trim()||undefined}).subscribe({next:()=>{this.booking.set(false);this.bookingOpen.set(false);this.viewingDate='';this.viewingTime='';this.viewingNote='';this.bookingMessage.set('Viewing request sent successfully.')},error:e=>{this.booking.set(false);this.bookingMessage.set(e.error?.error||'Could not send viewing request.')}})}
}
