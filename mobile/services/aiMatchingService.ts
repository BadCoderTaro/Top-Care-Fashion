// mobile/services/aiMatchingService.ts
// AI-powered outfit matching using Hugging Face

import { API_BASE_URL } from '../src/config/api';
import { filterItemsByOutfitType } from '../src/utils/categoryMapper';

const API_URL = API_BASE_URL.replace(/\/+$/, ''); // 移除末尾的斜杠

export interface ListingItem {
  id: string;
  title: string;
  category: string;
  price: number;
  images: string[];
  tags?: string[];
  color?: string;
  material?: string;
  style?: string;
  is_boosted?: boolean;
  boost_weight?: number;
}

export interface MatchScore {
  itemId: string;
  score: number;
  reason: string;
}

export interface SuggestedOutfit {
  tops: ListingItem[];
  bottoms: ListingItem[];
  shoes: ListingItem[];
  accessories: ListingItem[];
  // ✨ NEW: Include match scores for display
  topScores: Map<string, number>;
  bottomScores: Map<string, number>;
  shoeScores: Map<string, number>;
  accessoryScores: Map<string, number>;
}

/**
 * Get AI-powered suggestions for items that match the base item
 */
export async function getAISuggestions(
  baseItem: ListingItem,
  allItems: ListingItem[]
): Promise<SuggestedOutfit> {
  try {
    console.log('🤖 Getting AI suggestions for:', baseItem.title);

    // Separate items by category using dynamic mapping
    const tops = filterItemsByOutfitType(allItems, 'tops', baseItem.id);
    const bottoms = filterItemsByOutfitType(allItems, 'bottoms', baseItem.id);
    const shoes = filterItemsByOutfitType(allItems, 'shoes', baseItem.id);
    const accessories = filterItemsByOutfitType(allItems, 'accessories', baseItem.id);

    // Get AI scores for each category
    const [topScores, bottomScores, shoeScores, accessoryScores] = await Promise.all([
      scoreItems(baseItem, tops),
      scoreItems(baseItem, bottoms),
      scoreItems(baseItem, shoes),
      scoreItems(baseItem, accessories),
    ]);

    // Sort by score (highest first)
    const sortedTops = sortByScore(tops, topScores);
    const sortedBottoms = sortByScore(bottoms, bottomScores);
    const sortedShoes = sortByScore(shoes, shoeScores);
    const sortedAccessories = sortByScore(accessories, accessoryScores);

    console.log('✅ AI suggestions ready!');

    return {
      tops: sortedTops,
      bottoms: sortedBottoms,
      shoes: sortedShoes,
      accessories: sortedAccessories,
      // ✨ NEW: Return scores for display
      topScores,
      bottomScores,
      shoeScores,
      accessoryScores,
    };
  } catch (error) {
    console.error('❌ AI suggestion error:', error);
    
    // Fallback: return items in original order with empty scores using dynamic mapping
    return {
      tops: filterItemsByOutfitType(allItems, 'tops', baseItem.id),
      bottoms: filterItemsByOutfitType(allItems, 'bottoms', baseItem.id),
      shoes: filterItemsByOutfitType(allItems, 'shoes', baseItem.id),
      accessories: filterItemsByOutfitType(allItems, 'accessories', baseItem.id),
      topScores: new Map(),
      bottomScores: new Map(),
      shoeScores: new Map(),
      accessoryScores: new Map(),
    };
  }
}

/**
 * Score items for compatibility with base item using AI
 */
