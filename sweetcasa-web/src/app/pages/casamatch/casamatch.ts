import { AfterViewInit, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({selector:'sc-casamatch',imports:[FormsModule,DatePipe],templateUrl:'./casamatch.html',styleUrl:'./casamatch.css'})
export class Casamatch implements OnInit,OnDestroy,AfterViewInit{
 conversations=signal<any[]>([]); showChat=signal(false);active=signal<any|null>(null); messages=signal<any[]>([]);
 loading=signal(true); sending=signal(false); error=signal(''); text=''; image:File|null=null;
 constructor(private api:ApiService){}
 private fitHandler=()=>this.fit();
 ngOnInit(){this.lockPage(true);window.addEventListener('resize',this.fitHandler);this.loadHistory();}
 ngAfterViewInit(){this.fit();setTimeout(()=>this.fit(),200);setTimeout(()=>this.fit(),800)}
 ngOnDestroy(){this.lockPage(false);window.removeEventListener('resize',this.fitHandler)}
 // Desktop: lock the page and size the screen to the free space so only the chat list and the conversation scroll.
 fit(){const el=document.querySelector('.cm') as HTMLElement|null;if(!el)return;if(window.innerWidth<=1024){el.style.height='';return}window.scrollTo(0,0);const top=el.getBoundingClientRect().top;el.style.height=Math.max(420,window.innerHeight-top-24)+'px'}
 lockPage(on:boolean){const lock=on&&window.innerWidth>1024;for(const el of [document.documentElement,document.body])el.style.overflow=lock?'hidden':''}
 scrollDown(){setTimeout(()=>{const t=document.querySelector('.cm .messages');if(t)t.scrollTop=t.scrollHeight},30)}
 onEnter(e:Event){const k=e as KeyboardEvent;if(k.shiftKey)return;k.preventDefault();if(!this.sending())this.send()}
 grow(e:Event){const t=e.target as HTMLTextAreaElement;t.style.height='auto';t.style.height=Math.min(t.scrollHeight,140)+'px'}
 resetBox(){const t=document.querySelector('.cm textarea') as HTMLTextAreaElement|null;if(t)t.style.height=''}
 loadHistory(){this.api.get<any>('/api/casamatch-chat/conversations',{},15000).subscribe({next:r=>{this.conversations.set(r.conversations||[]);this.loading.set(false)},error:e=>{this.error.set(e.error?.error||'Could not load CasaMatch.');this.loading.set(false)}});}
 newChat(prefill=''){this.api.post<any>('/api/casamatch-chat/conversations',{language:localStorage.getItem('sc-lang')||'en'}).subscribe({next:r=>{this.open(r.conversation.id);if(prefill)setTimeout(()=>{this.text=prefill},0)},error:e=>this.error.set(e.error?.error||'Could not start chat.')});}
 open(id:number){this.active.set({id,title:'CasaMatch AI'});this.loading.set(true);this.api.get<any>(`/api/casamatch-chat/conversations/${id}`).subscribe({next:r=>{this.active.set(r.conversation);this.messages.set(r.conversation.messages||[]);this.loading.set(false);this.scrollDown()},error:e=>{this.error.set(e.error?.error||'Could not open chat.');this.loading.set(false)}});}
 chooseImage(e:Event){this.image=(e.target as HTMLInputElement).files?.[0]||null;}
 send(prefill?:string){const content=(prefill??this.text).trim();if(!content&&!this.image||!this.active())return;const f=new FormData();if(content)f.append('content',content);if(this.image)f.append('image',this.image);f.append('language',localStorage.getItem('sc-lang')||'en');const optimistic={id:'temp-'+Date.now(),role:'user',content,imageUrl:this.image?URL.createObjectURL(this.image):null,createdAt:new Date().toISOString()};this.messages.update(v=>[...v,optimistic]);this.text='';this.image=null;this.sending.set(true);this.resetBox();this.scrollDown();this.api.post<any>(`/api/casamatch-chat/conversations/${this.active().id}/messages`,f).subscribe({next:r=>{this.messages.update(v=>[...v.filter(m=>m.id!==optimistic.id),r.userMessage,r.aiMessage]);this.sending.set(false);this.loadHistory();this.scrollDown()},error:e=>{this.messages.update(v=>v.filter(m=>m.id!==optimistic.id));this.error.set(e.error?.error||'Could not send message.');this.sending.set(false)}});}
 remove(id:number,event:Event){event.stopPropagation();if(!confirm('Delete this CasaMatch conversation?'))return;this.api.delete(`/api/casamatch-chat/conversations/${id}`).subscribe({next:()=>{this.conversations.update(v=>v.filter(c=>c.id!==id));if(this.active()?.id===id){this.active.set(null);this.messages.set([])}}});}

 // ---- Minimal, safe Markdown for AI replies (HTML is escaped first; only a fixed set of tags is produced) ----
 private mdCache=new Map<string,string>();
 md(src:any):string{
  const text=String(src??'');if(!text)return '';
  const hit=this.mdCache.get(text);if(hit!==undefined)return hit;
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inl=(s:string)=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*\s*(.+?)\s*\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g,'$1<em>$2</em>');
  let html='',para:string[]=[];const stack:string[]=[],open:boolean[]=[];
  const flush=()=>{if(para.length){html+='<p>'+para.map(inl).join('<br>')+'</p>';para=[]}};
  const popList=()=>{if(open.pop())html+='</li>';html+='</'+stack.pop()+'>'};
  const closeLists=()=>{while(stack.length)popList()};
  const item=(level:number,tag:string,txt:string)=>{
   level=Math.min(level,stack.length);
   while(stack.length>level+1)popList();
   if(stack.length===level+1){
    if(stack[level]!==tag){popList();html+='<'+tag+'>';stack.push(tag);open.push(false)}
    else if(open[level]){html+='</li>';open[level]=false}
   }else{html+='<'+tag+'>';stack.push(tag);open.push(false)}
   html+='<li>'+inl(txt);open[stack.length-1]=true;
  };
  for(const line of text.replace(/\r/g,'').split('\n')){
   if(!line.trim()){flush();continue}
   let m:RegExpMatchArray|null;
   if(/^\s*(-{2,}|\*{3,}|_{3,})\s*$/.test(line)){flush();closeLists();html+='<hr>';continue}
   if((m=line.match(/^\s{0,3}(#{1,6})\s+(.*)$/))){flush();closeLists();html+=(m[1].length<=2?'<h3>':'<h4>')+inl(m[2])+(m[1].length<=2?'</h3>':'</h4>');continue}
   if((m=line.match(/^(\s*)[-*•]\s+(.*)$/))){flush();item(m[1].length>=2?1:0,'ul',m[2]);continue}
   if((m=line.match(/^(\s*)\d+[.)]\s+(.*)$/))){flush();item(m[1].length>=2?1:0,'ol',m[2]);continue}
   closeLists();para.push(line);
  }
  flush();closeLists();
  if(this.mdCache.size>300)this.mdCache.clear();
  this.mdCache.set(text,html);return html;
 }
 firstImage(m:any){return m.images?.[0]||null;}
}
