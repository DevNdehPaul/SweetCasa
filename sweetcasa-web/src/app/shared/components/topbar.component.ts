import { Component } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector:'sc-topbar',
  templateUrl:'./topbar.component.html',
  styleUrl:'./topbar.component.css'
})
export class TopbarComponent {
  constructor(public theme:ThemeService, public i18n:I18nService){}
}
