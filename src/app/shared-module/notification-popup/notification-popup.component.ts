import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AlertService, Alerte } from '../../core/services/alert.service';

@Component({
  selector: 'app-notification-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-popup.component.html',
  styleUrls: ['./notification-popup.component.scss']
})
export class NotificationPopupComponent implements OnInit, OnDestroy {

  alerteActive: Alerte | null = null;
  private abonnement!: Subscription;

  constructor(private serviceAlertes: AlertService) {}

  ngOnInit(): void {
    this.abonnement = this.serviceAlertes.notification$.subscribe(
      alerte => this.alerteActive = alerte
    );
  }

  ngOnDestroy(): void { this.abonnement?.unsubscribe(); }

  fermer(): void { this.alerteActive = null; }
}