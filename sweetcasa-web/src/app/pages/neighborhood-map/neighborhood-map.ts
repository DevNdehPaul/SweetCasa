import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
 selector:'sc-neighborhood-map',
 templateUrl:'./neighborhood-map.html',
 styleUrl:'./neighborhood-map.css'
})
export class NeighborhoodMap implements OnInit{
 property=signal<any|null>(null); loading=signal(true); error=signal('');
 mapUrl=signal<SafeResourceUrl|null>(null);
 constructor(private route:ActivatedRoute,private api:ApiService,public auth:AuthService,private sanitizer:DomSanitizer){}
 ngOnInit(){
   const id=Number(this.route.snapshot.paramMap.get('id'));
   this.api.get<any>(`/listings/${id}`).subscribe({
     next:r=>{
       const p=r.listing||r; this.property.set(p); this.loading.set(false);
       const c=this.coords();
       if(!c){this.error.set('This property does not have valid map coordinates yet.');return}
       const d=.012;
       const url=`https://www.openstreetmap.org/export/embed.html?bbox=${c.lng-d}%2C${c.lat-d}%2C${c.lng+d}%2C${c.lat+d}&layer=mapnik&marker=${c.lat}%2C${c.lng}`;
       this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
     },
     error:e=>{this.error.set(e.error?.error||'Could not load property location.');this.loading.set(false)}
   });
 }
 coords(){
   const p=this.property();
   const lat=Number(p?.latitude??p?.lat??p?.location?.latitude??p?.location?.lat);
   const lng=Number(p?.longitude??p?.lng??p?.location?.longitude??p?.location?.lng);
   return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
 }
 backRoute(){const p=this.property();return this.auth.role()==='SELLER'?`/owner/property/${p?.id}`:`/seeker/property/${p?.id}`}
 priceText(){return Number(this.property()?.price||0).toLocaleString('en-CM')}
 externalMap(){
   const c=this.coords(); if(!c)return '#';
   return `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=16/${c.lat}/${c.lng}`;
 }
}