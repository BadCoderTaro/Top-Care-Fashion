// web/src/app/api/outfits/analyze/route.ts
// FREE AI-powered outfit analysis using Hugging Face

import { NextRequest, NextResponse } from 'next/server';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_free';
const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1';

interface OutfitItem {
  type: 'top' | 'bottom' | 'shoes' | 'accessory';
  title: string;
  category?: string;
  color?: string;
  material?: string;
  tags?: string[];
}

interface AIAnalysis {
  rating: number;
  styleName: string;
  colorHarmony: {
    score: number;
    feedback: string;
  };
  feedback: string;
  vibe: string;
}

/**
 * Call Hugging Face API (100% FREE)
 */
async function callHuggingFaceAI(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      console.error(`HF API error: ${response.status}`);
      return null;
    }

    const result = await response.json();
    return result[0]?.generated_text || '';
  } catch (error) {
    console.error('❌ Hugging Face API error:', error);
    return null;
  }
}

/**
 * Fallback: Rule-based AI analysis (always works, no API needed)
 */
function getFallbackAnalysis(items: OutfitItem[]): AIAnalysis {
  const itemTypes = items.map(i => i.type);
  const hasTop = itemTypes.includes('top');
  const hasBottom = itemTypes.includes('bottom');
  const hasShoes = itemTypes.includes('shoes');
  const accessoryCount = items.filter(i => i.type === 'accessory').length;

  // Calculate rating based on completeness
  let rating = 5;
  if (hasTop && hasBottom && hasShoes) rating += 2;
  if (accessoryCount > 0) rating += 1;
  if (accessoryCount > 2) rating += 1;
  rating = Math.min(10, rating);

  // Detect colors
  const colors = items
    .map(i => i.color || i.title.toLowerCase())
    .join(' ');
  
  const hasBlack = colors.includes('black');
  const hasWhite = colors.includes('white');
  const hasNeutral = hasBlack || hasWhite || colors.includes('gray') || colors.includes('beige');

  // Color harmony score
  const colorScore = hasNeutral ? 8 : 7;
  const colorFeedback = hasNeutral 
    ? 'Great use of neutral colors! They create a versatile, timeless look.'
    : 'Nice color choices! Consider adding a neutral piece for balance.';

  // Detect vibe
  const casual = colors.includes('jean') || colors.includes('casual');
  const formal = colors.includes('blazer') || colors.includes('dress');
  const sporty = colors.includes('sneaker') || colors.includes('nike');
  
  let vibe = 'casual';
  if (formal) vibe = 'formal';
  else if (sporty) vibe = 'sporty';
  else if (hasBlack && !casual) vibe = 'edgy';

  // Generate style name
  const styleNames = [
    'Urban Explorer',
    'Street Style Maven',
    'Casual Chic',
    'Modern Minimalist',
    'Weekend Warrior',
    'City Slicker',
    'Effortless Cool',
    'Classic Comfort',
    'Fashion Forward',
    'Timeless Elegance',
  ];
  const styleName = styleNames[Math.floor(Math.random() * styleNames.length)];

  // Generate feedback
  let feedback = 'Great outfit! ';
  if (hasTop && hasBottom && hasShoes) {
    feedback += 'All the key pieces are there. ';
  }
  if (accessoryCount > 0) {
    feedback += 'Nice touch with the accessories! ';
  } else {
    feedback += 'Consider adding an accessory to complete the look. ';
  }
  if (hasNeutral) {
    feedback += 'The neutral tones make it easy to mix and match.';
  }

  return {
    rating,
    styleName,
    colorHarmony: { score: colorScore, feedback: colorFeedback },
    feedback,
    vibe,
  };
}

/**
 * POST /api/outfits/analyze
 * Analyzes outfit using FREE AI
 */
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    console.log('🤖 Analyzing outfit with FREE AI...');

    // Try Hugging Face first
    const itemDescriptions = items.map((item: OutfitItem) => 
      `${item.type}: ${item.title} (${item.category || 'N/A'})`
    ).join('\n');

    const prompt = `You are a fashion stylist. Analyze this outfit and provide feedback in JSON format.

Outfit:
${itemDescriptions}

Respond with ONLY valid JSON (no markdown):
{
  "rating": <number 1-10>,
  "styleName": "<2-4 word creative name>",
  "colorHarmony": {
    "score": <1-10>,
    "feedback": "<brief color analysis>"
  },
  "feedback": "<2 sentences of style advice>",
  "vibe": "<casual/formal/sporty/chic/edgy>"
}`;

  const aiResponse = await callHuggingFaceAI(prompt);
    let analysis: AIAnalysis | null = null;

    if (aiResponse) {
      try {
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
          console.log('✅ Got AI analysis from Hugging Face');
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse AI response, using fallback', parseError);
        analysis = null;
      }
    }

    // Use fallback if AI failed
    if (!analysis) {
      console.log('🔄 Using rule-based fallback analysis');
      analysis = getFallbackAnalysis(items);
    }

    // Validate and sanitize
    const finalAnalysis: AIAnalysis = {
      rating: Math.max(1, Math.min(10, analysis.rating || 7)),
      styleName: (analysis.styleName || 'Styled Look').substring(0, 50),
      colorHarmony: {
        score: Math.max(1, Math.min(10, analysis.colorHarmony?.score || 7)),
        feedback: (analysis.colorHarmony?.feedback || 'Colors work well').substring(0, 200),
      },
      feedback: (analysis.feedback || 'Great outfit!').substring(0, 300),
      vibe: analysis.vibe || 'casual',
    };

    console.log('✅ Final analysis:', finalAnalysis);

    return NextResponse.json({
      success: true,
      analysis: finalAnalysis,
      source: aiResponse ? 'ai' : 'fallback',
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    
    // Always return fallback instead of error
    const fallback = getFallbackAnalysis([]);
    return NextResponse.json({
      success: true,
      analysis: fallback,
      source: 'fallback',
    });
  }
}