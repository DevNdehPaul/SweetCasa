import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({selector:'sc-casamatch',imports:[FormsModule,DatePipe],templateUrl:'./casamatch.html',styleUrl:'./casamatch.css'})
export class Casamatch implements OnInit{
 conversations=signal<any[]>([]); active=signal<any|null>(null); messages=signal<any[]>([]);
 loading=signal(true); sending=signal(false); error=signal(''); text=''; image:File|null=null;
 constructor(private api:ApiService){}
 ngOnInit(){this.loadHistory();}
 loadHistory(){this.api.get<any>('/api/casamatch-chat/conversations',{},15000).subscribe({next:r=>{this.conversations.set(r.conversations||[]);this.loading.set(false)},error:e=>{this.error.set(e.error?.error||'Could not load CasaMatch.');this.loading.set(false)}});}
 newChat(prefill=''){this.api.post<any>('/api/casamatch-chat/conversations',{language:localStorage.getItem('sc-lang')||'en'}).subscribe({next:r=>{this.open(r.conversation.id);if(prefill)setTimeout(()=>{this.text=prefill},0)},error:e=>this.error.set(e.error?.error||'Could not start chat.')});}
 open(id:number){this.active.set({id,title:'CasaMatch AI'});this.loading.set(true);this.api.get<any>(`/api/casamatch-chat/conversations/${id}`).subscribe({next:r=>{this.active.set(r.conversation);this.messages.set(r.conversation.messages||[]);this.loading.set(false)},error:e=>{this.error.set(e.error?.error||'Could not open chat.');this.loading.set(false)}});}
 chooseImage(e:Event){this.image=(e.target as HTMLInputElement).files?.[0]||null;}
 send(prefill?:string){const content=(prefill??this.text).trim();if(!content&&!this.image||!this.active())return;const f=new FormData();if(content)f.append('content',content);if(this.image)f.append('image',this.image);f.append('language',localStorage.getItem('sc-lang')||'en');const optimistic={id:'temp-'+Date.now(),role:'user',content,imageUrl:this.image?URL.createObjectURL(this.image):null,createdAt:new Date().toISOString()};this.messages.update(v=>[...v,optimistic]);this.text='';this.image=null;this.sending.set(true);this.api.post<any>(`/api/casamatch-chat/conversations/${this.active().id}/messages`,f).subscribe({next:r=>{this.messages.update(v=>[...v.filter(m=>m.id!==optimistic.id),r.userMessage,r.aiMessage]);this.sending.set(false);this.loadHistory()},error:e=>{this.messages.update(v=>v.filter(m=>m.id!==optimistic.id));this.error.set(e.error?.error||'Could not send message.');this.sending.set(false)}});}
 remove(id:number,event:Event){event.stopPropagation();if(!confirm('Delete this CasaMatch conversation?'))return;this.api.delete(`/api/casamatch-chat/conversations/${id}`).subscribe({next:()=>{this.conversations.update(v=>v.filter(c=>c.id!==id));if(this.active()?.id===id){this.active.set(null);this.messages.set([])}}});}
 firstImage(m:any){return m.images?.[0]||null;}
}
