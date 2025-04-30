// Import des modules nécessaires
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const swagger = require('./config/swagger');

// Chargement des variables d'environnement
dotenv.config();

// Connexion à la base de données
connectDB();

// Initialisation de l'application Express
const app = express();

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration CORS
app.use(cors());

// Import des routes
const paymentRoutes = require('./routes/payment.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const webhookRoutes = require('./routes/webhook.routes');
const customerRoutes = require('./routes/customer.routes');

// Utilisation des routes
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/customers', customerRoutes);

// Documentation Swagger
app.use('/api-docs', swagger.serve, swagger.setup);

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Une erreur est survenue',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Configuration du port
const PORT = process.env.PORT || 3000;

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Service de paiement démarré sur le port ${PORT}`);
});

module.exports = app;