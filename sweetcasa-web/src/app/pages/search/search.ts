import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';

@Component({selector:'sc-search',imports:[FormsModule,DecimalPipe],templateUrl:'./search.html',styleUrl:'./search.css'})
export class Search implements OnInit {
  q='';city='';type='';maxBudget=''; listings=signal<any[]>([]); loading=signal(false); error=signal('');
  constructor(private api:ApiService,private router:Router){}
  ngOnInit(){this.load();this.api.get<any>('/favourites',{},10000).subscribe({next:r=>{const ids=new Set((r.savedListings||[]).map((x:any)=>(x.listing||x).id));this.listings.update(v=>v.map(x=>({...x,_saved:ids.has(x.id)})))},error:()=>{}});}
  load(){this.loading.set(true);this.error.set('');this.api.get<any>('/listings',{search:this.q,city:this.city,type:this.type,maxBudget:this.maxBudget,limit:24}).subscribe({
    next:r=>{this.listings.set(r.listings||[]);this.loading.set(false);},
    error:e=>{this.error.set(e.error?.error||'Could not load properties.');this.loading.set(false);}
  });}
  image(l:any){return l.images?.[0]?.imageUrl||l.images?.[0]?.url||'/assets/seeker_lifestyle.png'}
  open(l:any){this.router.navigate(['/seeker/property',l.id])}
save(l:any,e:Event){e.stopPropagation();const was=!!l._saved;l._saved=!was;const req=was?this.api.delete(`/favourites/${l.id}`):this.api.post(`/favourites/${l.id}`,{});req.subscribe({next:()=>this.api.clearCache('/favourites'),error:e=>{l._saved=was;this.error.set(e.error?.error||'Could not update favourite.')}});}
}
