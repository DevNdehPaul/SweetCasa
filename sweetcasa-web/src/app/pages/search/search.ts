import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({selector:'sc-search',imports:[FormsModule,DecimalPipe],templateUrl:'./search.html',styleUrl:'./search.css'})
export class Search implements OnInit {
  q='';city='';type='';maxBudget=''; listings=signal<any[]>([]); loading=signal(false); error=signal('');
  constructor(private api:ApiService){}
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.error.set('');this.api.get<any>('/listings',{search:this.q,city:this.city,type:this.type,maxBudget:this.maxBudget,limit:24}).subscribe({
    next:r=>{this.listings.set(r.listings||[]);this.loading.set(false);},
    error:e=>{this.error.set(e.error?.error||'Could not load properties.');this.loading.set(false);}
  });}
  image(l:any){return l.images?.[0]?.url||l.images?.[0]?.imageUrl||'assets/seeker_lifestyle.png'}
  save(l:any){this.api.post(`/favourites/${l.id}`,{}).subscribe({next:()=>l._saved=true,error:e=>this.error.set(e.error?.error||'Sign in as a seeker to save this home.')});}
}
