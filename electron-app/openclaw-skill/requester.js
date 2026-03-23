const axios = require('axios');

class ProofClawRequester {
  constructor(config) {
    this.apiEndpoint = config.apiEndpoint || 'http://localhost:3000/api';
    this.apiKey = config.apiKey;
  }

  async postTask(taskType, input, options = {}) {
    const payload = {
      taskType,
      input,
      reward: options.reward || 5,
      minProviders: options.minProviders || 2,
      stakeRequired: options.stakeRequired || 10,
      deadline: options.deadline || Date.now() + 30 * 60 * 1000
    };

    try {
      const response = await axios.post(`${this.apiEndpoint}/task`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        taskId: response.data.taskId,
        hcsTopic: response.data.hcsTopic,
        status: 'posted'
      };
    } catch (error) {
      if (error.response?.status === 402) {
        return {
          status: 'payment_required',
          amount: error.response.data.paymentAmount,
          currency: error.response.data.currency || 'HBAR'
        };
      }
      throw error;
    }
  }

  async getTaskStatus(taskId) {
    const response = await axios.get(`${this.apiEndpoint}/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async waitForResult(taskId, timeoutMs = 60000) {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.state === 'SETTLED') {
        return {
          success: true,
          result: status.consensusResult,
          agreementRatio: status.agreementRatio,
          providers: status.providers
        };
      }
      
      if (status.state === 'DISPUTED') {
        return {
          success: false,
          disputed: true,
          message: 'Task is under dispute'
        };
      }
      
      await new Promise(r => setTimeout(r, 3000));
    }
    
    return {
      success: false,
      timeout: true,
      message: 'Timeout waiting for consensus'
    };
  }
}

module.exports = { ProofClawRequester };
