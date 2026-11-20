import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { I18nService } from '../../core/services/i18n.service';
import { ApiService } from '../../core/services/api.service';

// Must match FAPSHI_FEE_RATE in the backend wallet controller and the mobile app.
const FEE_RATE = 0.04;

@Component({selector:'sc-landing',imports:[RouterLink,TopbarComponent],templateUrl:'./landing.html',styleUrl:'./landing.css'})
export class Landing implements OnInit, OnDestroy {
  // Real data from the SweetCasa API (approved listings only)
  listings = signal<any[]>([]);
  total = signal<number | null>(null);
  hero = computed(() => this.listings()[0] ?? null);

  // Hero carousel: rotates through the newest approved listings
  slideIdx = signal(0);
  slides = computed(() => this.listings().slice(0, 5));
  slide = computed(() => { const s = this.slides(); return s.length ? s[this.slideIdx() % s.length] : null; });
  private timer: any = null;
  goSlide(i: number) { this.slideIdx.set(i); this.restartTimer(); }
  private restartTimer() {
    if (this.timer) clearInterval(this.timer);
    if (this.slides().length > 1) this.timer = setInterval(() => this.slideIdx.set((this.slideIdx() + 1) % this.slides().length), 5500);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  // Deposit estimate
  amount = signal(350000);
  fee = computed(() => Math.ceil(this.amount() * FEE_RATE));
  totalPay = computed(() => this.amount() + this.fee());

  // Hero search + interactive previews
  mode = signal<'rent'|'sale'>('rent');
  city = signal('');
  quarter = signal('');
  ceiling = signal('');
  ceilings = [300000, 450000, 800000, 1500000];
  step = signal(1);
  presets = [250000, 350000, 600000];
  prompt = signal(0);
  prompts = ['2-bedroom apartment in Douala under 300,000 XAF', 'Quiet house with a generator and water', 'Studio near the city centre'];
  cities = computed(() => { const c = [...new Set(this.listings().map(l => l.city).filter(Boolean))].slice(0,3); return c.length ? c : ['Douala','Yaoundé']; });
  quarters = computed(() => {
    const c = this.city();
    const src = this.listings().filter(l => !c || l.city === c);
    return [...new Set(src.map(l => l.neighborhood).filter(Boolean))].slice(0,8);
  });
  newThisWeek = computed(() => { const cut = Date.now() - 7*864e5; return this.listings().filter(l => l.createdAt && new Date(l.createdAt).getTime() >= cut).length; });
  openFaq = signal(0);
  faqs = [
    { q:'Is my money safe?', a:'Your deposit stays in your SweetCasa escrow wallet. When you purchase a home, the funds are locked and only released to the owner after your 7-day verification window. If the home does not match its description, you can report it to our team.' },
    { q:'How are homes verified?', a:'Owners upload photos, a video walkthrough and legal documents. Our team reviews each listing and only approved homes appear in search.' },
    { q:'Which payment methods are supported?', a:'MTN Mobile Money and Orange Money. A 4% processing fee is added to each escrow purchase or reservation, and it is shown before you confirm.' },
    { q:'Who can list a property?', a:'Property owners and authorised property administrators. Create an owner account, add your property details and legal documents, and submit it for review.' },
    { q:'Is SweetCasa available in French?', a:'Yes. You can switch between English and French at any time from the top of the page.' },
  ];

  constructor(public i18n: I18nService, private api: ApiService) {}

  ngOnInit() {
    this.api.get<any>('/listings', { status:'Approved', page:1, limit:6, sortBy:'createdAt', sortOrder:'desc' }, 60000).subscribe({
      next: (r) => {
        const items: any[] = Array.isArray(r) ? r : (r?.listings ?? []);
        const approved = items.filter(l => l && (l.status == null || l.status === 'Approved'));
        this.listings.set(approved);
        this.total.set(Number(r?.total ?? approved.length));
        this.restartTimer();
      },
      error: () => { /* page still works without live data */ },
    });
  }

  setCity(c: string) { this.city.set(this.city()===c ? '' : c); this.quarter.set(''); }
  feeOf(n: any) { return Math.ceil((Number(n)||0) * FEE_RATE); }
  setAmount(e: Event) { this.amount.set(Number((e.target as HTMLInputElement).value) || 100000); }
  place(l: any) { return [l?.neighborhood, l?.city].filter(Boolean).join(' · '); }
  money(n: any) { return `${Math.round(Number(n) || 0).toLocaleString('en-US')} XAF`; }
  image(l: any) { return l?.images?.[0]?.imageUrl || l?.images?.[0]?.url || '/assets/seeker_lifestyle.png'; }
  beds(l: any) {
    const p: string[] = [];
    if (l?.bedrooms) p.push(`${l.bedrooms} ${this.i18n.text('bedrooms')}`);
    if (l?.bathrooms) p.push(`${l.bathrooms} ${this.i18n.text('bathrooms')}`);
    if (l?.areaSqm) p.push(`${l.areaSqm} m²`);
    return p.join(' · ');
  }
}
