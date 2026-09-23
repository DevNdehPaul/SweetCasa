import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

type Role='BUYER'|'SELLER';
type Kind='terms'|'privacy';
@Component({selector:'sc-legal-modal',standalone:true,templateUrl:'./legal-modal.component.html',styleUrl:'./legal-modal.component.css'})
export class LegalModalComponent{
 @Input() kind:Kind='terms'; @Input() role:Role='BUYER'; @Input() requireAcceptance=false;
 @Output() closed=new EventEmitter<void>(); @Output() accepted=new EventEmitter<void>();
 get owner(){return this.role==='SELLER'}
 get title(){return this.kind==='terms'?'Terms & Conditions':'Privacy Policy'}
 @HostListener('document:keydown.escape') esc(){this.closed.emit()}
}
