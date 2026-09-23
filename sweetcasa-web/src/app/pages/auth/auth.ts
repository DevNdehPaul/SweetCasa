import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { LegalModalComponent } from '../../shared/components/legal-modal.component';
import { AuthService, Role } from '../../core/services/auth.service';

@Component({selector:'sc-auth',imports:[FormsModule,RouterLink,TopbarComponent,LegalModalComponent],templateUrl:'./auth.html',styleUrl:'./auth.css'})
export class Auth {
  mode=signal<'login'|'signup'>('login'); role=signal<Role>('BUYER');
  loading=signal(false); error=signal(''); acceptedTerms=false;
  showPassword=signal(false); showConfirmPassword=signal(false); legalModal=signal<'terms'|'privacy'|null>(null); legalNeedsAcceptance=signal(false);
  fullName=''; companyName=''; email=''; phone=''; password=''; confirmPassword='';
  country='Cameroon'; region=''; city=''; street=''; nationalId:File|null=null;
  constructor(private auth:AuthService,private router:Router,private route:ActivatedRoute){
    const q=this.route.snapshot.queryParamMap;
    if(q.get('mode')==='signup')this.mode.set('signup');
    if(q.get('mode')==='login')this.mode.set('login');
    if(q.get('role')==='SELLER')this.role.set('SELLER');
    if(q.get('role')==='BUYER')this.role.set('BUYER');
    if(q.get('termsAccepted')==='true')this.acceptedTerms=true;
  }
  openLegal(kind:'terms'|'privacy',needsAcceptance=false){this.legalNeedsAcceptance.set(needsAcceptance);this.legalModal.set(kind)}
  termsCheckbox(e:Event){e.preventDefault();if(this.acceptedTerms){this.acceptedTerms=false;return}this.openLegal('terms',true)}
  acceptTerms(){this.acceptedTerms=true;this.legalModal.set(null);this.legalNeedsAcceptance.set(false)}
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
    if(!this.acceptedTerms){this.error.set('Please read and accept the Terms of Service and Privacy Policy to continue.');return;}
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
