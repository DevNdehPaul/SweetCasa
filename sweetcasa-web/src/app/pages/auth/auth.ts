import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { AuthService, Role } from '../../core/services/auth.service';

@Component({selector:'sc-auth',imports:[FormsModule,RouterLink,TopbarComponent],templateUrl:'./auth.html',styleUrl:'./auth.css'})
export class Auth {
  mode=signal<'login'|'signup'>('login'); role=signal<Role>('BUYER');
  loading=signal(false); error=signal(''); acceptedTerms=false;
  fullName=''; companyName=''; email=''; phone=''; password=''; confirmPassword='';
  country='Cameroon'; region=''; city=''; street=''; nationalId:File|null=null;
  constructor(private auth:AuthService,private router:Router){}
  chooseFile(e:Event){ this.nationalId=(e.target as HTMLInputElement).files?.[0]||null; }
  submit(){
    this.error.set('');
    if(this.mode()==='login'){
      if(!this.email||!this.password){this.error.set('Enter your email and password.');return;}
      this.loading.set(true);
      this.auth.login(this.email.trim(),this.password,this.role()).subscribe({
        next:r=>{this.loading.set(false);this.router.navigate([r.role==='BUYER'?'/seeker':'/owner']);},
        error:e=>{this.loading.set(false);this.error.set(e.error?.error||'Could not sign in.');}
      }); return;
    }
    if(!this.fullName||!this.email||!this.password||!this.nationalId){this.error.set('Name, email, password and National ID are required.');return;}
    if(this.password!==this.confirmPassword){this.error.set('Passwords do not match.');return;}
    if(!this.acceptedTerms){this.error.set('Please accept the Terms & Agreement to continue.');return;}
    const f=new FormData();
    [['fullName',this.fullName],['companyName',this.companyName],['email',this.email],['phone',this.phone],['password',this.password],['role',this.role()],['country',this.country],['region',this.region],['city',this.city],['street',this.street]].forEach(([k,v])=>f.append(k,String(v||'')));
    f.append('nationalId',this.nationalId);
    this.loading.set(true);
    this.auth.register(f).subscribe({
      next:r=>{this.loading.set(false);this.router.navigate([r.role==='BUYER'?'/seeker':'/owner']);},
      error:e=>{this.loading.set(false);this.error.set(e.error?.error||'Could not create your account.');}
    });
  }
}
