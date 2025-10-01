// ============================================================================
// 📦 Phase 3 - Step 10.3: Response Parser
// Parses and validates GPT-4 AI validation JSON responses
// ============================================================================

class ResponseParser {
  /**
   * Parse raw GPT-4 response into structured JSON
   */
  parse(rawResponse) {
    try {
      // Attempt JSON parse
      const parsed = JSON.parse(rawResponse);

      // Validate structure
      this.validateResponse(parsed);

      // Normalize values
      return this.normalize(parsed);

    } catch (error) {
      console.error("❌ Failed to parse AI response:", error.message);
      throw new Error(`Invalid AI response format: ${error.message}`);
    }
  }

  /**
   * Ensure required fields and valid ranges
   */
  validateResponse(parsed) {
    const required = ["validation", "aiConfidence", "reasoning", "quality"];

    for (const field of required) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate validation field
    if (!["APPROVE", "REJECT", "CAUTION"].includes(parsed.validation)) {
      throw new Error(`Invalid validation value: ${parsed.validation}`);
    }

    // Validate aiConfidence range
    if (parsed.aiConfidence < 0 || parsed.aiConfidence > 1) {
      throw new Error(`Invalid aiConfidence value: ${parsed.aiConfidence}`);
    }

    // Validate quality range
    if (parsed.quality < 0 || parsed.quality > 100) {
      throw new Error(`Invalid quality value: ${parsed.quality}`);
    }
  }

  /**
   * Normalize parsed response into standard format
   */
  normalize(parsed) {
    return {
      validation: parsed.validation,
      aiConfidence: Number(parsed.aiConfidence.toFixed(2)),
      reasoning: parsed.reasoning,
      risks: parsed.risks || [],
      opportunities: parsed.opportunities || [],
      quality: Number(parsed.quality),
      recommendations: parsed.recommendations || ""
    };
  }

  /**
   * Utility: Extract key points from reasoning text
   */
  extractKeyPoints(reasoning) {
    if (!reasoning || typeof reasoning !== "string") return [];
    const points = reasoning
      .split(/\n|\./)
      .map(s => s.trim())
      .filter(s => s.length > 10);
    return points.slice(0, 5);
  }
}

module.exports = ResponseParser;
