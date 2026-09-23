import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar.component';

type Role='BUYER'|'SELLER';
@Component({selector:'sc-legal',imports:[RouterLink,TopbarComponent],templateUrl:'./legal.html',styleUrl:'./legal.css'})
export class Legal{
  kind:'terms'|'privacy'='terms'; role:Role='BUYER';
  constructor(route:ActivatedRoute){
    this.kind=location.pathname.includes('privacy')?'privacy':'terms';
    this.role=route.snapshot.queryParamMap.get('role')==='SELLER'?'SELLER':'BUYER';
  }
  get owner(){return this.role==='SELLER'}
  get title(){return this.kind==='terms'?'Terms of Service':'Privacy Policy'}
}
