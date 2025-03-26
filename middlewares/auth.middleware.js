// const jwt = require('jsonwebtoken');

// /**
//  * Middleware d'authentification
//  * Vérifie le token JWT et ajoute les informations utilisateur à l'objet de requête
//  */
// const authMiddleware = (req, res, next) => {
//   // Vérifier si le header d'authentification est présent
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({
//       success: false,
//       message: 'Accès non autorisé. Token manquant ou invalide.'
//     });
//   }

//   // Extraire le token
//   const token = authHeader.split(' ')[1];

//   try {
//     // Vérifier et décoder le token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Ajouter les informations utilisateur à l'objet de requête
//     req.user = {
//       id: decoded.id,
//       email: decoded.email,
//       role: decoded.role,
//       isAdmin: decoded.role === 'admin'
//     };

//     next();
//   } catch (error) {
//     console.error('Erreur d\'authentification:', error);
//     return res.status(401).json({
//       success: false,
//       message: 'Accès non autorisé. Token invalide ou expiré.'
//     });
//   }
// };

// /**
//  * Middleware pour vérifier les droits d'administrateur
//  */
// const adminMiddleware = (req, res, next) => {
//   // Vérifier si l'utilisateur est authentifié
//   if (!req.user) {
//     return res.status(401).json({
//       success: false,
//       message: 'Authentification requise'
//     });
//   }

//   // Vérifier si l'utilisateur est un administrateur
//   if (req.user.role !== 'admin') {
//     return res.status(403).json({
//       success: false,
//       message: 'Accès refusé. Droits d\'administrateur requis.'
//     });
//   }

//   next();
// };

// module.exports = {
//   authMiddleware,
//   adminMiddleware
// };

/**
 * Middleware d'authentification fictif pour les tests
 * Ajoute un utilisateur test à la requête
 */
const authMiddleware = (req, res, next) => {
    // Ajouter un utilisateur test à l'objet de requête
    req.user = {
        id: "user123",
        email: "test@example.com",
        role: "user",
        isAdmin: false
    };

    next();
};

/**
 * Middleware pour vérifier les droits d'administrateur (version test)
 */
const adminMiddleware = (req, res, next) => {
    // Pour les tests, on considère tous les utilisateurs comme administrateurs
    req.user.isAdmin = true;

    next();
};

module.exports = {
    authMiddleware,
    adminMiddleware
};