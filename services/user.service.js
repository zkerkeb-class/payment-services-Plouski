const axios = require('axios');

/**
 * Service pour communiquer avec le service utilisateur
 */
class UserService {
  constructor() {
    this.apiUrl = process.env.USER_SERVICE_URL;
  }

  /**
   * Met à jour le statut d'abonnement d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} subscriptionData - Données de l'abonnement
   * @returns {Promise<Object>} - Utilisateur mis à jour
   */
  async updateUserSubscription(userId, subscriptionData) {
    try {
      const response = await axios.patch(`${this.apiUrl}/${userId}/subscription`, subscriptionData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Récupère les informations d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} - Données de l'utilisateur
   */
  async getUserById(userId) {
    try {
      const response = await axios.get(`${this.apiUrl}/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur:', error);
      throw error;
    }
  }

  /**
   * Met à jour la date de fin d'abonnement
   * @param {string} userId - ID de l'utilisateur
   * @param {Date} endDate - Date de fin d'abonnement
   * @returns {Promise<Object>} - Utilisateur mis à jour
   */
  async updateSubscriptionEndDate(userId, endDate) {
    try {
      const response = await axios.patch(`${this.apiUrl}/${userId}/subscription-end`, {
        subscriptionEndDate: endDate
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la date de fin d\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Met à jour le type d'abonnement
   * @param {string} userId - ID de l'utilisateur
   * @param {string} subscriptionType - Type d'abonnement
   * @returns {Promise<Object>} - Utilisateur mis à jour
   */
  async updateSubscriptionType(userId, subscriptionType) {
    try {
      const response = await axios.patch(`${this.apiUrl}/${userId}/subscription-type`, {
        subscriptionType
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du type d\'abonnement:', error);
      throw error;
    }
  }
}

module.exports = new UserService();