// components/AIOutfitFeedback.tsx
// AI-powered outfit analysis component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from './Icon';
import { API_BASE_URL } from '../src/config/api';

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

interface Props {
  items: OutfitItem[];
  onStyleNameSelected?: (name: string) => void;
  autoAnalyze?: boolean;
  // ⭐ NEW: Callback when analysis completes with full data
  onAnalysisComplete?: (analysis: AIAnalysis) => void;
  // ✅ NEW: Callback when user closes the feedback
  onClose?: () => void;
}

export default function AIOutfitFeedback({ items, onStyleNameSelected, autoAnalyze = false, onAnalysisComplete, onClose }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (autoAnalyze && items.length > 0) {
      analyzeOutfit();
    }
  }, [autoAnalyze]);

  const analyzeOutfit = async () => {
    if (items.length === 0) {
      setError('Add some items first!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('authToken');

      console.log('🤖 Analyzing outfit with AI...');

      const response = await fetch(`${API_BASE_URL}/api/outfits/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ items }),
      });

      // ⭐ NEW: Check response status first
      if (!response.ok) {
        console.error('❌ AI API error:', response.status, response.statusText);
        if (response.status === 404) {
          setError('AI analysis endpoint not found. Please check backend setup.');
        } else {
          setError(`AI analysis failed: ${response.status}`);
        }
        return;
      }

      // ⭐ NEW: Try to parse JSON with error handling
      let result;
      try {
        const text = await response.text();
        console.log('📄 Raw response:', text);
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        setError('Invalid response from AI service');
        return;
      }

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        setExpanded(true);
        
        // ⭐ NEW: Call callback with analysis data
        if (onAnalysisComplete) {
          onAnalysisComplete(result.analysis);
        }
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        console.log('✅ AI Analysis:', result.analysis);
      } else {
        setError('Could not analyze outfit');
      }
    } catch (err) {
      console.error('❌ AI analysis error:', err);
      setError('AI service unavailable');
    } finally {
      setLoading(false);
    }
  };

  const getStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2); // Convert 1-10 to 1-5 stars
    const hasHalfStar = rating % 2 >= 1;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Icon key={i} name="star-half" size={16} color="#FFD700" />);
      } else {
        stars.push(<Icon key={i} name="star-outline" size={16} color="#D0D0D0" />);
      }
    }
    return stars;
  };

  const getVibeEmoji = (vibe: string) => {
    const emojiMap: Record<string, string> = {
      casual: '😎',
      formal: '🎩',
      sporty: '⚽',
      chic: '💃',
      edgy: '🤘',
      elegant: '✨',
      minimalist: '⚪',
      bohemian: '🌸',
      streetwear: '🏙️',
    };
    return emojiMap[vibe.toLowerCase()] || '👔';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.loadingText}>AI is analyzing your outfit...</Text>
        </View>
      </View>
    );
  }

  if (error && !analysis) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.retryButton} onPress={analyzeOutfit}>
          <Icon name="sparkles" size={20} color="#000" />
          <Text style={styles.retryText}>Get AI Feedback</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.analyzeButton} onPress={analyzeOutfit}>
          <Icon name="sparkles" size={20} color="#FFF" />
          <Text style={styles.analyzeButtonText}>Get AI Feedback</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerTouchable}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Icon name="sparkles" size={20} color="#FFD700" />
            <Text style={styles.headerTitle}>AI Feedback</Text>
          </View>
          <Icon 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Icon name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <View style={styles.content}>
          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outfit Rating</Text>
            <View style={styles.ratingRow}>
              <View style={styles.stars}>{getStarRating(analysis.rating)}</View>
              <Text style={styles.ratingScore}>{analysis.rating}/10</Text>
            </View>
          </View>

          {/* Style Name */}
          <View style={styles.section}>
            <View style={styles.styleNameHeader}>
              <Text style={styles.sectionTitle}>Style Name</Text>
              <Text style={styles.vibe}>{getVibeEmoji(analysis.vibe)} {analysis.vibe}</Text>
            </View>
            <TouchableOpacity 
              style={styles.styleNameContainer}
              onPress={() => onStyleNameSelected?.(analysis.styleName)}
            >
              <Text style={styles.styleName}>{analysis.styleName}</Text>
              {onStyleNameSelected && (
                <Icon name="checkmark-circle-outline" size={18} color="#4CAF50" />
              )}
            </TouchableOpacity>
          </View>

          {/* Color Harmony */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color Harmony</Text>
            <View style={styles.colorHarmonyRow}>
              <View style={styles.colorScore}>
                <Text style={styles.colorScoreText}>{analysis.colorHarmony.score}/10</Text>
              </View>
              <Text style={styles.colorFeedback}>{analysis.colorHarmony.feedback}</Text>
            </View>
          </View>

          {/* General Feedback */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Tips</Text>
            <Text style={styles.feedback}>{analysis.feedback}</Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={analyzeOutfit}
          >
            <Icon name="refresh" size={16} color="#666" />
            <Text style={styles.refreshText}>Analyze Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  styleNameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vibe: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  styleNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  styleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  colorHarmonyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorScore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  colorFeedback: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  feedback: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  refreshText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 8,
    margin: 16,
  },
  analyzeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    margin: 16,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});
