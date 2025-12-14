import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarIssues: Array<{
    id: string;
    title: string;
    category: string;
    distance?: number;
    similarity: number;
  }>;
}

interface CheckParams {
  title: string;
  description: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  userId: string;
}

const LOCATION_THRESHOLD_KM = 0.5; // 500 meters
const TITLE_SIMILARITY_THRESHOLD = 0.6;

// Calculate distance between two coordinates in kilometers
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate text similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  // Check for common words
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const commonWords = [...words1].filter(w => words2.has(w));
  const wordSimilarity = commonWords.length / Math.max(words1.size, words2.size);
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      if (shorter[i - 1] === longer[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const levenshteinSimilarity = 1 - matrix[shorter.length][longer.length] / longer.length;
  
  // Combine both metrics
  return Math.max(wordSimilarity, levenshteinSimilarity);
}

export function useDuplicateDetection() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DuplicateCheckResult | null>(null);

  const checkForDuplicates = useCallback(async (params: CheckParams): Promise<DuplicateCheckResult> => {
    setChecking(true);
    
    try {
      // Get recent issues (last 30 days) in the same category
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentIssues, error } = await supabase
        .from('issues')
        .select('id, title, description, category, latitude, longitude, created_at, status')
        .eq('category', params.category)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .neq('status', 'resolved')
        .limit(100);
      
      if (error) throw error;
      
      const similarIssues: DuplicateCheckResult['similarIssues'] = [];
      
      for (const issue of recentIssues || []) {
        let similarity = 0;
        let distance: number | undefined;
        
        // Check location proximity
        if (params.latitude && params.longitude && issue.latitude && issue.longitude) {
          distance = haversineDistance(
            params.latitude, params.longitude,
            issue.latitude, issue.longitude
          );
          
          if (distance <= LOCATION_THRESHOLD_KM) {
            similarity += 0.4; // Location match adds 40%
          }
        }
        
        // Check title similarity
        const titleSimilarity = calculateSimilarity(params.title, issue.title);
        similarity += titleSimilarity * 0.4; // Title similarity adds up to 40%
        
        // Check description similarity
        const descSimilarity = calculateSimilarity(params.description, issue.description);
        similarity += descSimilarity * 0.2; // Description similarity adds up to 20%
        
        if (similarity >= 0.5) { // 50% overall similarity threshold
          similarIssues.push({
            id: issue.id,
            title: issue.title,
            category: issue.category,
            distance,
            similarity: Math.min(similarity, 1),
          });
        }
      }
      
      // Sort by similarity descending
      similarIssues.sort((a, b) => b.similarity - a.similarity);
      
      const checkResult: DuplicateCheckResult = {
        isDuplicate: similarIssues.length > 0 && similarIssues[0].similarity >= 0.7,
        similarIssues: similarIssues.slice(0, 3), // Top 3 similar issues
      };
      
      setResult(checkResult);
      return checkResult;
      
    } catch (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false, similarIssues: [] };
    } finally {
      setChecking(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    checking,
    result,
    checkForDuplicates,
    clearResult,
  };
}
