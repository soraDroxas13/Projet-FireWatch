import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AlertService } from './alert.service';

export interface DonneesCapteurs {
  niveauFumee:  number;
  temperature:  number;
  humidite:     number;
  derniereMaj:  string;
  estConnecte:  boolean;
  historiqueFumee:  number[];
  historiqueTemp:   number[];
  historiqueHum:    number[];
  etiquettesTemps:  string[];
}

@Injectable({ providedIn: 'root' })
export class SensorDataService {

  private etatInitial: DonneesCapteurs = {
    niveauFumee: 0, temperature: 0, humidite: 0,
    derniereMaj: '--:--', estConnecte: false,
    historiqueFumee: Array(20).fill(0),
    historiqueTemp:  Array(20).fill(0),
    historiqueHum:   Array(20).fill(0),
    etiquettesTemps: Array(20).fill('--:--')
  };

  private sujetDonnees = new BehaviorSubject<DonneesCapteurs>(this.etatInitial);
  donnees$ = this.sujetDonnees.asObservable();

  private socketWeb: WebSocket | null = null;
  private minuterieReconnexion: any = null;

  private readonly ADRESSE_BROKER = 'ws://localhost:9001';
  private readonly SUJET_FUMEE    = 'home/mq5';
  private readonly SUJET_DHT11    = 'home/dht11';

  constructor(private serviceAlertes: AlertService) {
    this.connecter();
  }

  private connecter(): void {
    console.log('Connexion au broker MQTT via WebSocket...');
    try {
      this.socketWeb = new WebSocket(this.ADRESSE_BROKER, ['mqtt']);
      this.socketWeb.onopen    = () => this.envoyerConnectMqtt();
      this.socketWeb.onmessage = (e: MessageEvent) => this.traiterTrameMqtt(e.data);
      this.socketWeb.onerror   = () => { this.mettreAJourStatut({ estConnecte: false }); this.planifierReconnexion(); };
      this.socketWeb.onclose   = () => { this.mettreAJourStatut({ estConnecte: false }); this.planifierReconnexion(); };
    } catch (e) {
      this.planifierReconnexion();
    }
  }

  private envoyerConnectMqtt(): void {
    const identifiant = 'firewatch-' + Math.random().toString(16).substring(2, 8);
    const octetsId    = new TextEncoder().encode(identifiant);
    const taille      = 10 + 2 + octetsId.length;
    const trame = new Uint8Array(2 + taille);
    let i = 0;
    trame[i++] = 0x10; trame[i++] = taille;
    trame[i++] = 0x00; trame[i++] = 0x04;
    trame[i++] = 0x4D; trame[i++] = 0x51; trame[i++] = 0x54; trame[i++] = 0x54;
    trame[i++] = 0x04; trame[i++] = 0x02;
    trame[i++] = 0x00; trame[i++] = 0x3C;
    trame[i++] = 0x00; trame[i++] = octetsId.length;
    octetsId.forEach(b => trame[i++] = b);
    this.socketWeb!.send(trame.buffer);
  }

  private envoyerSubscribeMqtt(sujet: string): void {
    const octets = new TextEncoder().encode(sujet);
    const taille = 2 + 2 + octets.length + 1;
    const trame  = new Uint8Array(2 + taille);
    let i = 0;
    trame[i++] = 0x82; trame[i++] = taille;
    trame[i++] = 0x00; trame[i++] = 0x01;
    trame[i++] = 0x00; trame[i++] = octets.length;
    octets.forEach(b => trame[i++] = b);
    trame[i++] = 0x00;
    this.socketWeb!.send(trame.buffer);
  }

