import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { LegalModalComponent } from '../../shared/components/legal-modal.component';
import { AuthService, Role } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({selector:'sc-auth',imports:[FormsModule,RouterLink,TopbarComponent,LegalModalComponent],templateUrl:'./auth.html',styleUrl:'./auth.css'})
export class Auth implements AfterViewInit, OnDestroy {
  mode=signal<'login'|'signup'>('login'); role=signal<Role>('BUYER');
  loading=signal(false); error=signal(''); acceptedTerms=false;
  showPassword=signal(false); showConfirmPassword=signal(false); legalModal=signal<'terms'|'privacy'|null>(null); legalNeedsAcceptance=signal(false);
  fullName=''; companyName=''; email=''; phone=''; password=''; confirmPassword='';
  country='Cameroon'; region=''; city=''; street=''; nationalId:File|null=null;
  googleLoading=signal(false); finishProfileOpen=signal(false); forgotOpen=signal(false); forgotStep=signal<'email'|'code'|'password'|'done'>('email'); forgotLoading=signal(false); forgotError=signal('');
  forgotEmail=''; resetCode=''; newPassword=''; confirmNewPassword=''; finishName=''; finishCompany=''; finishPhone=''; finishCountry='Cameroon'; finishRegion=''; finishCity=''; finishStreet=''; finishNationalId:File|null=null; finishSaving=signal(false);
  private googleScript:HTMLScriptElement|null=null;
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
  ngAfterViewInit(){setTimeout(()=>this.googleAuth(),0)}
  setMode(next:'login'|'signup'){this.mode.set(next);setTimeout(()=>this.googleAuth(),0)}
  ngOnDestroy(){if(this.googleScript?.parentNode)this.googleScript.parentNode.removeChild(this.googleScript)}
  chooseFinishId(e:Event){this.finishNationalId=(e.target as HTMLInputElement).files?.[0]||null}
  private routeHome(role:Role){this.router.navigate([role==='BUYER'?'/seeker':'/owner'])}
  googleAuth(){
    this.error.set('');
    if(!environment.googleWebClientId){this.googleLoading.set(false);return}
    this.googleLoading.set(true);
    const start=()=>{
      const google=(window as any).google;
      if(!google?.accounts?.id){this.googleLoading.set(false);this.error.set('Google Sign-In could not be loaded.');return}
      google.accounts.id.initialize({client_id:environment.googleWebClientId,callback:(credential:any)=>this.finishGoogleAuth(credential?.credential)});
      const host=document.getElementById('google-button-host');
      if(!host){this.googleLoading.set(false);this.error.set('Google Sign-In button could not be initialized.');return}
      host.innerHTML='';
      google.accounts.id.renderButton(host,{theme:'outline',size:'large',width:Math.min(520,host.clientWidth||520),text:this.mode()==='signup'?'signup_with':'signin_with',shape:'rectangular'});
      this.googleLoading.set(false);
    };
    if((window as any).google?.accounts?.id){start();return}
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.onload=start;script.onerror=()=>{this.googleLoading.set(false);this.error.set('Google Sign-In could not be loaded. Check your connection and try again.')};document.head.appendChild(script);this.googleScript=script;
  }
  private finishGoogleAuth(idToken:string){
    if(!idToken){this.googleLoading.set(false);this.error.set('Google did not return a valid sign-in token.');return}
    this.auth.social('GOOGLE',idToken,this.role()).subscribe({next:r=>{this.googleLoading.set(false);if(r.profileComplete){this.routeHome(r.role);return}const p=r.profile||{};this.finishName=p.name||'';this.finishCompany=p.companyName||'';this.finishPhone=p.phone&&String(p.phone)!=='0'?String(p.phone):'';this.finishCountry=p.country||'Cameroon';this.finishRegion=p.region||'';this.finishCity=p.city||'';this.finishStreet=p.street||'';this.finishNationalId=null;this.finishProfileOpen.set(true)},error:e=>{this.googleLoading.set(false);this.error.set(e.error?.error||'Could not sign you in with Google.')}})
  }
  saveFinishProfile(){
    if(!this.finishName.trim()){this.error.set('Please enter your full name.');return}if(this.role()==='SELLER'&&!this.finishCompany.trim()){this.error.set('Please enter your company name.');return}if(!this.finishNationalId){this.error.set('Please upload your National ID to finish setting up your account.');return}
    const f=new FormData();f.append('name',this.finishName.trim());if(this.role()==='SELLER')f.append('companyName',this.finishCompany.trim());f.append('phone',this.finishPhone);f.append('country',this.finishCountry.trim());f.append('region',this.finishRegion.trim());f.append('city',this.finishCity.trim());f.append('street',this.finishStreet.trim());f.append('nationalId',this.finishNationalId);this.finishSaving.set(true);this.auth.completeProfile(f).subscribe({next:()=>{this.finishSaving.set(false);this.finishProfileOpen.set(false);this.routeHome(this.role())},error:e=>{this.finishSaving.set(false);this.error.set(e.error?.error||'Could not save your profile.')}})
  }
  openForgot(){this.forgotStep.set('email');this.forgotError.set('');this.forgotEmail=this.email||'';this.resetCode='';this.newPassword='';this.confirmNewPassword='';this.forgotOpen.set(true)}
  sendResetCode(){const email=this.forgotEmail.trim();if(!email){this.forgotError.set('Enter your email address.');return}this.forgotLoading.set(true);this.forgotError.set('');this.auth.forgotPassword(email).subscribe({next:()=>{this.forgotLoading.set(false);this.forgotStep.set('code')},error:e=>{this.forgotLoading.set(false);this.forgotError.set(e.error?.error||'Could not send the reset code.')}})}
  verifyReset(){const code=this.resetCode.trim();if(!/^\d{6}$/.test(code)){this.forgotError.set('Enter the 6-digit verification code.');return}this.forgotLoading.set(true);this.forgotError.set('');this.auth.verifyResetCode(this.forgotEmail.trim(),code).subscribe({next:()=>{this.forgotLoading.set(false);this.forgotStep.set('password')},error:e=>{this.forgotLoading.set(false);this.forgotError.set(e.error?.error||'The verification code is invalid or expired.')}})}
  finishReset(){if(this.newPassword.length<8){this.forgotError.set('Password must be at least 8 characters long.');return}if(this.newPassword!==this.confirmNewPassword){this.forgotError.set('Passwords do not match.');return}this.forgotLoading.set(true);this.forgotError.set('');this.auth.resetPassword(this.forgotEmail.trim(),this.resetCode.trim(),this.newPassword).subscribe({next:()=>{this.forgotLoading.set(false);this.forgotStep.set('done')},error:e=>{this.forgotLoading.set(false);this.forgotError.set(e.error?.error||'Could not reset your password.')}})}
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
