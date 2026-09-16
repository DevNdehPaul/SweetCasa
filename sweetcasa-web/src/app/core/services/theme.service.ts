import { Injectable, signal } from '@angular/core';
@Injectable({providedIn:'root'}) export class ThemeService {
  mode=signal<'light'|'dark'>(localStorage.getItem('sc-theme')==='dark'?'dark':'light');
  constructor(){this.apply();}
  toggle(){this.mode.update(v=>v==='light'?'dark':'light');localStorage.setItem('sc-theme',this.mode());this.apply();}
  private apply(){document.documentElement.dataset['theme']=this.mode();}
}