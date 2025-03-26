/**
 * Middleware pour traiter les requêtes de webhook Stripe
 * Récupère le corps brut de la requête pour la vérification de signature
 */
const webhookMiddleware = (req, res, next) => {
    let data = '';
    
    // Écouter l'événement 'data' pour capturer le corps de la requête
    req.on('data', chunk => {
      data += chunk;
    });
    
    // Quand la requête est terminée, stocker le corps brut et continuer
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  };
  
  module.exports = webhookMiddleware;