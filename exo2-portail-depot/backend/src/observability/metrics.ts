import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus'

/**
 * Metriques du portail.
 *
 * Regle appliquee pour decider ce qui merite d'exister ici : une metrique n'a sa
 * place que si une question operationnelle en depend, et une ALERTE que si elle
 * signifie « quelqu'un est bloque maintenant » ou « quelque chose d'irreversible
 * vient de se produire ». Le reste appartient a un dashboard, pas a une regle.
 *
 * Ce qui est volontairement ABSENT, et pourquoi :
 *  - CPU et memoire par conteneur : le serveur est partage, on ne controle pas le
 *    bruit des voisins. Une alerte pointerait la faute de quelqu'un d'autre.
 *  - percentile 99 de latence : a ce trafic, le p99 est une requete unique. Du
 *    bruit deguise en signal.
 *  - nombre de requetes : metrique de vanite, aucune decision n'en decoule.
 *
 * Attention a la cardinalite : aucun label ne porte de valeur non bornee
 * (identifiant de demande, token public, adresse IP). Un label libre fait
 * exploser la memoire de Prometheus bien avant de rendre le moindre service.
 */

export const METRIC = {
  uploadTotal: 'portail_upload_total',
  uploadBytes: 'portail_upload_bytes',
  uploadDuration: 'portail_upload_duration_seconds',
  pinAttemptTotal: 'portail_pin_attempt_total',
  linkLockedTotal: 'portail_link_locked_total',
  loginTotal: 'portail_login_total',
  httpDuration: 'portail_http_request_duration_seconds',
  inconsistentFiles: 'portail_inconsistent_files',
  tlsCertExpiryDays: 'portail_tls_cert_expiry_days',
  activeRequests: 'portail_deposit_requests',
} as const

export const metricsProviders = [
  /**
   * LE compteur central : le depot d'une piece est l'action pour laquelle ce
   * produit existe.
   *
   * `outcome` separe deliberement ce qui vient du client de ce qui vient de nous :
   *   success         la piece est stockee
   *   rejected_type   le client a envoye un .docx — comportement NORMAL
   *   rejected_size   fichier trop lourd — comportement NORMAL
   *   storage_error   le stockage objet a refuse — NOTRE panne
   *
   * Sans cette distinction, un tableau de bord affiche « 30 % d'echec » alors que
   * tout va bien, et l'alerte devient du bruit qu'on finit par ignorer. Seul
   * `storage_error` declenche une alerte.
   */
  makeCounterProvider({
    name: METRIC.uploadTotal,
    help: "Depots de pieces, par issue. Seul storage_error traduit une panne de notre cote.",
    labelNames: ['outcome'],
  }),

  makeCounterProvider({
    name: METRIC.uploadBytes,
    help: 'Volume total reçu, en octets. Sert a projeter le remplissage du bucket.',
  }),

  makeHistogramProvider({
    name: METRIC.uploadDuration,
    help: "Duree d'un depot, de la reception a la confirmation du stockage.",
    // Bornes calees sur des fichiers de 0 a 20 Mo depuis une connexion de client :
    // au-dela de 30 s, le navigateur a probablement deja abandonne.
    buckets: [0.5, 1, 2.5, 5, 10, 30, 60],
  }),

  /**
   * Un PIN a 4 chiffres, c'est 10 000 combinaisons. Le rythme des echecs est le
   * signal d'une attaque par force brute — le verrouillage la freine, il ne
   * previent personne.
   */
  makeCounterProvider({
    name: METRIC.pinAttemptTotal,
    help: 'Tentatives de code PIN, par issue (succeeded, failed, locked).',
    labelNames: ['outcome'],
  }),

  makeCounterProvider({
    name: METRIC.linkLockedTotal,
    help: 'Liens verrouilles apres trop de codes errones.',
  }),

  makeCounterProvider({
    name: METRIC.loginTotal,
    help: 'Connexions avocat, par issue. Une hausse des echecs signale du bourrage d identifiants.',
    labelNames: ['outcome'],
  }),

  /**
   * Latence HTTP par route. Le label `route` porte le motif (`/public/:token/files`)
   * et jamais l'URL concrete : sinon chaque token creerait une serie temporelle.
   */
  makeHistogramProvider({
    name: METRIC.httpDuration,
    help: 'Duree des requetes HTTP, par methode, motif de route et statut.',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 10],
  }),

  /**
   * LA metrique la plus importante, et la moins evidente.
   *
   * Une piece est enregistree en base avec `objectKey = 'pending'`, puis envoyee
   * au stockage, puis la cle est mise a jour. Si le process meurt entre les deux,
   * il reste une piece listee cote avocat SANS CONTENU derriere.
   *
   * Pour un cabinet, « le portail dit que vous l'avez envoye, nous ne l'avons
   * pas » est le pire echec possible : il porte sur des pieces couvertes par le
   * secret professionnel, et il est totalement silencieux. Cette jauge le rend
   * visible. Toute valeur non nulle et persistante est une anomalie.
   */
  makeGaugeProvider({
    name: METRIC.inconsistentFiles,
    help: "Pieces enregistrees en base sans objet correspondant dans le stockage.",
  }),

  /**
   * Le renouvellement du certificat est le genre de chose qui casse
   * silencieusement : tout fonctionne pendant 60 jours, puis plus rien. Le piege
   * classique est une redirection 301 qui avale le challenge ACME — on s'en
   * premunit dans la configuration nginx, cette jauge verifie que la premunition
   * tient dans le temps.
   */
  makeGaugeProvider({
    name: METRIC.tlsCertExpiryDays,
    help: 'Jours restants avant expiration du certificat TLS.',
  }),

  /**
   * Contexte metier pour lire le reste : dix echecs de depot n'ont pas le meme
   * sens selon qu'il y a trois ou trois cents demandes en cours.
   */
  makeGaugeProvider({
    name: METRIC.activeRequests,
    help: 'Demandes de depot par statut calcule.',
    labelNames: ['status'],
  }),
]
