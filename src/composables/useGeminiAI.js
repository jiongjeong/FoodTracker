import { GoogleGenAI } from '@google/genai'
import { ref } from 'vue'

const isLoading = ref(false)
const error = ref(null)

// Initialize Gemini AI - The client gets the API key from the environment variable
const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
})

export function useGeminiAI() {
  // Shared function to handle AI requests and common error/loading patterns
  const makeAIRequest = async (prompt, errorMessage = 'Failed to get AI response. Please try again.') => {
    isLoading.value = true
    error.value = null

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      })
      
      return response.text
    } catch (err) {
      error.value = errorMessage
      console.error('Gemini AI Error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const generateResponse = async (userMessage, context = {}) => {
    const systemPrompt = `You are FoodBot, an AI assistant for the FoodSaver app that helps users reduce food waste and manage their food inventory efficiently.

Context about the user:
- Current food inventory: ${context.inventoryCount || 0} items
- Items expiring soon: ${context.expiringSoon || 0}
- Current food score: ${context.userScore || 0} points
- Total money saved: $${context.totalSaved || 0}

Guidelines for responses:
1. Keep responses concise and helpful (3-4 sentences max)
2. Focus on food waste reduction, meal planning, and inventory management
3. Be encouraging and positive about their food-saving efforts
4. Provide actionable advice when possible
5. If asked about non-food topics, politely redirect to food-related matters

User message: ${userMessage}`

    return makeAIRequest(systemPrompt)
  }

  const generateFoodSuggestions = async (expiringItems) => {
    const prompt = `Given these food items that are expiring soon: ${expiringItems.join(', ')}, suggest 2-3 simple recipes or ways to use them. Keep each suggestion brief (one sentence) and focus on reducing waste.`
    
    return makeAIRequest(prompt, 'Failed to generate suggestions. Please try again.')
  }

  return {
    generateResponse,
    generateFoodSuggestions,
    isLoading,
    error
  }
}