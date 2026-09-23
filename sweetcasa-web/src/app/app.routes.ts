import { Routes } from '@angular/router';
import { desktopGuard } from './core/guards/desktop.guard';

export const routes: Routes = [
  { path:'', loadComponent:()=>import('./pages/landing/landing').then(m=>m.Landing) },
  { path:'auth', loadComponent:()=>import('./pages/auth/auth').then(m=>m.Auth) },
  { path:'download-app', loadComponent:()=>import('./pages/download-app/download-app').then(m=>m.DownloadApp) },
  { path:'terms', loadComponent:()=>import('./pages/legal/legal').then(m=>m.Legal) },
  { path:'privacy', loadComponent:()=>import('./pages/legal/legal').then(m=>m.Legal) },

  { path:'seeker', canActivate:[desktopGuard], loadComponent:()=>import('./layouts/seeker-layout/seeker-layout').then(m=>m.SeekerLayout), children:[
    { path:'', loadComponent:()=>import('./pages/seeker-dashboard/seeker-dashboard').then(m=>m.SeekerDashboard) },
    { path:'search', loadComponent:()=>import('./pages/search/search').then(m=>m.Search) },
    { path:'property/:id', loadComponent:()=>import('./pages/property-detail/property-detail').then(m=>m.PropertyDetail) },
    { path:'property/:id/map', loadComponent:()=>import('./pages/neighborhood-map/neighborhood-map').then(m=>m.NeighborhoodMap) },
    { path:'favourites', loadComponent:()=>import('./pages/favourites/favourites').then(m=>m.Favourites) },
    { path:'casamatch', loadComponent:()=>import('./pages/casamatch/casamatch').then(m=>m.Casamatch) },
    { path:'messages', loadComponent:()=>import('./pages/messages/messages').then(m=>m.Messages) },
    { path:'viewings', loadComponent:()=>import('./pages/viewings/viewings').then(m=>m.Viewings) },
    { path:'wallet', loadComponent:()=>import('./pages/wallet/wallet').then(m=>m.Wallet) },
    { path:'lease/:id', loadComponent:()=>import('./pages/lease-agreement/lease-agreement').then(m=>m.LeaseAgreement) },
    { path:'reports', loadComponent:()=>import('./pages/reports/reports').then(m=>m.Reports) },
    { path:'profile', loadComponent:()=>import('./pages/profile/profile').then(m=>m.Profile) },
    { path:'settings', loadComponent:()=>import('./pages/settings/settings').then(m=>m.Settings) },
    { path:'notifications', loadComponent:()=>import('./pages/notifications/notifications').then(m=>m.Notifications) }
  ]},

  { path:'owner', canActivate:[desktopGuard], loadComponent:()=>import('./layouts/owner-layout/owner-layout').then(m=>m.OwnerLayout), children:[
    { path:'', loadComponent:()=>import('./pages/owner-dashboard/owner-dashboard').then(m=>m.OwnerDashboard) },
    { path:'listings', loadComponent:()=>import('./pages/listings/listings').then(m=>m.Listings) },
    { path:'property/:id', loadComponent:()=>import('./pages/property-detail/property-detail').then(m=>m.PropertyDetail) },
    { path:'property/:id/map', loadComponent:()=>import('./pages/neighborhood-map/neighborhood-map').then(m=>m.NeighborhoodMap) },
    { path:'upload', loadComponent:()=>import('./pages/upload/upload').then(m=>m.Upload) },
    { path:'messages', loadComponent:()=>import('./pages/messages/messages').then(m=>m.Messages) },
    { path:'viewings', loadComponent:()=>import('./pages/viewings/viewings').then(m=>m.Viewings) },
    { path:'wallet', loadComponent:()=>import('./pages/wallet/wallet').then(m=>m.Wallet) },
    { path:'reports', loadComponent:()=>import('./pages/reports/reports').then(m=>m.Reports) },
    { path:'profile', loadComponent:()=>import('./pages/profile/profile').then(m=>m.Profile) },
    { path:'settings', loadComponent:()=>import('./pages/settings/settings').then(m=>m.Settings) },
    { path:'notifications', loadComponent:()=>import('./pages/notifications/notifications').then(m=>m.Notifications) }
  ]},

  { path:'**', redirectTo:'' }
];
