import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Alerte {
  id:        number;
  niveau:    'critique' | 'alerte' | 'info';
  titre:     string;
  detail:    string;
  heure:     string;
  lue:       boolean;
}

@Injectable({ providedIn: 'root' })
export class AlertService {

  private compteur = 0;

  private sujetAlertes = new BehaviorSubject<Alerte[]>([
    {
      id: 0, niveau: 'info',
      titre: 'Système initialisé',
      detail: 'Surveillance active — en attente des données capteurs',
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      lue: false
    }
  ]);

  alertes$ = this.sujetAlertes.asObservable();

  private sujetNotification = new BehaviorSubject<Alerte | null>(null);
  notification$ = this.sujetNotification.asObservable();

  ajouterAlerte(niveau: 'critique' | 'alerte' | 'info', titre: string, detail: string): void {
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Éviter les doublons sur la même minute
    const existantes = this.sujetAlertes.getValue();
    const doublon = existantes.find(a => a.titre === titre &&
      a.heure.substring(0, 5) === heure.substring(0, 5));
    if (doublon) return;

    const nouvelleAlerte: Alerte = {
      id: ++this.compteur,
      niveau, titre, detail, heure, lue: false
    };

    // Ajouter en tête + garder max 20
    const nouvelleListe = [nouvelleAlerte, ...existantes].slice(0, 20);
    this.sujetAlertes.next(nouvelleListe);

    // Déclencher la notification popup
    if (niveau === 'critique' || niveau === 'alerte') {
      this.sujetNotification.next(nouvelleAlerte);
      setTimeout(() => this.sujetNotification.next(null), 6000);
    }
  }

  marquerToutesLues(): void {
    const lues = this.sujetAlertes.getValue().map(a => ({ ...a, lue: true }));
    this.sujetAlertes.next(lues);
  }

  get nombreNonLues(): number {
    return this.sujetAlertes.getValue().filter(a => !a.lue).length;
  }

  viderAlertes(): void {
    this.sujetAlertes.next([]);
  }
}