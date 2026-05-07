import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'residents',
    loadComponent: () =>
      import('./residents/resident-dashboard/resident-dashboard.component')
        .then(m => m.ResidentDashboardComponent)
  },
  {
    path: 'authorities',
    loadComponent: () =>
      import('./authorities/authority-dashboard/authority-dashboard.component')
        .then(m => m.AuthorityDashboardComponent)
  },
  {
    path: '',
    redirectTo: 'residents',
    pathMatch: 'full'
  }
];