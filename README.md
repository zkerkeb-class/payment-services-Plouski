# Documentation de l'API avec Swagger

Ce projet inclut une documentation interactive de l'API générée avec Swagger/OpenAPI.

## Accéder à la documentation

Une fois le serveur démarré, la documentation est accessible à l'adresse :
```
http://localhost:3000/api-docs
```

## Fonctionnalités de la documentation Swagger

- **Navigation interactive** : Parcourez facilement toutes les routes disponibles
- **Tests en direct** : Essayez les endpoints directement depuis l'interface
- **Modèles de données** : Visualisez les schémas de données attendus
- **Codes de réponse** : Comprenez les différents codes de statut HTTP
- **Paramètres requis** : Identifiez clairement les paramètres obligatoires

## Sections principales

La documentation est organisée par tags :

- **Paiements** : Gestion des paiements uniques et checkout
- **Abonnements** : Création et gestion des abonnements récurrents
- **Factures** : Création, envoi et gestion des factures
- **Clients** : Gestion des clients Stripe
- **Webhooks** : Point d'entrée pour les événements Stripe

## Authentification

La plupart des endpoints nécessitent une authentification JWT (sauf les webhooks). 
Pour tester avec Swagger UI :

1. Cliquez sur le bouton "Authorize" en haut de la page
2. Entrez votre token JWT dans le format `Bearer votre-token`
3. Cliquez sur "Authorize" pour sauvegarder

## Tester les endpoints

Pour chaque endpoint :

1. Cliquez sur l'endpoint pour l'ouvrir
2. Cliquez sur "Try it out"
3. Remplissez les paramètres requis
4. Cliquez sur "Execute"
5. Consultez la réponse en dessous

## Utilisation des modèles

Les modèles d'entrée et de sortie sont documentés sous la section "Schemas" :

- **Payment** : Structure d'un paiement
- **Subscription** : Structure d'un abonnement
- **Invoice** : Structure d'une facture
- **Customer** : Structure d'un client Stripe

## Exemples d'utilisation

### Créer un client Stripe

```json
POST /api/customers
{
  "email": "client@example.com",
  "name": "Client Test"
}
```

### Effectuer un paiement unique

```json
POST /api/payments
{
  "amount": 29.99,
  "currency": "eur",
  "description": "Achat test",
  "paymentMethodId": "pm_card_visa",
  "stripeCustomerId": "cus_XYZ123"
}
```

### Créer un abonnement

```json
POST /api/subscriptions
{
  "priceId": "price_ABC123",
  "paymentMethodId": "pm_card_visa",
  "planName": "Premium",
  "stripeCustomerId": "cus_XYZ123"
}
```

### Créer une facture

```json
POST /api/invoices
{
  "userId": "user123",
  "amount": 49.99,
  "currency": "eur",
  "items": [
    {
      "description": "Formation en ligne",
      "amount": 49.99,
      "quantity": 1
    }
  ]
}
```

## Génération de la documentation

La documentation est générée automatiquement à partir des commentaires JSDoc dans les fichiers de routes et de modèles. Pour mettre à jour la documentation, modifiez les commentaires JSDoc et redémarrez le serveur.