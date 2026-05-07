import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SensorDataService, DonneesCapteurs } from '../../core/services/sensor-data.service';
@Component({
  selector: 'app-authority-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './authority-dashboard.component.html',
  styleUrls: ['./authority-dashboard.component.scss']
})
export class AuthorityDashboardComponent implements OnInit, OnDestroy {

  derniereMaj = '';
  estConnecte = false;
  nombreAlertes = 0;
  nombreAvertissements = 0;
  nombreSites = 4;
  nombreUnites = 3;

  private abonnement!: Subscription;

  sites = [
    { nom: 'Bâtiment A', adresse: 'Zone résidentielle Nord', fumee: 0, temperature: 0, humidite: 0, statut: 'normal' },
    { nom: 'Bâtiment B', adresse: 'Zone résidentielle Est',  fumee: 0, temperature: 0, humidite: 0, statut: 'normal' },
    { nom: 'École primaire', adresse: 'Centre-ville',        fumee: 0, temperature: 0, humidite: 0, statut: 'normal' },
    { nom: 'Marché couvert', adresse: 'Place centrale',      fumee: 0, temperature: 0, humidite: 0, statut: 'normal' },
  ];

  alertes = [
    { niveau: 'info', titre: 'Système initialisé', detail: 'En attente des données capteurs...', heure: '--:--' }
  ];

  unites = [
    { nom: 'Caserne Nord',           type: 'Pompiers · 3 camions',   statut: 'disponible' },
    { nom: 'Caserne Centre',         type: 'Pompiers · 2 camions',   statut: 'disponible' },
    { nom: 'Police municipale',      type: 'Sécurité · 2 véhicules', statut: 'disponible' },
    { nom: 'SAMU local',             type: 'Médical · 1 unité',      statut: 'disponible' },
    { nom: 'Mairie — Cellule crise', type: 'Coordination civile',    statut: 'disponible' },
  ];

  donneesGraphique = [
    { heure: '-6h', batA: 0, batB: 0, ecole: 0, marche: 0 },
    { heure: '-5h', batA: 0, batB: 0, ecole: 0, marche: 0 },
    { heure: '-4h', batA: 0, batB: 0, ecole: 0, marche: 0 },
    { heure: '-3h', batA: 0, batB: 0, ecole: 0, marche: 0 },
    { heure: '-2h', batA: 0, batB: 0, ecole: 0, marche: 0 },
    { heure: '-1h', batA: 0, batB: 0, ecole: 0, marche: 0 },
    { heure: 'Maint.', batA: 0, batB: 0, ecole: 0, marche: 0 },
  ];

  constructor(
    private routeur: Router,
    private serviceCapteurs: SensorDataService,
    private detecteurChangements: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.abonnement = this.serviceCapteurs.donnees$.subscribe(
      (donnees: DonneesCapteurs) => {
        this.estConnecte = donnees.estConnecte;
        this.derniereMaj = donnees.derniereMaj;
  
        this.sites[0] = {
          ...this.sites[0],
          fumee:       donnees.niveauFumee,
          temperature: donnees.temperature,
          humidite:    donnees.humidite,
          statut: donnees.niveauFumee > 300 || donnees.temperature > 55 ? 'critique'
                : donnees.niveauFumee > 200 || donnees.temperature > 40 ? 'alerte'
                : 'normal'
        };
  
        this.nombreAlertes = this.sites.filter(s => s.statut === 'critique').length;
        this.nombreAvertissements = this.sites.filter(s => s.statut === 'alerte').length;
  
        this.mettreAJourGraphique(donnees.niveauFumee);
  
        if (donnees.niveauFumee > 300) {
          this.ajouterAlerte('critique',
            'Fumée critique — Bât. A',
            `${Math.round(donnees.niveauFumee)} ppm · home/mq5`,
            donnees.derniereMaj
          );
        } else if (donnees.temperature > 55) {
          this.ajouterAlerte('alerte',
            'Température élevée — Bât. A',
            `${Math.round(donnees.temperature)}°C · home/dht11`,
            donnees.derniereMaj
          );
        }
  
        // Forcer la mise à jour du graphique SVG
        this.detecteurChangements.detectChanges();
      }
    );
  }

  ngOnDestroy(): void {
    this.abonnement?.unsubscribe();
  }

  private mettreAJourGraphique(valeurFumee: number): void {
    const nouvellesDonnees = [...this.donneesGraphique.slice(1), {
      heure:  'Maint.',
      batA:   valeurFumee,
      batB:   this.donneesGraphique[6].batB,
      ecole:  this.donneesGraphique[6].ecole,
      marche: this.donneesGraphique[6].marche
    }];
  
    // Réassigner complètement pour déclencher la détection
    this.donneesGraphique = nouvellesDonnees;
  }

  private ajouterAlerte(niveau: string, titre: string, detail: string, heure: string): void {
    // Éviter les doublons sur la même minute
    const existe = this.alertes.find(a => a.titre === titre && a.heure === heure);
    if (existe) return;

    this.alertes.unshift({ niveau, titre, detail, heure });

    // Garder max 10 alertes
    if (this.alertes.length > 10) {
      this.alertes = this.alertes.slice(0, 10);
    }
  }

  // ── Méthodes d'affichage ──

  get pointsBatA():   string { return this.calculerPoints('batA'); }
  get pointsBatB():   string { return this.calculerPoints('batB'); }
  get pointsEcole():  string { return this.calculerPoints('ecole'); }
  get pointsMarche(): string { return this.calculerPoints('marche'); }

  private calculerPoints(cle: 'batA'|'batB'|'ecole'|'marche'): string {
    const valeurMax = 400;
    return this.donneesGraphique.map((d, i) => {
      const x = 20 + (i / (this.donneesGraphique.length - 1)) * 580;
      const y = 140 - (d[cle] / valeurMax) * 140;
      return `${x},${y}`;
    }).join(' ');
  }

  obtenirClasseStatutSite(statut: string): string {
    const classes: Record<string, string> = {
      'normal': 'statut-normal', 'critique': 'statut-critique', 'alerte': 'statut-alerte'
    };
    return classes[statut] || '';
  }

  obtenirLibelleStatut(statut: string): string {
    const libelles: Record<string, string> = {
      'normal': 'NORMAL', 'critique': 'CRITIQUE', 'alerte': 'ALERTE'
    };
    return libelles[statut] || statut;
  }

  obtenirClasseValeurFumee(fumee: number): string {
    return fumee > 300 ? 'valeur-critique' : fumee > 200 ? 'valeur-alerte' : 'valeur-normale';
  }

  obtenirClasseValeurTemp(temp: number): string {
    return temp > 55 ? 'valeur-critique' : temp > 40 ? 'valeur-alerte' : '';
  }

  obtenirClasseUnite(statut: string): string {
    const classes: Record<string, string> = {
      'disponible': 'unite-disponible', 'intervention': 'unite-intervention', 'alerte': 'unite-alerte'
    };
    return classes[statut] || '';
  }

  obtenirLibelleUnite(statut: string): string {
    const libelles: Record<string, string> = {
      'disponible': 'Disponible', 'intervention': 'En intervention', 'alerte': 'En alerte'
    };
    return libelles[statut] || statut;
  }

  obtenirClasseAlerte(niveau: string): string {
    const classes: Record<string, string> = {
      'critique': 'point-critique', 'alerte': 'point-alerte', 'info': 'point-info'
    };
    return classes[niveau] || '';
  }

  allerVersResidents(): void {
    this.routeur.navigate(['/residents']);
  }
}