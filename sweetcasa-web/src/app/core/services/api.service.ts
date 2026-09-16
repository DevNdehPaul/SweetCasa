import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly base = environment.apiUrl.replace(/\/+$/, '');
  private cache = new Map<string, { at:number; value:Observable<any> }>();
  constructor(private http: HttpClient) {}

  get<T>(path:string, params?:Record<string,any>, cacheMs=0):Observable<T>{
    let hp=new HttpParams();
    Object.entries(params||{}).forEach(([k,v])=>{if(v!==''&&v!==null&&v!==undefined)hp=hp.set(k,String(v));});
    const key=path+'?'+hp.toString();
    const hit=this.cache.get(key);
    if(cacheMs>0 && hit && Date.now()-hit.at<cacheMs) return hit.value as Observable<T>;
    const req=this.http.get<T>(`${this.base}${path}`,{params:hp}).pipe(shareReplay({bufferSize:1,refCount:false}));
    if(cacheMs>0)this.cache.set(key,{at:Date.now(),value:req});
    return req;
  }
  post<T>(path:string,body:any){return this.http.post<T>(`${this.base}${path}`,body);}
  put<T>(path:string,body:any){return this.http.put<T>(`${this.base}${path}`,body);}
  patch<T>(path:string,body:any){return this.http.patch<T>(`${this.base}${path}`,body);}
  delete<T>(path:string){return this.http.delete<T>(`${this.base}${path}`);}
  clearCache(prefix=''){for(const k of [...this.cache.keys()])if(!prefix||k.startsWith(prefix))this.cache.delete(k);}
}
