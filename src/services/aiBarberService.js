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

    if (!userPreferences || !userPreferences.hairType) {
      throw new Error('Please complete all preference selections for personalized recommendations.');
    }

    // Log user preferences for debugging
    console.log('🔍 User Preferences:', {
      faceShape: userPreferences.faceShape || 'To be determined by AI',
      hairType: userPreferences.hairType,
      lifestyle: userPreferences.lifestyle,
      maintenance: userPreferences.maintenance,
      hasUploadedImage: !!uploadedImage
    });

    const systemPrompt = `You are TPX AI Barber Assistant, an expert hair styling consultant with years of experience in men's grooming and barbering. Your specialty is providing personalized haircut recommendations based on comprehensive head and hair analysis.

CUSTOMER PROFILE:
- Face Shape: ${userPreferences.faceShape || 'To be determined from image analysis'}
- Hair Type: ${userPreferences.hairType}  
- Lifestyle: ${userPreferences.lifestyle}
- Maintenance Preference: ${userPreferences.maintenance}
${uploadedImage ? '- Has uploaded photo for detailed analysis' : '- No photo provided'}

${uploadedImage ? 'PHOTO ANALYSIS REQUIRED:' : 'ANALYSIS BASED ON:'}
${uploadedImage ? `CRITICAL: Provide HONEST and ACCURATE analysis. Do not exaggerate or provide overly positive descriptions. Be objective and truthful.

Analyze the uploaded photo and provide detailed, factual insights about:
1. HEAD SHAPE ANALYSIS (Be precise and honest):
   - Actual head proportions (measure length vs width ratio accurately)
   - True forehead size (small/medium/large) and shape (narrow/wide/rounded/angular)
   - Jawline definition (weak/moderate/strong) and actual width
   - Cheekbone prominence (flat/moderate/high) and positioning
   - Chin shape (pointed/rounded/square/weak/strong) and projection
   - Ear positioning (close/protruding) and relative size
   - DETERMINE ACTUAL FACE SHAPE: oval/round/square/rectangular/heart/diamond based on measurements

2. HAIR DETAILS ANALYSIS (Current state only):
   - Exact current hair length and existing style
   - Actual hair density (thin/medium/thick) and thickness of individual strands
   - True hair texture (pin-straight/wavy/curly/coarse/fine)
   - Hairline shape (straight/widow's peak/receding/irregular) and any recession
   - Crown area characteristics (flat/cowlick/thinning)
   - Natural growth patterns and directions
   - Hair color and current condition (healthy/damaged/dry)

3. FACIAL FEATURES (Objective assessment):
   - Eye shape (almond/round/hooded/deep-set) and spacing
   - Nose size (small/medium/large) and shape (straight/curved/wide/narrow)
   - Lip thickness (thin/medium/full) and shape
   - Overall facial symmetry (note any asymmetries)
   - Skin condition and complexion

BE HONEST about what you observe. Do not flatter or exaggerate positive features.` : 'User-provided preferences and standard face shape analysis'}

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
1. ${uploadedImage ? 'FIRST: Analyze the photo with complete honesty and accuracy. Determine the ACTUAL face shape based on measurements, not assumptions.' : 'Analyze based on provided preferences'}
2. Recommend 3 haircuts from the list above based on your HONEST analysis
3. For each recommendation, provide:
   - Haircut name
   - Realistic suitability score (70-95% - be honest, not all cuts are perfect)
   - 2-sentence description explaining why it matches their ACTUAL features
   - 3 key benefits
   - Maintenance level (Low/Medium/High)
4. Order by best match first
5. Return response in this exact JSON structure:
{
  "analysis": {
    "headShape": "HONEST assessment: Actual face shape (oval/round/square/rectangular/heart/diamond) with specific measurements and proportions. Example: 'Square face shape with strong jawline, wide forehead, and minimal tapering from temples to jaw. Length-to-width ratio approximately 1.2:1.'",
    "hairDetails": "FACTUAL description: Current hair length, density, texture, hairline, and condition without embellishment. Example: 'Medium-length hair, moderate density, slightly wavy texture, straight hairline with no recession, healthy condition.'",
    "facialFeatures": "OBJECTIVE assessment: Key facial features that influence haircut choice, noting any asymmetries or unique characteristics. Example: 'Prominent cheekbones, medium-sized nose, well-defined jawline, symmetrical features overall.'",
    "recommendations_reasoning": "LOGICAL explanation: Why these specific cuts were chosen based on actual face shape and features, not generic praise."
  },
  "recommendations": [
    {
      "id": 1,
      "name": "Haircut Name",
      "description": "HONEST explanation of why this cut works with their ACTUAL features, including any potential challenges.",
      "suitability": 85,
      "maintenance": "Medium",
      "benefits": ["Specific Benefit 1", "Realistic Benefit 2", "Practical Benefit 3"]
    }
  ]
}

CRITICAL: Be truthful about face shape determination. Use actual measurements and proportions, not flattering assumptions.`;

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
              content: `Generate personalized haircut recommendations for a customer with ${userPreferences.faceShape ? userPreferences.faceShape + ' face shape, ' : ''}${userPreferences.hairType} hair type, ${userPreferences.lifestyle} lifestyle, and ${userPreferences.maintenance} maintenance preference.${!userPreferences.faceShape && uploadedImage ? ' Please analyze the uploaded photo to determine the face shape and provide detailed head analysis.' : ''}`
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
      
      console.log('🤖 Kimi AI Raw Response:', content);
      
      try {
        const aiResponse = JSON.parse(content);
        
        // Log detailed analysis for debugging
        if (aiResponse.analysis) {
          console.log('🧠 AI Head Shape Analysis:', aiResponse.analysis.headShape);
          console.log('💇 AI Hair Details Analysis:', aiResponse.analysis.hairDetails);
          console.log('👤 AI Facial Features Analysis:', aiResponse.analysis.facialFeatures);
          console.log('💡 AI Recommendations Reasoning:', aiResponse.analysis.recommendations_reasoning);
        }
        
        // Handle both new structure and legacy array format
        const recommendations = aiResponse.recommendations || aiResponse;
        
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          console.log('✅ AI Recommendations Generated:', recommendations.length, 'suggestions');
          recommendations.forEach((rec, index) => {
            console.log(`📋 Recommendation ${index + 1}:`, {
              name: rec.name,
              suitability: rec.suitability + '%',
              maintenance: rec.maintenance,
              benefits: rec.benefits
            });
          });
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
        } else {
          console.warn('⚠️ AI returned invalid recommendations format, using fallback');
        }
      } catch (parseError) {
        console.warn('❌ JSON parsing failed:', parseError.message);
        console.log('📄 Raw content that failed to parse:', content.substring(0, 200) + '...');
      }
      
      // Fallback recommendations based on preferences
      console.log('🔄 Using fallback recommendations for:', userPreferences);
      return await this.getFallbackRecommendations(userPreferences);
      
    } catch (error) {
      console.error('💥 AI recommendation generation failed:', error.message);
      console.log('🔄 Falling back to default recommendations');
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

    // Use provided face shape or default to oval if not specified
    const faceShape = preferences.faceShape || 'oval';
    console.log('🔄 Fallback recommendations using face shape:', faceShape);
    
    const shapeRecommendations = fallbackMap[faceShape]?.[preferences.hairType] || 
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