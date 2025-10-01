// ai-validation/ai-validator.js

const OpenAI = require('openai');
const PromptBuilder = require('./prompt-builder');
const ResponseParser = require('./response-parser');

class AIValidator {
  constructor(config = {}) {
    this.openai = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });

    this.model = config.model || process.env.OPENAI_MODEL || "gpt-4";
    this.temperature = config.temperature || parseFloat(process.env.AI_TEMPERATURE) || 0.3;
    this.maxTokens = config.maxTokens || parseInt(process.env.AI_MAX_TOKENS) || 1000;

    this.promptBuilder = new PromptBuilder();
    this.responseParser = new ResponseParser();
  }

  async validate(ensemblePrediction, mtfaData, marketContext = null) {
    console.log("🤖 Sending prediction to GPT-4 for validation...");

    try {
      // Build structured prompt
      const prompt = this.promptBuilder.buildValidationPrompt({
        ensemble: ensemblePrediction,
        mtfa: mtfaData,
        context: marketContext
      });

      // Call GPT-4
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: "json_object" }
      });

      const rawResponse = completion.choices[0].message.content;

      // Parse and validate response
      const parsedResponse = this.responseParser.parse(rawResponse);

      console.log("✅ AI validation complete");
      return parsedResponse;

    } catch (error) {
      console.error("❌ AI validation failed:", error.message);

      // Fallback response if API fails
      return this.getFallbackResponse(ensemblePrediction);
    }
  }

  getSystemPrompt() {
    return `You are a professional forex trading analyst specializing in EUR/USD.
Your role is to validate machine learning trading signals by:
1. Analyzing technical confluence across multiple timeframes
2. Identifying potential risks and market conditions
3. Providing clear, actionable reasoning
4. Rating signal quality objectively

You must respond ONLY in valid JSON format with this exact structure:
{
  "validation": "APPROVE|REJECT|CAUTION",
  "aiConfidence": 0.85,
  "reasoning": "detailed explanation",
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"],
  "quality": 85,
  "recommendations": "specific advice"
}

Be conservative - only APPROVE high-quality setups with clear confluence.`;
  }

  getFallbackResponse(ensemble) {
    return {
      validation: "CAUTION",
      aiConfidence: 0.5,
      reasoning: "AI validation unavailable, using ensemble confidence only",
      risks: ["API failure - manual review recommended"],
      opportunities: [],
      quality: Math.round(ensemble.confidence * 100),
      recommendations: "Verify setup manually before trading"
    };
  }
}

module.exports = AIValidator;
