// web/src/app/api/outfits/match/route.ts
// AI-powered outfit matching endpoint using Hugging Face

import { NextRequest, NextResponse } from 'next/server';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_free';
const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1';

interface OutfitItem {
  id: string;
  title: string;
  category: string;
  tags?: string[];
  color?: string;
  style?: string;
}

interface MatchScore {
  itemId: string;
  score: number;
  reason: string;
}

/**
 * Call Hugging Face AI for outfit matching
 */
async function getAIMatchScores(
  baseItem: OutfitItem,
  items: OutfitItem[]
): Promise<MatchScore[]> {
  try {
    const prompt = `You are a fashion stylist AI. Score how well each item matches with the base item on a scale of 0-100.

Base Item: ${baseItem.title} (${baseItem.category})
- Color: ${baseItem.color || 'unknown'}
- Style: ${baseItem.style || 'unknown'}

Items to score:
${items.map((item, i) => `${i + 1}. ${item.title} (${item.category}) - Color: ${item.color}, Style: ${item.style}`).join('\n')}

Respond with ONLY a JSON array of scores (no markdown, no explanations):
[
  {"itemId": "item_id_1", "score": 85, "reason": "colors complement"},
  {"itemId": "item_id_2", "score": 70, "reason": "style matches"}
]`;

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.5,
          top_p: 0.9,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      console.error(`HF API error: ${response.status}`);
      return [];
    }

    const result = await response.json();
    const text = result[0]?.generated_text || '';

    // Try to extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]);
      return scores;
    }

    return [];
  } catch (error) {
    console.error('❌ AI matching error:', error);
    return [];
  }
}

/**
 * Fallback: Rule-based scoring
 */
function getFallbackScores(baseItem: OutfitItem, items: OutfitItem[]): MatchScore[] {
  return items.map(item => {
  let score = 50;
  const reasons: string[] = [];

    // Color matching
    if (baseItem.color && item.color) {
      if (isComplementary(baseItem.color, item.color)) {
        score += 30;
        reasons.push('complementary colors');
      } else if (baseItem.color === item.color) {
        score += 15;
        reasons.push('matching color');
      }
    }

    // Style matching
    if (baseItem.style === item.style) {
      score += 20;
      reasons.push('matching style');
    }

    // Neutral bonus
    if (isNeutral(item.color || '')) {
      score += 10;
      reasons.push('neutral tone');
    }

    // Tag matching
    const baseTags = (baseItem.tags || []).map(t => t.toLowerCase());
    const itemTags = (item.tags || []).map(t => t.toLowerCase());
    const matchingTags = baseTags.filter(tag => itemTags.includes(tag));
    if (matchingTags.length > 0) {
      score += matchingTags.length * 5;
      reasons.push(`${matchingTags.length} matching tags`);
    }

    return {
      itemId: item.id,
      score: Math.min(100, Math.max(0, score)),
      reason: reasons.join(', ') || 'general compatibility',
    };
  });
}

function isComplementary(color1: string, color2: string): boolean {
  const complementary: Record<string, string[]> = {
    'black': ['white', 'grey', 'gray', 'beige', 'blue', 'red'],
    'white': ['black', 'blue', 'navy', 'red', 'green'],
    'blue': ['white', 'beige', 'brown', 'orange'],
    'red': ['black', 'white', 'navy', 'beige'],
    'green': ['white', 'brown', 'beige'],
    'navy': ['white', 'beige', 'brown', 'red'],
    'brown': ['beige', 'white', 'blue', 'green'],
    'beige': ['black', 'brown', 'blue', 'navy'],
  };
  return complementary[color1?.toLowerCase()]?.includes(color2?.toLowerCase()) || false;
}

function isNeutral(color: string): boolean {
  const neutrals = ['black', 'white', 'grey', 'gray', 'beige', 'brown', 'navy'];
  return neutrals.includes(color?.toLowerCase());
}

/**
 * POST /api/outfits/match
 * Get AI-powered match scores for outfit items
 */
export async function POST(request: NextRequest) {
  try {
    const { baseItem, items } = await request.json();

    if (!baseItem || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'baseItem and items array are required' },
        { status: 400 }
      );
    }

    console.log('🤖 Matching items with AI...');

    // Try AI first (with timeout)
    let scores: MatchScore[] = [];
    
    try {
      const aiScoresPromise = getAIMatchScores(baseItem, items);
      const timeoutPromise = new Promise<MatchScore[]>((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 5000)
      );
      
      scores = await Promise.race([aiScoresPromise, timeoutPromise]);
      
      if (scores.length === 0) {
        throw new Error('AI returned no scores');
      }

      console.log('✅ Got AI match scores');
    } catch (aiError) {
      console.log('⚠️ AI matching unavailable, using fallback', aiError);
      scores = getFallbackScores(baseItem, items);
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      scores,
      source: scores.length > 0 && scores[0].reason !== 'general compatibility' ? 'ai' : 'fallback',
    });

  } catch (error) {
    console.error('❌ Match endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to match items' },
      { status: 500 }
    );
  }
}
