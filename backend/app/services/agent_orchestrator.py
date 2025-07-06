import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import uuid

from .redis_service import RedisService
from .gemini_service import GeminiService
from .vector_service import VectorService

class AgentOrchestrator:
    def __init__(self, redis_service: RedisService, gemini_service: GeminiService, vector_service: VectorService):
        self.redis = redis_service
        self.gemini = gemini_service
        self.vector = vector_service
        
        # Define our AI agents
        self.agents = {
            "privacy_agent": PrivacyAgent(self.redis, self.gemini),
            "quality_agent": QualityAgent(self.redis, self.gemini),
            "domain_expert": DomainExpertAgent(self.redis, self.gemini, self.vector),
            "bias_detector": BiasDetectionAgent(self.redis, self.gemini),
            "relationship_agent": RelationshipAgent(self.redis, self.gemini),
        }
        
    async def orchestrate_generation(
        self, 
        job_id: str, 
        source_data: List[Dict[str, Any]], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Orchestrate multi-agent synthetic data generation"""
        
        try:
            # Start job tracking
            await self.redis.start_generation_job(job_id, {
                "config": config,
                "total_steps": 6
            })
            
            # Phase 1: Schema Analysis (20%)
            await self._update_progress(job_id, 10, "Starting schema analysis...")
            schema_analysis = await self.agents["domain_expert"].analyze_schema(source_data, config)
            
            await self._update_progress(job_id, 20, "Schema analysis complete")
            
            # Phase 2: Privacy Assessment (40%)
            await self._update_progress(job_id, 30, "Assessing privacy requirements...")
            privacy_assessment = await self.agents["privacy_agent"].assess_privacy(source_data, config)
            
            await self._update_progress(job_id, 40, "Privacy assessment complete")
            
            # Phase 3: Bias Detection (60%)
            await self._update_progress(job_id, 50, "Detecting potential bias...")
            bias_analysis = await self.agents["bias_detector"].detect_bias(source_data, config)
            
            await self._update_progress(job_id, 60, "Bias analysis complete")
            
            # Phase 4: Relationship Mapping (70%)
            await self._update_progress(job_id, 65, "Mapping data relationships...")
            relationships = await self.agents["relationship_agent"].map_relationships(source_data, config)
            
            await self._update_progress(job_id, 70, "Relationship mapping complete")
            
            # Phase 5: Synthetic Data Generation (90%)
            await self._update_progress(job_id, 75, "Generating synthetic data...")
            
            # Combine all agent insights
            generation_context = {
                "schema": schema_analysis,
                "privacy_requirements": privacy_assessment,
                "bias_mitigation": bias_analysis,
                "relationships": relationships,
                "config": config
            }
            
            synthetic_data = await self._generate_synthetic_data(generation_context)
            
            await self._update_progress(job_id, 90, "Validating generated data...")
            
            # Phase 6: Quality Assessment (100%)
            quality_score = await self.agents["quality_agent"].assess_quality(
                synthetic_data, source_data, config
            )
            
            await self._update_progress(job_id, 95, "Final quality checks...")
            
            # Compile final result
            result = {
                "synthetic_data": synthetic_data,
                "metadata": {
                    "quality_score": quality_score["overall_score"],
                    "privacy_score": privacy_assessment["privacy_score"],
                    "bias_score": bias_analysis["bias_score"],
                    "relationship_preservation": relationships["preservation_score"],
                    "rows_generated": len(synthetic_data),
                    "generation_time": datetime.utcnow().isoformat(),
                    "agent_insights": {
                        "schema_analysis": schema_analysis,
                        "privacy_assessment": privacy_assessment,
                        "bias_analysis": bias_analysis,
                        "quality_assessment": quality_score
                    }
                }
            }
            
            # Complete the job
            await self.redis.complete_generation_job(job_id, result)
            await self._update_progress(job_id, 100, "Generation complete!")
            
            return result
            
        except Exception as e:
            await self.redis.update_job_progress(job_id, -1, "failed")
            raise e
            
    async def _update_progress(self, job_id: str, progress: int, message: str):
        """Update job progress and broadcast to WebSocket clients"""
        await self.redis.update_job_progress(job_id, progress, "running")
        await self.redis.publish_update("job_updates", {
            "job_id": job_id,
            "progress": progress,
            "message": message
        })
        
    async def _generate_synthetic_data(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate synthetic data using Gemini with agent context"""
        prompt = f"""
        Generate synthetic data based on this comprehensive agent analysis:
        
        Schema Analysis: {json.dumps(context['schema'], indent=2)}
        Privacy Requirements: {json.dumps(context['privacy_requirements'], indent=2)}
        Bias Mitigation: {json.dumps(context['bias_mitigation'], indent=2)}
        Relationships: {json.dumps(context['relationships'], indent=2)}
        
        Configuration: {json.dumps(context['config'], indent=2)}
        
        Generate {context['config'].get('row_count', 1000)} rows of synthetic data that:
        1. Maintains the statistical properties identified in the schema analysis
        2. Ensures privacy protection as specified in the privacy requirements
        3. Mitigates bias as identified in the bias analysis
        4. Preserves relationships as mapped by the relationship agent
        5. Follows domain-specific patterns and constraints
        
        Return the data as a JSON array of objects.
        """
        
        return await self.gemini.generate_synthetic_data_advanced(prompt)

# Individual Agent Classes
class BaseAgent:
    def __init__(self, redis_service: RedisService, gemini_service: GeminiService):
        self.redis = redis_service
        self.gemini = gemini_service
        self.agent_id = f"{self.__class__.__name__}_{uuid.uuid4().hex[:8]}"
        
    async def _update_status(self, status: str, performance: float, details: Dict[str, Any] = None):
        """Update agent status in Redis"""
        await self.redis.set_agent_status(self.agent_id, {
            "status": status,
            "performance": performance,
            "details": details or {},
            "agent_type": self.__class__.__name__
        })

class PrivacyAgent(BaseAgent):
    async def assess_privacy(self, data: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
        await self._update_status("analyzing", 85.0, {"task": "privacy_assessment"})
        
        # Use Gemini to analyze privacy risks
        assessment = await self.gemini.assess_privacy_risks(data, config)
        
        await self._update_status("completed", 98.0, {"task": "privacy_assessment"})
        return assessment

class QualityAgent(BaseAgent):
    async def assess_quality(self, synthetic_data: List[Dict[str, Any]], original_data: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
        await self._update_status("analyzing", 85.0, {"task": "quality_assessment"})
        
        # Comprehensive quality analysis
        quality_metrics = await self.gemini.assess_data_quality(synthetic_data, original_data, config)
        
        await self._update_status("completed", 95.0, {"task": "quality_assessment"})
        return quality_metrics

class DomainExpertAgent(BaseAgent):
    def __init__(self, redis_service: RedisService, gemini_service: GeminiService, vector_service: VectorService):
        super().__init__(redis_service, gemini_service)
        self.vector = vector_service
        
    async def analyze_schema(self, data: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
        await self._update_status("analyzing", 85.0, {"task": "schema_analysis"})
        
        # Get cross-domain insights
        domain = config.get("domain", "general")
        cross_domain_insights = await self.vector.get_cross_domain_insights(domain, data[0] if data else {})
        
        # Analyze with Gemini
        analysis = await self.gemini.analyze_schema_advanced(data, config, cross_domain_insights)
        
        await self._update_status("completed", 97.0, {"task": "schema_analysis"})
        return analysis

class BiasDetectionAgent(BaseAgent):
    async def detect_bias(self, data: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
        await self._update_status("analyzing", 85.0, {"task": "bias_detection"})
        
        # Advanced bias detection with Gemini
        bias_analysis = await self.gemini.detect_bias_comprehensive(data, config)
        
        await self._update_status("completed", 92.0, {"task": "bias_detection"})
        return bias_analysis

class RelationshipAgent(BaseAgent):
    async def map_relationships(self, data: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
        await self._update_status("analyzing", 85.0, {"task": "relationship_mapping"})
        
        # Analyze data relationships
        relationships = await self.gemini.map_data_relationships(data, config)
        
        await self._update_status("completed", 96.0, {"task": "relationship_mapping"})
        return relationships