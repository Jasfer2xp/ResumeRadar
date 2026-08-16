export {
  DEFAULT_MATCH_WEIGHTS,
  SEARCH_PROGRESS_STEPS,
  type CandidateProfile,
  type JobProfile,
  type SearchResult,
  type JobMatchAnalysis,
  type ScoreBreakdown,
  type MatchWeights,
  type SearchRunStatus,
  type SearchProgressStep,
  type JobWithMatch,
} from './types.js';

export {
  calculateDeterministicScore,
  combineScores,
  generateSearchQueries,
  deduplicateSearchResults,
  isIndividualJobUrl,
  filterIndividualJobResults,
  prioritizeJobResults,
} from './scoring.js';