async function scoreItems(
  baseItem: ListingItem,
  items: ListingItem[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  if (items.length === 0) {
    return scores;
  }

  try {
    // Call backend AI endpoint
    const response = await fetch(`${API_URL}/api/outfits/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseItem: {
          title: baseItem.title,
          category: baseItem.category,
          tags: baseItem.tags || [],
          color: extractColor(baseItem.title),
          style: extractStyle(baseItem.title),
        },
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          category: item.category,
          tags: item.tags || [],
          color: extractColor(item.title),
          style: extractStyle(item.title),
        })),
      }),
    });

    if (!response.ok) {
      throw new Error('AI matching service unavailable');
    }

    const result = await response.json();

    if (result.success && result.scores) {
      result.scores.forEach((scoreData: MatchScore) => {
        scores.set(scoreData.itemId, scoreData.score);
      });
    }
  } catch (error) {
    console.log('⚠️ AI scoring failed, using fallback');
    // Use rule-based fallback scoring
    items.forEach(item => {
      const score = calculateFallbackScore(baseItem, item);
      scores.set(item.id, score);
    });
  }

  return scores;
}

/**
 * Fallback: Rule-based scoring when AI unavailable
 */
function calculateFallbackScore(baseItem: ListingItem, item: ListingItem): number {
  let score = 50; // Base score

  const baseColor = extractColor(baseItem.title.toLowerCase());
  const itemColor = extractColor(item.title.toLowerCase());
  const baseStyle = extractStyle(baseItem.title.toLowerCase());
  const itemStyle = extractStyle(item.title.toLowerCase());

  // Color matching (+30 points for complementary colors)
  if (isComplementaryColor(baseColor, itemColor)) {
    score += 30;
  } else if (baseColor === itemColor) {
    score += 15; // Same color is okay but not always best
  }

  // Style matching (+20 points for matching style)
  if (baseStyle === itemStyle) {
    score += 20;
  }

  // Neutral items work with everything (+10 points)
  if (isNeutral(itemColor)) {
    score += 10;
  }

  // Tag matching (+5 points per matching tag)
  const baseTags = (baseItem.tags || []).map(t => t.toLowerCase());
  const itemTags = (item.tags || []).map(t => t.toLowerCase());
  const matchingTags = baseTags.filter(tag => itemTags.includes(tag));
  score += matchingTags.length * 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Extract color from item title
 */
function extractColor(text: string): string {
  const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 
                  'purple', 'orange', 'brown', 'gray', 'grey', 'beige', 'navy'];
  
  const lower = text.toLowerCase();
  for (const color of colors) {
    if (lower.includes(color)) {
      return color;
    }
  }
  return 'unknown';
}

/**
 * Extract style from item title/tags
 */
function extractStyle(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes('casual') || lower.includes('relaxed')) return 'casual';
  if (lower.includes('formal') || lower.includes('business')) return 'formal';
  if (lower.includes('sporty') || lower.includes('athletic')) return 'sporty';
  if (lower.includes('vintage') || lower.includes('retro')) return 'vintage';
  if (lower.includes('streetwear') || lower.includes('urban')) return 'streetwear';
  
  return 'casual'; // Default
}

/**
 * Check if colors are complementary
 */
function isComplementaryColor(color1: string, color2: string): boolean {
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

  return complementary[color1]?.includes(color2) || false;
}

/**
 * Check if color is neutral
 */
function isNeutral(color: string): boolean {
  const neutrals = ['black', 'white', 'grey', 'gray', 'beige', 'brown', 'navy'];
  return neutrals.includes(color);
}

/**
 * Sort items by their AI score
 */
function sortByScore(items: ListingItem[], scores: Map<string, number>): ListingItem[] {
  return [...items].sort((a, b) => {
    const scoreA = scores.get(a.id) || 0;
    const scoreB = scores.get(b.id) || 0;
    return scoreB - scoreA; // Highest score first
  });
}

/**
 * Quick match: Get top 3 suggestions for each category (for fast loading)
 */
export async function getQuickSuggestions(
  baseItem: ListingItem,
  allItems: ListingItem[]
): Promise<SuggestedOutfit> {
  const fullSuggestions = await getAISuggestions(baseItem, allItems);
  
  return {
    tops: fullSuggestions.tops.slice(0, 10),
    bottoms: fullSuggestions.bottoms.slice(0, 10),
    shoes: fullSuggestions.shoes.slice(0, 10),
    accessories: fullSuggestions.accessories.slice(0, 10),
    topScores: fullSuggestions.topScores,
    bottomScores: fullSuggestions.bottomScores,
    shoeScores: fullSuggestions.shoeScores,
    accessoryScores: fullSuggestions.accessoryScores,
  };
}
