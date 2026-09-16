import { Injectable, computed, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs';

export type Role='BUYER'|'SELLER';
@Injectable({providedIn:'root'})
export class AuthService{
 token=signal<string|null>(localStorage.getItem('token'));
 role=signal<Role|null>((localStorage.getItem('sc-role')||localStorage.getItem('role')) as Role|null);
 profile=signal<any>(JSON.parse(localStorage.getItem('sc-profile')||localStorage.getItem('profile')||'null'));
 loggedIn=computed(()=>!!this.token());
 constructor(private api:ApiService){}
 login(email:string,password:string,expectedRole:Role){return this.api.post<any>('/auth/login',{email,password,expectedRole}).pipe(tap(r=>this.persist(r)));}
 register(data:FormData){return this.api.post<any>('/auth/register',data).pipe(tap(r=>this.persist(r)));}
 updateProfile(data:FormData){return this.api.put<any>('/auth/profile',data).pipe(tap(r=>{if(r.profile)this.setProfile(r.profile)}));}
 setProfile(profile:any){localStorage.setItem('sc-profile',JSON.stringify(profile));localStorage.setItem('profile',JSON.stringify(profile));this.profile.set(profile);}
 logout(){this.api.post('/auth/logout',{}).subscribe({error:()=>{}});['token','sc-role','role','sc-profile','profile'].forEach(k=>localStorage.removeItem(k));this.token.set(null);this.role.set(null);this.profile.set(null);}
 private persist(r:any){localStorage.setItem('token',r.token);localStorage.setItem('sc-role',r.role);localStorage.setItem('role',r.role);this.token.set(r.token);this.role.set(r.role);if(r.profile)this.setProfile(r.profile);}
}
