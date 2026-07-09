/**
 *  Page Health Checker - Type Definitions
 */

/**
 * Result of checking a single content block
 */
export interface HealthCheck {
    entity: string;                    // 'projects', 'services', 'teams', 'talent'
    type: 'grid';        // Display mode
    items: number;                     // Current item count
    required: number;                  // Minimum required items
    pass: boolean;                     // Does it meet minimum?
    reason: string;                    // Human-readable explanation
  }
  
  /**
   * Complete health assessment for a category page
   */
  export interface HealthSummary {
    pass: boolean;                     // Overall pass/fail
    checks: HealthCheck[];             // Individual block results
    level?: number;                    // L1, L2, or L3
    slugPath?: string[];               // Category path
    pageKind?: string;                 // 'show-all', 'projects', etc.
  }
  
  /**
   * Input for health assessment
   */
  export interface HealthAssessmentOptions {
    blocks: Array<{
      type: 'grid';
      entity: string;
      items: any[];
      gridSize?: number;
    }>;
  }