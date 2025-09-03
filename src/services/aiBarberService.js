const KIMI_API_KEY = import.meta.env.VITE_KIMI_API_KEY;
const GOOGLE_IMAGES_API_KEY = import.meta.env.VITE_GOOGLE_IMAGES_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;

const DAILY_RECOMMENDATION_LIMIT = 100;

class AIBarberService {
  constructor() {
    this.recommendationCount = this.getTodayRecommendationCount();
  }

  getTodayRecommendationCount() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`ai_barber_recommendations_${today}`);
    return stored ? parseInt(stored) : 0;
  }

  incrementRecommendationCount() {
    const today = new Date().toDateString();
    const newCount = this.recommendationCount + 1;
    this.recommendationCount = newCount;
    localStorage.setItem(`ai_barber_recommendations_${today}`, newCount.toString());
    return newCount;
  }

  getRemainingRecommendations() {
    return Math.max(0, DAILY_RECOMMENDATION_LIMIT - this.recommendationCount);
  }

  canGenerateRecommendations() {
    return this.recommendationCount < DAILY_RECOMMENDATION_LIMIT;
  }

  resetDailyCounter() {
    const today = new Date().toDateString();
    this.recommendationCount = 0;
    localStorage.removeItem(`ai_barber_recommendations_${today}`);
    console.log('Daily recommendation counter reset');
  }

  async fetchHaircutImages(haircutName) {
    if (!GOOGLE_IMAGES_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      console.warn('Google Images API not configured');
      return [];
    }

    try {
      const query = `${haircutName} men haircut hairstyle`;
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_IMAGES_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=3&safe=active&imgType=photo&imgSize=medium`
      );

      if (!response.ok) {
        throw new Error(`Google Images API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items?.map(item => ({
        url: item.link,
        thumbnail: item.image.thumbnailLink,
        title: item.title,
        source: item.displayLink
      })) || [];
    } catch (error) {
      console.error('Failed to fetch haircut images:', error);
      return [];
    }
  }

  async generatePersonalizedRecommendations(userPreferences, uploadedImage = null) {
    if (!this.canGenerateRecommendations()) {
      throw new Error('Daily AI recommendation limit reached. Please try again tomorrow.');
    }

    if (!userPreferences || !userPreferences.faceShape || !userPreferences.hairType) {
      throw new Error('Please complete all preference selections for personalized recommendations.');
    }

    const systemPrompt = `You are TPX AI Barber Assistant, an expert hair styling consultant with years of experience in men's grooming and barbering. Your specialty is providing personalized haircut recommendations based on face shape, hair type, lifestyle, and maintenance preferences.

CUSTOMER PROFILE:
- Face Shape: ${userPreferences.faceShape}
- Hair Type: ${userPreferences.hairType}  
- Lifestyle: ${userPreferences.lifestyle}
- Maintenance Preference: ${userPreferences.maintenance}
${uploadedImage ? '- Has uploaded photo for analysis' : '- No photo provided'}

HAIRCUT OPTIONS TO CHOOSE FROM:
1. Classic Fade - Timeless, professional, versatile
2. Textured Crop - Modern, low maintenance, trendy  
3. Side Part - Sophisticated, classic, business-friendly
4. Buzz Cut - Ultra low maintenance, clean, sporty
5. Pompadour - Bold, stylish, high maintenance
6. Undercut - Edgy, modern, medium maintenance
7. Caesar Cut - Classic Roman style, easy to style
8. Quiff - Voluminous, trendy, requires styling

INSTRUCTIONS:
1. Analyze the customer's preferences and recommend 3 haircuts from the list above
2. For each recommendation, provide:
   - Haircut name
   - Suitability score (85-98%)  
   - 2-sentence description explaining why it matches their preferences
   - 3 key benefits
   - Maintenance level (Low/Medium/High)
3. Order by best match first
4. Return ONLY a JSON array with this exact structure:
[
  {
    "id": 1,
    "name": "Haircut Name",
    "description": "Why this cut suits them perfectly and complements their features.",
    "suitability": 95,
    "maintenance": "Medium",
    "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"]
  }
]

Focus on face shape compatibility, hair type suitability, lifestyle alignment, and maintenance preferences.`;

    try {
      this.incrementRecommendationCount();
      
      const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIMI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'kimi-k2-0711-preview',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `Generate personalized haircut recommendations for a customer with ${userPreferences.faceShape} face shape, ${userPreferences.hairType} hair type, ${userPreferences.lifestyle} lifestyle, and ${userPreferences.maintenance} maintenance preference.`
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`Kimi API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      try {
        const recommendations = JSON.parse(content);
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          // Fetch images for each recommendation
          const enhancedRecommendations = await Promise.all(
            recommendations.map(async (rec, index) => {
              const images = await this.fetchHaircutImages(rec.name || 'Classic Cut');
              return {
                id: rec.id || index + 1,
                name: rec.name || 'Classic Cut',
                description: rec.description || 'A great cut that suits your style.',
                suitability: rec.suitability || 90,
                maintenance: rec.maintenance || 'Medium',
                benefits: rec.benefits || ['Professional look', 'Easy to style', 'Versatile'],
                images: images.slice(0, 3), // Limit to 3 images per recommendation
                primaryImage: images[0]?.url || null
              };
            })
          );
          return enhancedRecommendations;
        }
      } catch (parseError) {
        console.warn('JSON parsing failed, using fallback recommendations');
      }
      
      // Fallback recommendations based on preferences
      return await this.getFallbackRecommendations(userPreferences);
      
    } catch (error) {
      console.error('AI recommendation generation failed:', error);
      return await this.getFallbackRecommendations(userPreferences);
    }
  }

  async getFallbackRecommendations(preferences) {
    const fallbackMap = {
      'oval': {
        'straight': [
          { name: 'Classic Fade', suitability: 95, description: 'Perfect for your balanced oval face and straight hair texture.' },
          { name: 'Side Part', suitability: 92, description: 'A timeless choice that complements your face shape beautifully.' },
          { name: 'Textured Crop', suitability: 88, description: 'Modern and stylish, great for your hair type.' }
        ]
      },
      'round': {
        'wavy': [
          { name: 'Textured Crop', suitability: 94, description: 'Adds height and definition to complement your round face.' },
          { name: 'Pompadour', suitability: 91, description: 'Creates vertical lines that elongate your face shape.' },
          { name: 'Undercut', suitability: 87, description: 'Modern cut with height that balances your features.' }
        ]
      },
      'square': {
        'curly': [
          { name: 'Classic Fade', suitability: 93, description: 'Softens your strong jawline while maintaining masculine appeal.' },
          { name: 'Caesar Cut', suitability: 89, description: 'Classic style that works well with your natural texture.' },
          { name: 'Textured Crop', suitability: 86, description: 'Adds texture while balancing your angular features.' }
        ]
      }
    };

    const shapeRecommendations = fallbackMap[preferences.faceShape]?.[preferences.hairType] || 
                                 fallbackMap['oval']?.[preferences.hairType] || 
                                 fallbackMap['oval']['straight'];

    // Fetch images for each fallback recommendation
    const enhancedRecommendations = await Promise.all(
      shapeRecommendations.map(async (rec, index) => {
        const images = await this.fetchHaircutImages(rec.name);
        return {
          id: index + 1,
          name: rec.name,
          description: rec.description,
          suitability: rec.suitability,
          maintenance: preferences.maintenance === 'low' ? 'Low' : preferences.maintenance === 'high' ? 'High' : 'Medium',
          benefits: this.getDefaultBenefits(rec.name),
          images: images.slice(0, 3),
          primaryImage: images[0]?.url || null
        };
      })
    );

    return enhancedRecommendations;
  }

  getDefaultBenefits(cutName) {
    const benefitsMap = {
      'Classic Fade': ['Professional look', 'Easy to style', 'Versatile'],
      'Textured Crop': ['Low maintenance', 'Trendy', 'Natural texture'],
      'Side Part': ['Professional', 'Classic', 'Easy to maintain'],
      'Buzz Cut': ['Ultra low maintenance', 'Clean look', 'Athletic'],
      'Pompadour': ['Stylish', 'Voluminous', 'Statement look'],
      'Undercut': ['Modern', 'Edgy', 'Customizable'],
      'Caesar Cut': ['Classic style', 'Easy care', 'Timeless'],
      'Quiff': ['Trendy', 'Voluminous', 'Stylish']
    };

    return benefitsMap[cutName] || ['Great style', 'Suits you well', 'Professional'];
  }

  // Chat consultation feature removed - focusing only on haircut recommendations
  // For personalized advice, customers should book an appointment with our barbers
}

export const aiBarberService = new AIBarberService();