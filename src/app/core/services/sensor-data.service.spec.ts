import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as mqtt from 'mqtt';

export interface DonneesCapteurs {
  niveauFumee:  number;
  temperature:  number;
  humidite:     number;
  derniereMaj:  string;
  estConnecte:  boolean;
}

@Injectable({ providedIn: 'root' })
export class SensorDataService {

  // Valeurs initiales
  private etatInitial: DonneesCapteurs = {
    niveauFumee: 0,
    temperature: 0,
    humidite:    0,
    derniereMaj: '--:--',
    estConnecte: false
  };

  // Observable que les composants vont écouter
  private sujetDonnees = new BehaviorSubject<DonneesCapteurs>(this.etatInitial);
  donnees$ = this.sujetDonnees.asObservable();

  private clientMqtt: mqtt.MqttClient | null = null;

  // Configuration du broker
  private readonly ADRESSE_BROKER = 'ws://localhost:9001';
  private readonly SUJET_FUMEE   = 'home/mq2';
  private readonly SUJET_DHT11   = 'home/dht11';

  constructor() {
    this.connecter();
  }

  private connecter(): void {
    console.log('Connexion au broker MQTT...');

    this.clientMqtt = mqtt.connect(this.ADRESSE_BROKER, {
      clientId: 'firewatch-angular-' + Math.random().toString(16).substring(2, 8),
      clean: true,
      reconnectPeriod: 3000,
    });

    this.clientMqtt.on('connect', () => {
      console.log('Connecté au broker MQTT !');
      this.mettreAJourStatut({ estConnecte: true });

      // S'abonner aux topics capteurs
      this.clientMqtt!.subscribe(this.SUJET_FUMEE,  { qos: 0 });
      this.clientMqtt!.subscribe(this.SUJET_DHT11,  { qos: 0 });
    });

    this.clientMqtt.on('message', (sujet: string, message: Buffer) => {
      const contenu = message.toString();
      this.traiterMessage(sujet, contenu);
    });

    this.clientMqtt.on('error', (erreur: Error) => {
      console.error('Erreur MQTT :', erreur);
      this.mettreAJourStatut({ estConnecte: false });
    });

    this.clientMqtt.on('disconnect', () => {
      console.warn('Déconnecté du broker MQTT');
      this.mettreAJourStatut({ estConnecte: false });
    });
  }

  private traiterMessage(sujet: string, contenu: string): void {
    const maintenant = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const donneesActuelles = this.sujetDonnees.getValue();

    if (sujet === this.SUJET_FUMEE) {
      // MQ-2 envoie une valeur simple : "142"
      const valeur = parseFloat(contenu);
      if (!isNaN(valeur)) {
        this.sujetDonnees.next({
          ...donneesActuelles,
          niveauFumee: valeur,
          derniereMaj: maintenant
        });
      }
    }

    if (sujet === this.SUJET_DHT11) {
      // DHT11 envoie du JSON : {"temperature":31,"humidity":65}
      try {
        const parsed = typeof contenu === 'string' ? JSON.parse(contenu) : contenu;
        this.sujetDonnees.next({
          ...donneesActuelles,
          temperature: parseFloat(parsed.temperature) || donneesActuelles.temperature,
          humidite:    parseFloat(parsed.humidity)    || donneesActuelles.humidite,
          derniereMaj: maintenant
        });
      } catch (e) {
        console.error('Erreur parsing DHT11 :', e);
      }
    }
  }

  private mettreAJourStatut(partiel: Partial<DonneesCapteurs>): void {
    this.sujetDonnees.next({
      ...this.sujetDonnees.getValue(),
      ...partiel
    });
  }

  deconnecter(): void {
    this.clientMqtt?.end();
  }
}