import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({selector:'sc-owner-dashboard',imports:[RouterLink],templateUrl:'./owner-dashboard.html',styleUrl:'./owner-dashboard.css'})
export class OwnerDashboard implements OnInit, OnDestroy {
  listings = signal<any[]>([]);
  wallet = signal<any>(null);
  unread = signal(0);
  lead = signal('0%');
  private mine: any[] | null = null;
  private convs: any[] | null = null;
  private loaded = false;
  private mq?: MediaQueryList;
  private onChange = (e: MediaQueryListEvent) => { if (e.matches) this.load(); };

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    // Data for the mobile/tablet Agent Hub is only requested on small screens; desktop is unaffected.
    if (typeof window === 'undefined' || !window.matchMedia) return;
    this.mq = window.matchMedia('(max-width:1024px)');
    if (this.mq.matches) this.load();
    this.mq.addEventListener?.('change', this.onChange);
  }
  ngOnDestroy() { this.mq?.removeEventListener?.('change', this.onChange); }

  private load() {
    if (this.loaded) return;
    this.loaded = true;
    this.api.get<any>('/listings/mine').subscribe({
      next: r => {
        const items = (r?.listings || []).map((l: any) => ({
          id: l.id, title: l.title, price: `${Number(l.price).toLocaleString()} XAF`,
          status: l.status, views: l.views ?? 0, messages: l.messageCount ?? 0
        }));
        this.mine = items; this.listings.set(items); this.computeLead();
      },
      error: () => { this.mine = []; this.computeLead(); }
    });
    this.api.get<any>('/messages/conversations').subscribe({
      next: r => {
        const c: any[] = r?.conversations ?? [];
        this.convs = c; this.unread.set(c.reduce((s, x) => s + (x.unreadCount ?? 0), 0)); this.computeLead();
      },
      error: () => { this.convs = []; this.computeLead(); }
    });
    this.api.get<any>('/wallet/me').subscribe({ next: r => this.wallet.set(r?.wallet ?? null), error: () => {} });
  }
  private computeLead() {
    if (!this.mine || !this.convs) return;
    const total = this.mine.length;
    if (!total) { this.lead.set('0%'); return; }
    const ids = new Set(this.convs.map((c: any) => c.listing?.id).filter(Boolean));
    const withLeads = this.mine.filter(l => ids.has(Number(l.id))).length;
    this.lead.set(((withLeads / total) * 100).toFixed(1) + '%');
  }

  latest() { return this.listings().slice(0, 3); }
  avatar(): string { const p = this.auth.profile(); return p?.avatarUrl || p?.avatar || ''; }
  name(): string { const p = this.auth.profile(); return p?.name || p?.companyName || ''; }
  initials(): string {
    const p = this.auth.profile(); const n = String(p?.companyName || p?.name || 'SC');
    return n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') || 'SC';
  }
  total(): number { const w = this.wallet(); return w ? Number(w.heldBalance) + Number(w.availableBalance) : 0; }
  pending(): number { const w = this.wallet(); return w ? Number(w.heldBalance) : 0; }
  xaf(v: number): string { return `${Math.round(v || 0).toLocaleString('en-US')} XAF`; }
}
