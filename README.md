# Index Compteur Radio

Application PWA pour téléphone afin d'enregistrer chaque jour l'index des compteurs électriques des radios privées au centre émetteur de Figuig.

## Radios intégrées

- Aswat
- Med Radio
- Medina FM
- Medi1
- Cap Radio
- Chada FM
- HIT RADIO
- MFM

## Champs

- Date automatique du jour, non modifiable
- Radio, sélection depuis la liste
- Index

## Règle de contrôle

Si le nouvel index est inférieur au dernier index enregistré pour la même radio, l'application affiche :

**Index erroné**

et la lecture n'est pas enregistrée.

## Export Excel

Le bouton **Exporter fiche Excel** génère un fichier `.xls` compatible Excel avec le même modèle que la fiche fournie :

- Feuille par mois : OCT, NOV, DEC, etc.
- Titre : Relevé du compteur d'électricité de Radio
- Sous-titre : Au centre émetteur de Figuig
- Colonnes : Date + radios privées
- Ligne finale : Puissance
- Couleurs et bordures style fiche Excel

## Installation GitHub Pages

1. Créer un repository GitHub.
2. Uploader tous les fichiers de ce dossier.
3. Aller dans Settings > Pages.
4. Choisir Branch: main et Folder: /root.
5. Ouvrir le lien GitHub Pages.
6. Sur iPhone: Safari > Partager > Sur l'écran d'accueil.

## Backup

Utiliser **Backup JSON** régulièrement pour garder une copie des lectures.
