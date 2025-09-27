const axios = require('axios');

class AlphaVantageAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.alphavantage.co/query';
  }

  // ✅ Real-time exchange rate
  async getRealTimeRate(fromCurrency, toCurrency) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: fromCurrency,
          to_currency: toCurrency,
          apikey: this.apiKey
        }
      });
      return response.data['Realtime Currency Exchange Rate'];
    } catch (error) {
      console.error('❌ Error fetching real-time rate:', error.message);
      return null;
    }
  }

  // ✅ Intraday OHLC data
  async getIntradayData(fromSymbol, toSymbol, interval = '1min', outputSize = 'compact') {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_INTRADAY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          interval: interval,
          outputsize: outputSize,
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching intraday data:', error.message);
      return null;
    }
  }

  // ✅ Daily OHLC data
  async getDailyData(fromSymbol, toSymbol, outputSize = 'compact') {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_DAILY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          outputsize: outputSize,
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching daily data:', error.message);
      return null;
    }
  }

  // ✅ Weekly OHLC data
  async getWeeklyData(fromSymbol, toSymbol) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_WEEKLY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching weekly data:', error.message);
      return null;
    }
  }

  // ✅ Monthly OHLC data (optional future use)
  async getMonthlyData(fromSymbol, toSymbol) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_MONTHLY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching monthly data:', error.message);
      return null;
    }
  }

  // ✅ RSI technical indicator
  async getRSI(symbol, interval = '1min', timePeriod = 14) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'RSI',
          symbol: symbol,
          interval: interval,
          time_period: timePeriod,
          series_type: 'close',
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching RSI:', error.message);
      return null;
    }
  }
}

// ✅ Direct class export
module.exports = AlphaVantageAPI;
