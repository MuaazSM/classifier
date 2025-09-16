import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

from .models import (
    Department, Question, Session, SessionState, UserResponse, 
    ClassificationResult
)
from .utils import (
    cosine_similarity, softmax, calculate_entropy, 
    calculate_information_gain, normalize_likert_response, get_confidence_level,
    TRAIT_NAMES
)
from ..config import settings

logger = logging.getLogger(__name__)

class TaqneeqClassifier:
    """
    Main classification engine using Bayesian inference and information theory
    """
    
    def __init__(self):
        self.departments: Dict[str, Department] = {}
        self.questions: Dict[str, Question] = {}
        self.seed_questions: List[Question] = []
        self.sessions: Dict[str, Session] = {}
        
        # Load data on initialization
        self._load_data()
        
        logger.info(f"TaqneeqClassifier initialized: {len(self.departments)} departments, "
                   f"{len(self.questions)} questions, {len(self.seed_questions)} seed questions")
    
    def _load_data(self):
        """Load departments and questions from JSON files"""
        try:
            # Load departments
            with open(settings.DEPARTMENTS_FILE, 'r', encoding='utf-8') as f:
                dept_data = json.load(f)
                for dept in dept_data['departments']:
                    department = Department(**dept)
                    self.departments[department.id] = department
            
            # Load questions
            with open(settings.QUESTIONS_FILE, 'r', encoding='utf-8') as f:
                question_data = json.load(f)
                
                # Load regular questions
                for q_data in question_data['question_bank']:
                    # Fix field name mismatch if present
                    if 'targets_departments' in q_data:
                        q_data['target_departments'] = q_data.pop('targets_departments')
                    question = Question(**q_data)
                    self.questions[question.id] = question
                
                # Load seed questions
                for q_data in question_data['seed_questions']:
                    if 'targets_departments' in q_data:
                        q_data['target_departments'] = q_data.pop('targets_departments')
                    question = Question(**q_data)
                    self.seed_questions.append(question)
                    self.questions[question.id] = question  # Also add to main dict
                    
        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise RuntimeError(f"Data loading failed: {e}")
    
    def start_session(self) -> Tuple[str, Question]:
        """
        Start new classification session
        
        Returns:
            Tuple of (session_id, first_question)
        """
        session = Session()
        
        # Initialize uniform department probabilities
        num_depts = len(self.departments)
        session.department_probabilities = {
            dept_id: 1.0 / num_depts for dept_id in self.departments.keys()
        }
        
        # Initialize neutral trait scores (0.5 = neutral on 0-1 scale)
        session.trait_scores = {trait: 0.5 for trait in TRAIT_NAMES}
        
        # Set initial state
        session.state = SessionState.SEED_QUESTIONS
        
        # Store session
        self.sessions[session.session_id] = session
        
        logger.info(f"Started session {session.session_id}")
        
        # Return first seed question
        if not self.seed_questions:
            raise RuntimeError("No seed questions available")
        
        return session.session_id, self.seed_questions[0]
    
    def process_response(self, session_id: str, question_id: str, 
                        response: int, confidence: float = 1.0) -> Tuple[Optional[Question], ClassificationResult]:
        """
        Process user response and determine next question or completion
        
        Args:
            session_id: Session identifier
            question_id: Question that was answered
            response: Likert response (1-5)
            confidence: User confidence (0.0-1.0)
            
        Returns:
            Tuple of (next_question, classification_result)
            If next_question is None, classification is complete
        """
        # Validate inputs
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        question = self.questions.get(question_id)
        if not question:
            raise ValueError(f"Question not found: {question_id}")
        
        if not 1 <= response <= 5:
            raise ValueError(f"Response must be 1-5, got {response}")
        
        if not 0.0 <= confidence <= 1.0:
            raise ValueError(f"Confidence must be 0.0-1.0, got {confidence}")
        
        # Add response to session
        user_response = UserResponse(
            question_id=question_id,
            response=response,
            confidence=confidence
        )
        session.responses.append(user_response)
        session.questions_asked.append(question_id)
        session.update_activity()
        
        # Update trait scores
        self._update_trait_scores(session, question, response, confidence)
        
        # Update department probabilities
        self._update_department_probabilities(session)
        
        # Determine next step
        next_question, should_continue = self._get_next_question(session)
        
        # Create classification result
        result = self._create_classification_result(session, should_continue)
        
        # Update session state if complete
        if not should_continue:
            session.state = SessionState.COMPLETE
            session.completed_at = datetime.now()
            logger.info(f"Classification complete for session {session_id}: {result.top_department}")
        
        return next_question, result
    
    def _update_trait_scores(self, session: Session, question: Question, 
                           response: int, confidence: float):
        """Update user trait scores based on response using Bayesian inference"""
        # Convert response to 0-1 scale
        normalized_response = normalize_likert_response(response)
        
        # Calculate update strength based on confidence and learning rate
        update_strength = confidence * settings.LEARNING_RATE
        
        # Update primary trait
        current_score = session.trait_scores[question.primary_trait]
        new_score = current_score * (1 - update_strength) + normalized_response * update_strength
        session.trait_scores[question.primary_trait] = max(0.0, min(1.0, new_score))
        
        # Update secondary traits with reduced influence
        secondary_strength = update_strength * 0.5
        for trait in question.secondary_traits:
            if trait in session.trait_scores:
                current_score = session.trait_scores[trait]
                new_score = current_score * (1 - secondary_strength) + normalized_response * secondary_strength
                session.trait_scores[trait] = max(0.0, min(1.0, new_score))
    
    def _update_department_probabilities(self, session: Session):
        """Update department probabilities using cosine similarity"""
        similarities = {}
        
        for dept_id, department in self.departments.items():
            similarity = cosine_similarity(session.trait_scores, department.trait_weights)
            similarities[dept_id] = similarity
        
        # Convert similarities to probabilities using softmax
        session.department_probabilities = softmax(similarities)
    
    def _get_next_question(self, session: Session) -> Tuple[Optional[Question], bool]:
        """Determine next question or if classification should stop"""
        questions_answered = len(session.responses)
        
        # Phase 1: Seed questions (always ask all seed questions first)
        if questions_answered < len(self.seed_questions):
            session.state = SessionState.SEED_QUESTIONS
            return self.seed_questions[questions_answered], True
        
        # Check stopping criteria
        probs = session.department_probabilities
        top_prob = max(probs.values()) if probs else 0.0
        sorted_probs = sorted(probs.values(), reverse=True)
        second_prob = sorted_probs[1] if len(sorted_probs) > 1 else 0.0
        
        # NEW: Early termination check after seed questions
        if questions_answered == len(self.seed_questions):
            # Just finished seed questions, check if we have high confidence
            if top_prob >= settings.EARLY_TERMINATION_THRESHOLD:
                logger.info(f"Early termination after seed questions: {top_prob:.1%} confidence")
                return None, False
        
        # Enhanced stopping criteria
        should_stop = (
            # High confidence threshold
            top_prob >= settings.CONFIDENCE_THRESHOLD or
            # Maximum questions reached  
            questions_answered >= settings.MAX_QUESTIONS or
            # Good confidence with clear leader after minimum adaptive questions
            (questions_answered >= len(self.seed_questions) + settings.MIN_ADAPTIVE_QUESTIONS and 
             top_prob >= settings.SECONDARY_THRESHOLD and 
             top_prob - second_prob >= 0.20) or
            # Very high confidence with decent gap
            (questions_answered >= len(self.seed_questions) + 1 and
             top_prob >= 0.75 and 
             top_prob - second_prob >= 0.30)
        )
        
        if should_stop:
            logger.info(f"Classification stopping: questions={questions_answered}, "
                       f"top_prob={top_prob:.1%}, gap={top_prob - second_prob:.1%}")
            return None, False
        
        # Phase 2: Adaptive questions based on information gain
        session.state = SessionState.ADAPTIVE_QUESTIONS
        
        available_questions = [
            q for q in self.questions.values()
            if (q.id not in session.questions_asked and 
                q.question_stage == "adaptive")
        ]
        
        if not available_questions:
            # No more questions available
            logger.info("No more questions available, stopping classification")
            return None, False
        
        # Select question with highest expected information gain
        best_question = None
        max_gain = -1
        
        for question in available_questions:
            info_gain = self._calculate_information_gain(session, question)
            weighted_gain = info_gain * question.information_value
            
            if weighted_gain > max_gain:
                max_gain = weighted_gain
                best_question = question
        
        return best_question, True

    
    def _calculate_information_gain(self, session: Session, question: Question) -> float:
        """
        Calculate expected information gain from asking a question
        
        This simulates all possible responses and measures expected entropy reduction
        """
        current_entropy = calculate_entropy(session.department_probabilities)
        
        # Simulate responses 1-5 with equal probability
        expected_entropy = 0.0
        
        for response in [1, 2, 3, 4, 5]:
            # Create temporary trait scores for simulation
            temp_scores = session.trait_scores.copy()
            
            # Simulate trait update
            normalized_response = normalize_likert_response(response)
            update_strength = settings.LEARNING_RATE
            
            # Update primary trait
            current = temp_scores[question.primary_trait]
            temp_scores[question.primary_trait] = (
                current * (1 - update_strength) + normalized_response * update_strength
            )
            
            # Update secondary traits
            for trait in question.secondary_traits:
                if trait in temp_scores:
                    current = temp_scores[trait]
                    temp_scores[trait] = (
                        current * (1 - update_strength * 0.5) + normalized_response * update_strength * 0.5
                    )
            
            # Calculate resulting department probabilities
            temp_similarities = {}
            for dept_id, department in self.departments.items():
                similarity = cosine_similarity(temp_scores, department.trait_weights)
                temp_similarities[dept_id] = similarity
            
            temp_probs = softmax(temp_similarities)
            
            # Add to expected entropy (uniform weighting for responses)
            expected_entropy += calculate_entropy(temp_probs) / 5.0
        
        # Information gain = current entropy - expected entropy
        return max(0.0, current_entropy - expected_entropy)
    
    def _create_classification_result(self, session: Session, should_continue: bool) -> ClassificationResult:
        """Create comprehensive classification result"""
        probs = session.department_probabilities
        sorted_depts = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        
        top_dept, top_prob = sorted_depts[0]
        second_dept, second_prob = sorted_depts[1] if len(sorted_depts) > 1 else (None, 0.0)
        
        # Determine confidence level and reasoning
        confidence_level = get_confidence_level(top_prob)
        questions_asked = len(session.responses)
        
        if not should_continue:
            if top_prob >= settings.CONFIDENCE_THRESHOLD:
                reasoning = f"High confidence achieved ({top_prob:.1%})"
            elif questions_asked >= settings.MAX_QUESTIONS:
                reasoning = f"Maximum questions ({settings.MAX_QUESTIONS}) reached"
            else:
                reasoning = f"Clear leader identified ({top_prob:.1%} vs {second_prob:.1%})"
        else:
            if top_prob >= 0.7:
                reasoning = f"Good progress, {top_dept} leading with {top_prob:.1%}"
            elif top_prob >= 0.5:
                reasoning = f"Moderate confidence, {top_dept} at {top_prob:.1%}"
            else:
                reasoning = f"Still determining best match, top is {top_prob:.1%}"
        
        return ClassificationResult(
            session_id=session.session_id,
            top_department=top_dept,
            top_probability=round(top_prob, 3),
            secondary_department=second_dept,
            secondary_probability=round(second_prob, 3) if second_prob else None,
            all_probabilities={k: round(v, 3) for k, v in probs.items()},
            questions_asked=questions_asked,
            confidence_level=confidence_level,
            should_continue=should_continue,
            is_complete=not should_continue,
            current_top_traits=session.get_top_traits(5),
            reasoning=reasoning
        )
    
    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed session status"""
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        return {
            "session_id": session_id,
            "state": session.state.value,
            "progress": session.get_progress_summary(),
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat()
        }
    
    def cleanup_expired_sessions(self, max_age_hours: int = 24):
        """Clean up old sessions to prevent memory leaks"""
        from datetime import timedelta
        
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        expired_sessions = [
            sid for sid, session in self.sessions.items()
            if session.last_activity < cutoff
        ]
        
        for session_id in expired_sessions:
            del self.sessions[session_id]
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")