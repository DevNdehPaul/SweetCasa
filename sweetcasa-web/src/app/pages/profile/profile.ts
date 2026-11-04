import { Component, OnInit, signal } from '@angular/core';import { FormsModule } from '@angular/forms';import { AuthService } from '../../core/services/auth.service';import { Router, RouterLink } from '@angular/router';import { I18nService } from '../../core/services/i18n.service';import { LegalModalComponent } from '../../shared/components/legal-modal.component';
@Component({selector:'sc-profile',imports:[FormsModule,RouterLink,LegalModalComponent],templateUrl:'./profile.html',styleUrl:'./profile.css'})
export class Profile implements OnInit{
 name='';companyName='';phone='';country='';region='';city='';street='';email='';avatar:File|null=null;nationalId:File|null=null;saving=signal(false);message=signal('');error=signal('');
 editing=signal(false);legalModal=signal<'terms'|'privacy'|null>(null);
 constructor(public auth:AuthService,private router:Router,public i18n:I18nService){}
 ngOnInit(){const p=this.auth.profile()||{};this.name=p.name||p.fullName||'';this.companyName=p.companyName||'';this.phone=p.phone||'';this.country=p.country||'Cameroon';this.region=p.region||'';this.city=p.city||'';this.street=p.street||'';this.email=p.email||'';}
 chooseAvatar(e:Event){this.avatar=(e.target as HTMLInputElement).files?.[0]||null}chooseId(e:Event){this.nationalId=(e.target as HTMLInputElement).files?.[0]||null}
 save(){const f=new FormData();f.append('name',this.name);f.append('companyName',this.companyName);f.append('phone',this.phone);f.append('country',this.country);f.append('region',this.region);f.append('city',this.city);f.append('street',this.street);if(this.avatar)f.append('avatar',this.avatar);if(this.nationalId)f.append('nationalId',this.nationalId);this.saving.set(true);this.message.set('');this.error.set('');this.auth.updateProfile(f).subscribe({next:()=>{this.saving.set(false);this.message.set('Changes saved successfully!')},error:e=>{this.saving.set(false);this.error.set(e.error?.error||'Save failed.')}})}
 initials(){return (this.name||this.email||'SC').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
 openEdit(){this.editing.set(true);window.scrollTo?.({top:0})}closeEdit(){this.editing.set(false);window.scrollTo?.({top:0})}
 path(p:string){return (this.auth.role()==='SELLER'?'/owner/':'/seeker/')+p}
 toggleLang(){this.i18n.setLang(this.i18n.lang()==='en'?'fr':'en')}
 displayName(){const p=this.auth.profile()||{};return this.auth.role()==='SELLER'?(p.companyName||p.name||'SweetCasa User'):(p.fullName||p.name||'SweetCasa User')}
 locationStr(){const p=this.auth.profile()||{};return [p.city,p.region,p.country].filter(Boolean).join(', ')||'Location not set'}
}
