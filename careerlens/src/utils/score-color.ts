import { MatchVerdict } from '../types';

/**
 * Maps an overall match score (0-100) to its corresponding hex color code as defined in the SPEC.
 */
export function getScoreColor(score: number): string {
  if (score >= 0 && score <= 40) {
    return '#F43F5E'; // Red
  } else if (score >= 41 && score <= 65) {
    return '#F59E0B'; // Amber
  } else if (score >= 66 && score <= 80) {
    return '#3B82F6'; // Blue
  } else if (score >= 81 && score <= 100) {
    return '#10B981'; // Green
  }
  return '#8B949E'; // Default text-muted color fallback
}

/**
 * Maps an overall match score (0-100) to its MatchVerdict category.
 */
export function getScoreVerdict(score: number): MatchVerdict {
  if (score >= 0 && score <= 40) {
    return 'Weak Match';
  } else if (score >= 41 && score <= 65) {
    return 'Partial Match';
  } else if (score >= 66 && score <= 80) {
    return 'Good Match';
  }
  return 'Strong Match';
}
