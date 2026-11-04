import { CanActivateFn } from '@angular/router';
// SweetCasa is now fully responsive (phone, tablet, desktop), so every screen size is allowed.
// The guard is kept as a no-op so existing route config keeps working.
export const desktopGuard: CanActivateFn = () => true;
