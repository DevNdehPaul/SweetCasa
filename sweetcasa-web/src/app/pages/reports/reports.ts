import { Component, signal } from '@angular/core';import { FormsModule } from '@angular/forms';import { ApiService } from '../../core/services/api.service';
@Component({selector:'sc-reports',imports:[FormsModule],templateUrl:'./reports.html',styleUrl:'./reports.css'})
export class Reports{
 category='Fraud / Scam';subject='';description='';followUp=true;files:File[]=[];submitting=signal(false);message=signal('');error=signal('');
 constructor(private api:ApiService){}
 choose(e:Event){this.files=Array.from((e.target as HTMLInputElement).files||[]).slice(0,3);}
 submit(){this.error.set('');this.message.set('');if(!this.subject.trim()){this.error.set('Please enter a subject.');return}if(!this.description.trim()){this.error.set('Please describe the issue.');return}const f=new FormData();f.append('category',this.category);f.append('subject',this.subject.trim());f.append('description',this.description.trim());f.append('followUp',String(this.followUp));this.files.forEach(x=>f.append('evidence',x));this.submitting.set(true);this.api.post<any>('/reports',f).subscribe({next:r=>{this.submitting.set(false);this.message.set(r.message||'Report submitted successfully.');this.subject='';this.description='';this.files=[]},error:e=>{this.submitting.set(false);this.error.set(e.error?.error||'Could not submit report.')}})}
}