  private traiterTrameMqtt(donnee: any): void {
    const traiter = (tampon: ArrayBuffer) => {
      const octets    = new Uint8Array(tampon);
      const typeTrame = octets[0] & 0xF0;
      if (typeTrame === 0x20 && octets[3] === 0x00) {
        console.log('Connecté au broker MQTT !');
        this.mettreAJourStatut({ estConnecte: true });
        this.envoyerSubscribeMqtt(this.SUJET_FUMEE);
        this.envoyerSubscribeMqtt(this.SUJET_DHT11);
      }
      if (typeTrame === 0x30) this.analyserPublish(octets);
    };
    const lecteur = new FileReader();
    if (donnee instanceof Blob) {
      lecteur.onload = () => traiter(lecteur.result as ArrayBuffer);
      lecteur.readAsArrayBuffer(donnee);
    } else if (donnee instanceof ArrayBuffer) {
      traiter(donnee);
    }
  }

  private analyserPublish(octets: Uint8Array): void {
    try {
      let i = 1;
      let longueur = 0, decalage = 0, octet: number;
      do { octet = octets[i++]; longueur |= (octet & 0x7F) << decalage; decalage += 7; } while (octet & 0x80);
      const longueurSujet = (octets[i] << 8) | octets[i + 1]; i += 2;
      const sujet  = new TextDecoder().decode(octets.slice(i, i + longueurSujet)); i += longueurSujet;
      const contenu = new TextDecoder().decode(octets.slice(i));
      this.traiterMessage(sujet, contenu);
    } catch (e) { console.error('Erreur analyse PUBLISH :', e); }
  }

  private traiterMessage(sujet: string, contenu: string): void {
    const maintenant = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const actuel     = this.sujetDonnees.getValue();

    let nouvelles = { ...actuel, derniereMaj: maintenant };

    if (sujet === this.SUJET_FUMEE) {
      const valeur = parseFloat(contenu);
      if (!isNaN(valeur)) {
        nouvelles.niveauFumee = valeur;
        nouvelles.historiqueFumee = [...actuel.historiqueFumee.slice(1), valeur];
        nouvelles.etiquettesTemps = [...actuel.etiquettesTemps.slice(1), maintenant];

        // Déclencher alertes
        if (valeur > 300) {
          this.serviceAlertes.ajouterAlerte('critique',
            'Fumée critique détectée',
            `Niveau : ${Math.round(valeur)} ppm · Seuil dépassé (300 ppm) · Évacuation requise`
          );
        } else if (valeur > 200) {
          this.serviceAlertes.ajouterAlerte('alerte',
            'Niveau de fumée élevé',
            `Niveau : ${Math.round(valeur)} ppm · Surveillance renforcée`
          );
        }
      }
    }

    if (sujet === this.SUJET_DHT11) {
      try {
        const parsed = typeof contenu === 'string' ? JSON.parse(contenu) : contenu;
        const temp   = parseFloat(parsed.temperature) || actuel.temperature;
        const hum    = parseFloat(parsed.humidity)    || actuel.humidite;
        nouvelles.temperature  = temp;
        nouvelles.humidite     = hum;
        nouvelles.historiqueTemp = [...actuel.historiqueTemp.slice(1), temp];
        nouvelles.historiqueHum  = [...actuel.historiqueHum.slice(1), hum];

        if (temp > 55) {
          this.serviceAlertes.ajouterAlerte('critique',
            'Température critique',
            `Valeur : ${Math.round(temp)}°C · Seuil dépassé (55°C)`
          );
        } else if (temp > 40) {
          this.serviceAlertes.ajouterAlerte('alerte',
            'Température élevée',
            `Valeur : ${Math.round(temp)}°C · Surveillance recommandée`
          );
        }
      } catch (e) { console.error('Erreur parsing DHT11 :', e); }
    }

    this.sujetDonnees.next(nouvelles);
  }

  private mettreAJourStatut(partiel: Partial<DonneesCapteurs>): void {
    this.sujetDonnees.next({ ...this.sujetDonnees.getValue(), ...partiel });
  }

  private planifierReconnexion(): void {
    if (this.minuterieReconnexion) return;
    this.minuterieReconnexion = setTimeout(() => {
      this.minuterieReconnexion = null;
      this.connecter();
    }, 5000);
  }

  deconnecter(): void { this.socketWeb?.close(); }
}