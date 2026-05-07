import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SensorDataService, DonneesCapteurs } from '../../core/services/sensor-data.service';
import { AlertService, Alerte } from '../../core/services/alert.service';
import { NotificationPopupComponent } from '../../shared-module/notification-popup/notification-popup.component';

@Component({
  selector: 'app-resident-dashboard',
  standalone: true,
  imports: [CommonModule, NotificationPopupComponent],
  templateUrl: './resident-dashboard.component.html',
  styleUrls: ['./resident-dashboard.component.scss']
})
export class ResidentDashboardComponent implements OnInit, OnDestroy {

  niveauFumee  = 0;
  temperature  = 0;
  humidite     = 0;
  derniereMaj  = '--:--';
  estConnecte  = false;
  ongletActif  = 'statut';
  listeAlertes: Alerte[] = [];
  nombreAlertes = 0;

  private abonnements: Subscription[] = [];

  // Données historique pour les graphiques
  historiqueFumee: number[] = Array(20).fill(0);
  historiqueTemp:  number[] = Array(20).fill(0);
  historiqueHum:   number[] = Array(20).fill(0);

  consignes = [
    '<strong>Évacuez immédiatement</strong> le bâtiment dès que l\'alarme se déclenche.',
    '<strong>N\'utilisez jamais l\'ascenseur.</strong> Empruntez uniquement les escaliers.',
    'Rejoignez le <strong>point de rassemblement</strong> désigné devant le bâtiment.',
    '<strong>N\'entrez jamais</strong> dans une pièce enfumée. Restez bas si vous traversez de la fumée.',
    'Si vous êtes bloqué, <strong>signalez-vous à une fenêtre</strong> et appelez le 18.'
  ];

  constructor(
    private routeur: Router,
    private serviceCapteurs: SensorDataService,
    private serviceAlertes: AlertService
  ) {}

  ngOnInit(): void {
    this.abonnements.push(
      this.serviceCapteurs.donnees$.subscribe((donnees: DonneesCapteurs) => {
        this.niveauFumee     = donnees.niveauFumee;
        this.temperature     = donnees.temperature;
        this.humidite        = donnees.humidite;
        this.derniereMaj     = donnees.derniereMaj;
        this.estConnecte     = donnees.estConnecte;
        this.historiqueFumee = donnees.historiqueFumee;
        this.historiqueTemp  = donnees.historiqueTemp;
        this.historiqueHum   = donnees.historiqueHum;
      }),
      this.serviceAlertes.alertes$.subscribe((alertes: Alerte[]) => {
        this.listeAlertes  = alertes;
        this.nombreAlertes = alertes.filter(a => !a.lue).length;
      })
    );
  }

  ngOnDestroy(): void {
    this.abonnements.forEach(a => a.unsubscribe());
  }

  changerOnglet(onglet: string): void {
    this.ongletActif = onglet;
    if (onglet === 'alertes') this.serviceAlertes.marquerToutesLues();
  }

  marquerToutesLues(): void {
    this.serviceAlertes.marquerToutesLues();
  }

  // ── Getters jauges ──
  get estEnDanger(): boolean { return this.niveauFumee > 300 || this.temperature > 55; }
  get badgeFumee(): string { return this.niveauFumee > 300 ? 'DANGER' : this.niveauFumee > 200 ? 'ALERTE' : 'NORMAL'; }
  get classeBadgeFumee(): string { return this.niveauFumee > 300 ? 'badge-danger' : this.niveauFumee > 200 ? 'badge-alerte' : 'badge-normal'; }
  get couleurFumee(): string { return this.niveauFumee > 300 ? '#E05C5C' : this.niveauFumee > 200 ? '#E8944A' : '#4F86F7'; }
  get badgeTemperature(): string { return this.temperature > 55 ? 'DANGER' : this.temperature > 40 ? 'ÉLEVÉE' : 'NORMAL'; }
  get classeBadgeTemperature(): string { return this.temperature > 55 ? 'badge-danger' : this.temperature > 40 ? 'badge-alerte' : 'badge-normal'; }
  get couleurTemperature(): string { return this.temperature > 55 ? '#E05C5C' : this.temperature > 40 ? '#E8944A' : '#3BBFB0'; }
  get offsetFumee(): number { return 125.6 * (1 - Math.min(this.niveauFumee / 300, 1)); }
  get offsetTemperature(): number { return 125.6 * (1 - Math.min(this.temperature / 80, 1)); }
  get offsetHumidite(): number { return 125.6 * (1 - Math.min(this.humidite / 100, 1)); }
  get largeurBarreFumee(): number { return Math.min((this.niveauFumee / 300) * 100, 100); }
  get largeurBarreTemperature(): number { return Math.min((this.temperature / 80) * 100, 100); }

  // ── Getters graphiques ──
  get pointsGraphiqueFumee(): string  { return this.calculerPoints(this.historiqueFumee, 400); }
  get pointsGraphiqueTemp(): string   { return this.calculerPoints(this.historiqueTemp, 80); }
  get pointsGraphiqueHum(): string    { return this.calculerPoints(this.historiqueHum, 100); }

  private calculerPoints(donnees: number[], valeurMax: number): string {
    return donnees.map((v, i) => {
      const x = 20 + (i / (donnees.length - 1)) * 580;
      const y = 100 - (Math.min(v, valeurMax) / valeurMax) * 90;
      return `${x},${y}`;
    }).join(' ');
  }

  allerVersAutorites(): void { this.routeur.navigate(['/authorities']); }
}