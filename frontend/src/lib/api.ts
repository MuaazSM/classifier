// frontend/src/lib/api.ts - Updated with environment variables
export interface Question {
    id: string;
    text: string;
    type: string;
    options: string[];
    category: string;
    primary_trait: string;
    secondary_traits: string[];
    information_value: number;
    target_departments: string[];
    question_stage: string;
  }
  
  export interface ClassificationResult {
    session_id: string;
    top_department: string;
    top_probability: number;
    secondary_department?: string;
    secondary_probability?: number;
    all_probabilities: Record<string, number>;
    questions_asked: number;
    confidence_level: string;
    should_continue: boolean;
    is_complete: boolean;
    current_top_traits: [string, number][];
    reasoning: string;
  }
  
  export interface StartSessionResponse {
    session_id: string;
    first_question: Question;
    total_departments: number;
    estimated_questions: string;
    message: string;
    features: {
      adaptive_questioning: boolean;
      rag_explanations: boolean;
      trait_based_matching: boolean;
    };
  }
  
  export interface AnswerQuestionResponse {
    next_question?: Question;
    classification_result: ClassificationResult;
    message: string;
  }
  
  export interface Department {
    id: string;
    name: string;
    description: string;
    core_responsibilities: string[];
    skills_required: string[];
    soft_skills_required: string[];
    skills_perks_gained: string[];
    example_tasks: string[];
    target_audience: string[];
    top_traits?: Array<{
      trait: string;
      weight: number;
      importance: string;
    }>;
  }
  
  export interface ExplanationResponse {
    session_id: string;
    department_id: string;
    department_name: string;
    explanation: {
      overview: string;
      why_good_fit: string;
      responsibilities: string;
      skills_gained: string;
      next_steps: string;
    };
    classification_confidence: number;
    user_top_traits: [string, number][];
    alternative_departments: Array<{
      id: string;
      name: string;
      probability: number;
      description: string;
    }>;
    generated_at: string;
    generation_method: string;
  }
  
  class APIError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'APIError';
    }
  }
  
  class TaqneeqAPI {
    private baseURL: string;
  
    constructor() {
      // Use environment variable with fallback
      this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('TaqneeqAPI initialized with baseURL:', this.baseURL);
      }
    }
  
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = `${this.baseURL}${endpoint}`;
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };
  
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('API Request:', { url, method: config.method || 'GET', body: config.body });
      }
  
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch {
            // Use default error message if JSON parsing fails
          }
          throw new APIError(response.status, errorMessage);
        }
  
        const data = await response.json();
        
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('API Response:', data);
        }
        
        return data;
      } catch (error) {
        if (error instanceof APIError) {
          throw error;
        }
        
        // Network or other errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Network Error:', errorMessage);
        throw new APIError(0, `Network error: ${errorMessage}`);
      }
    }
  
    // Classification endpoints
    async startClassification(): Promise<StartSessionResponse> {
      return this.request<StartSessionResponse>('/classification/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    }
  
    async submitAnswer(
      sessionId: string,
      questionId: string,
      response: number,
      confidence: number = 1.0
    ): Promise<AnswerQuestionResponse> {
      return this.request<AnswerQuestionResponse>('/classification/answer', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
          response,
          confidence,
        }),
      });
    }
  
    async getExplanation(
      sessionId: string,
      departmentId?: string,
      includeComparison: boolean = true
    ): Promise<ExplanationResponse> {
      return this.request<ExplanationResponse>('/classification/explanation', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          department_id: departmentId,
          include_comparison: includeComparison,
        }),
      });
    }
  
    async getSessionStatus(sessionId: string): Promise<any> {
      return this.request(`/classification/status/${sessionId}`);
    }
  
    // Department endpoints
    async getDepartments(includeTraits: boolean = false, search?: string): Promise<{
      departments: Department[];
      total: number;
      search_applied: boolean;
      traits_included: boolean;
    }> {
      const params = new URLSearchParams();
      if (includeTraits) params.append('include_traits', 'true');
      if (search) params.append('search', search);
      
      const query = params.toString();
      const endpoint = `/departments${query ? `?${query}` : ''}`;
      
      return this.request(endpoint);
    }
  
    async getDepartment(departmentId: string, includeTraits: boolean = true): Promise<Department> {
      const params = new URLSearchParams();
      if (includeTraits) params.append('include_traits', 'true');
      
      const query = params.toString();
      const endpoint = `/departments/${departmentId}${query ? `?${query}` : ''}`;
      
      return this.request(endpoint);
    }
  
    async getSimilarDepartments(departmentId: string, limit: number = 3): Promise<{
      target_department: { id: string; name: string };
      similar_departments: Array<{
        id: string;
        name: string;
        description: string;
        similarity_score: number;
        core_responsibilities: string[];
        relationship: string;
      }>;
      total_found: number;
    }> {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      return this.request(`/departments/${departmentId}/similar?${params.toString()}`);
    }
  
    // Health and monitoring
    async getHealth(): Promise<any> {
      return this.request('/health');
    }
  
    async getStats(): Promise<any> {
      return this.request('/stats');
    }
  
    // Admin endpoints
    async cleanupSessions(maxAgeHours: number = 24): Promise<any> {
      return this.request('/admin/cleanup', {
        method: 'POST',
        body: JSON.stringify({ max_age_hours: maxAgeHours }),
      });
    }
  }
  
  // Create a singleton instance
  export const api = new TaqneeqAPI();
  
  // Export types for use in components
  export type { APIError };
  export { TaqneeqAPI };