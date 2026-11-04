import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({selector:'sc-seeker-dashboard',imports:[RouterLink],templateUrl:'./seeker-dashboard.html',styleUrl:'./seeker-dashboard.css'})
export class SeekerDashboard implements OnInit, OnDestroy {
  listings = signal<any[]>([]);
  loading = signal(true);
  private loaded = false;
  private mq?: MediaQueryList;
  private onChange = (e: MediaQueryListEvent) => { if (e.matches) this.load(); };

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    // The mobile/tablet home only needs its data on small screens, so desktop makes no extra request.
    if (typeof window === 'undefined' || !window.matchMedia) return;
    this.mq = window.matchMedia('(max-width:1024px)');
    if (this.mq.matches) this.load();
    this.mq.addEventListener?.('change', this.onChange);
  }
  ngOnDestroy() { this.mq?.removeEventListener?.('change', this.onChange); }

  private load() {
    if (this.loaded) return;
    this.loaded = true;
    this.loading.set(true);
    this.api.get<any>('/listings', { limit: 5, page: 1, sortBy: 'createdAt', sortOrder: 'desc', status: 'Approved' }, 30000).subscribe({
      next: r => { const items = Array.isArray(r) ? r : (r?.listings || []); this.listings.set(items.slice(0, 5)); this.loading.set(false); },
      error: () => { this.listings.set([]); this.loading.set(false); }
    });
  }

  avatar(): string { const p = this.auth.profile(); return p?.avatarUrl || p?.avatar || ''; }
  firstName(): string {
    const p: any = this.auth.profile() || {};
    const raw = [p.fullName, p.name, p.companyName, String(p.email || '').split('@')[0]].find(v => typeof v === 'string' && v.trim());
    return (raw ? String(raw).trim().split(/\s+/)[0] : '') || 'there';
  }
  image(l: any): string | null {
    const imgs: any[] = l?.images || [];
    if (!imgs.length) return null;
    return (imgs.find(i => i.isPrimary)?.imageUrl) ?? ([...imgs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.imageUrl) ?? null;
  }
  price(l: any): string {
    const n = Number(l?.price); const freq = l?.paymentFrequency;
    const f = n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M` : n.toLocaleString('fr-CM');
    return freq === 'For Sale' ? `FCFA ${f}` : freq === 'Yearly' ? `FCFA ${f}/yr` : `FCFA ${f}/mo`;
  }
  location(l: any): string { return [l?.neighborhood, l?.city, l?.region].filter(Boolean).join(', '); }
}
