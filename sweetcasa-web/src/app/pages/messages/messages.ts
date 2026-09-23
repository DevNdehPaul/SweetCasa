import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
@Component({selector:'sc-messages',imports:[FormsModule,DatePipe],templateUrl:'./messages.html',styleUrl:'./messages.css'})
export class Messages implements OnInit,OnDestroy{
 convs=signal<any[]>([]);selected=signal<any>(null);messages=signal<any[]>([]);text='';loading=signal(true);error=signal('');private timer:any;private focusHandler=()=>this.refresh(false);
 constructor(private api:ApiService,private route:ActivatedRoute){}
 ngOnInit(){this.refresh(true);window.addEventListener('focus',this.focusHandler);document.addEventListener('visibilitychange',this.focusHandler);this.timer=setInterval(()=>{if(!document.hidden)this.refresh(false)},5000)}
 ngOnDestroy(){clearInterval(this.timer);window.removeEventListener('focus',this.focusHandler);document.removeEventListener('visibilitychange',this.focusHandler)}
 refresh(initial=false){this.api.clearCache('/messages/conversations');this.api.get<any>('/messages/conversations').subscribe({next:r=>{this.convs.set(r.conversations||[]);this.loading.set(false);const wanted=Number(this.route.snapshot.queryParamMap.get('conversation'));const current=this.selected()?.id;const c=this.convs().find((x:any)=>x.id===(wanted||current))||(initial?this.convs()[0]:null);if(c&&(!current||c.id===current))this.open(c,false)},error:e=>{if(initial){this.error.set(e.error?.error||'Could not load conversations.');this.loading.set(false)}}})}
 open(c:any,mark=true){this.selected.set({...c,unreadCount:0});this.convs.update(rows=>rows.map(x=>x.id===c.id?{...x,unreadCount:0}:x));if(mark)this.api.patch<any>(`/messages/conversations/${c.id}/read`,{}).subscribe({next:()=>this.api.clearCache('/messages/conversations'),error:()=>{}});this.api.get<any>(`/messages/conversations/${c.id}`).subscribe({next:r=>{this.messages.set(r.messages||[]);if(!mark)this.api.patch<any>(`/messages/conversations/${c.id}/read`,{}).subscribe({error:()=>{}})}})}
 send(){if(!this.text.trim()||!this.selected())return;const content=this.text.trim();this.text='';this.api.post<any>(`/messages/conversations/${this.selected().id}/messages`,{content,text:content}).subscribe({next:r=>{const m=r.message||r;this.messages.update(v=>[...v,m]);this.convs.update(rows=>rows.map(c=>c.id===this.selected().id?{...c,lastMessage:m,unreadCount:0}:c));this.api.clearCache('/messages/conversations')},error:e=>this.error.set(e.error?.error||'Could not send message.')})}
}
