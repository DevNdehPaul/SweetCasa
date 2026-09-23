import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { LegalModalComponent } from '../../shared/components/legal-modal.component';
@Component({selector:'sc-settings',imports:[RouterLink,LegalModalComponent],templateUrl:'./settings.html',styleUrl:'./settings.css'})
export class Settings{
 legalModal=signal<'terms'|'privacy'|null>(null);
 constructor(public theme:ThemeService,public i18n:I18nService,public auth:AuthService){}
 path(child:string){return `/${this.auth.role()==='SELLER'?'owner':'seeker'}/${child}`}
}
