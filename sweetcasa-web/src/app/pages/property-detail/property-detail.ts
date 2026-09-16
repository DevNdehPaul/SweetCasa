import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector:'sc-property-detail',
  imports:[RouterLink,DecimalPipe],
  templateUrl:'./property-detail.html',
  styleUrl:'./property-detail.css'
})
export class PropertyDetail implements OnInit {
  property=signal<any|null>(null);
  loading=signal(true);
  favourite=signal(false);
  favBusy=signal(false);
  imageIndex=signal(0);
  error=signal('');
  constructor(private route:ActivatedRoute,private api:ApiService,public auth:AuthService,private router:Router){}
  ngOnInit(){
    const id=Number(this.route.snapshot.paramMap.get('id'));
    if(!id){this.error.set('Property not found.');this.loading.set(false);return}
    this.api.get<any>(`/listings/${id}`).subscribe({
      next:r=>{this.property.set(r.listing||r);this.loading.set(false);this.checkFavourite(id)},
      error:e=>{this.error.set(e.error?.error||'Could not load this property.');this.loading.set(false)}
    });
  }
  images(){const p=this.property();return (p?.images||[]).map((x:any)=>x.imageUrl||x.url).filter(Boolean)}
  setImage(i:number){this.imageIndex.set(i)}
  checkFavourite(id:number){
    if(this.auth.role()!=='BUYER')return;
    this.api.get<any>('/favourites',{},10000).subscribe({next:r=>{
      const ids=(r.savedListings||[]).map((x:any)=>(x.listing||x).id);
      this.favourite.set(ids.includes(id));
    }});
  }
  toggleFavourite(ev?:Event){
    ev?.stopPropagation();
    const p=this.property(); if(!p||this.auth.role()!=='BUYER'||this.favBusy())return;
    this.favBusy.set(true);
    const done=()=>this.favBusy.set(false);
    if(this.favourite()){
      this.api.delete<any>(`/favourites/${p.id}`).subscribe({next:()=>{this.favourite.set(false);this.api.clearCache('/favourites');done()},error:done});
    }else{
      this.api.post<any>('/favourites',{listingId:p.id}).subscribe({next:()=>{this.favourite.set(true);this.api.clearCache('/favourites');done()},error:done});
    }
  }
  mapRoute(){
    const p=this.property();
    return this.auth.role()==='SELLER'?['/owner/property',p.id,'map']:['/seeker/property',p.id,'map'];
  }
  messageOwner(){
    const p=this.property(); if(!p)return;
    this.api.post<any>('/messages/conversations',{listingId:p.id}).subscribe({
      next:r=>{
        const id=r.conversation?.id||r.id;
        if(id) this.router.navigate([this.auth.role()==='SELLER'?'/owner/messages':'/seeker/messages'],{queryParams:{conversation:id}});
      },
      error:()=>this.router.navigate([this.auth.role()==='SELLER'?'/owner/messages':'/seeker/messages'])
    });
  }
}