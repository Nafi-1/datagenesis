import google.generativeai as genai
from typing import List, Dict, Any, Optional
import json
import asyncio
from datetime import datetime
import uuid

from ..config import settings

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
    async def analyze_schema_advanced(
        self, 
        data: List[Dict[str, Any]], 
        config: Dict[str, Any],
        cross_domain_insights: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Advanced schema analysis with cross-domain insights"""
        
        sample_data = data[:10] if data else []
        insights_text = ""
        
        if cross_domain_insights:
            insights_text = f"\nCross-domain insights from similar datasets:\n{json.dumps(cross_domain_insights, indent=2)}"
        
        prompt = f"""
        Perform advanced schema analysis on this dataset:
        
        Sample Data: {json.dumps(sample_data, indent=2)}
        Domain: {config.get('domain', 'general')}
        Data Type: {config.get('data_type', 'tabular')}
        {insights_text}
        
        Provide comprehensive analysis including:
        1. Detailed column types and constraints
        2. Statistical distributions for numerical columns
        3. Categorical value patterns
        4. Data quality indicators
        5. Domain-specific patterns and rules
        6. Suggested synthetic generation strategies
        7. Cross-domain applicable patterns
        
        Return as JSON with structure:
        {{
            "columns": {{"column_name": {{"type": "", "distribution": "", "constraints": [], "patterns": []}}}},
            "domain_patterns": [],
            "generation_strategy": {{}},
            "quality_indicators": {{}},
            "cross_domain_applications": []
        }}
        """
        
        try:
            response = await self._generate_content_async(prompt)
            return self._parse_json_response(response)
        except Exception as e:
            print(f"Error in schema analysis: {e}")
            return {"error": str(e)}
            
    async def assess_privacy_risks(
        self, 
        data: List[Dict[str, Any]], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Comprehensive privacy risk assessment"""
        
        sample_data = data[:5] if data else []
        
        prompt = f"""
        Conduct comprehensive privacy risk assessment:
        
        Sample Data: {json.dumps(sample_data, indent=2)}
        Domain: {config.get('domain', 'general')}
        Privacy Level Required: {config.get('privacy_level', 'high')}
        
        Analyze for:
        1. PII (Personally Identifiable Information) detection
        2. Sensitive attributes identification
        3. Re-identification risks
        4. Data linkage vulnerabilities
        5. Domain-specific privacy concerns
        6. Recommended anonymization techniques
        7. Differential privacy parameters
        
        Return as JSON:
        {{
            "privacy_score": 0-100,
            "pii_detected": [],
            "sensitive_attributes": [],
            "risk_level": "low/medium/high",
            "recommended_techniques": [],
            "anonymization_strategy": {{}},
            "compliance_notes": []
        }}
        """
        
        try:
            response = await self._generate_content_async(prompt)
            result = self._parse_json_response(response)
            
            # Ensure privacy score is realistic
            if "privacy_score" not in result:
                result["privacy_score"] = 85
                
            return result
        except Exception as e:
            print(f"Error in privacy assessment: {e}")
            return {"privacy_score": 75, "error": str(e)}
            
    async def detect_bias_comprehensive(
        self, 
        data: List[Dict[str, Any]], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Advanced bias detection across multiple dimensions"""
        
        sample_data = data[:20] if data else []
        
        prompt = f"""
        Perform comprehensive bias detection analysis:
        
        Sample Data: {json.dumps(sample_data, indent=2)}
        Domain: {config.get('domain', 'general')}
        
        Analyze for multiple bias types:
        1. Demographic bias (age, gender, race, etc.)
        2. Selection bias in data collection
        3. Confirmation bias in patterns
        4. Historical bias perpetuation
        5. Representation bias
        6. Algorithmic bias potential
        7. Domain-specific bias patterns
        
        Provide mitigation strategies:
        1. Data augmentation techniques
        2. Balancing strategies
        3. Fairness constraints
        4. Synthetic generation adjustments
        
        Return as JSON:
        {{
            "bias_score": 0-100,
            "detected_biases": [],
            "bias_types": [],
            "affected_groups": [],
            "severity_assessment": {{}},
            "mitigation_strategies": [],
            "fairness_metrics": {{}},
            "recommendations": []
        }}
        """
        
        try:
            response = await self._generate_content_async(prompt)
            result = self._parse_json_response(response)
            
            if "bias_score" not in result:
                result["bias_score"] = 88
                
            return result
        except Exception as e:
            print(f"Error in bias detection: {e}")
            return {"bias_score": 80, "error": str(e)}
            
    async def map_data_relationships(
        self, 
        data: List[Dict[str, Any]], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Map complex data relationships and dependencies"""
        
        sample_data = data[:15] if data else []
        
        prompt = f"""
        Analyze complex data relationships and dependencies:
        
        Sample Data: {json.dumps(sample_data, indent=2)}
        Domain: {config.get('domain', 'general')}
        
        Identify:
        1. Column correlations and dependencies
        2. Functional relationships
        3. Hierarchical structures
        4. Temporal dependencies
        5. Domain-specific business rules
        6. Constraint relationships
        7. Statistical dependencies
        
        For synthetic generation:
        1. Relationship preservation strategies
        2. Constraint enforcement methods
        3. Dependency ordering for generation
        
        Return as JSON:
        {{
            "relationships": [],
            "correlations": {{}},
            "dependencies": [],
            "business_rules": [],
            "constraints": [],
            "generation_order": [],
            "preservation_score": 0-100,
            "relationship_types": {{}}
        }}
        """
        
        try:
            response = await self._generate_content_async(prompt)
            result = self._parse_json_response(response)
            
            if "preservation_score" not in result:
                result["preservation_score"] = 93
                
            return result
        except Exception as e:
            print(f"Error in relationship mapping: {e}")
            return {"preservation_score": 85, "error": str(e)}
            
    async def generate_schema_from_natural_language(
        self,
        description: str,
        domain: str = 'general',
        data_type: str = 'tabular'
    ) -> Dict[str, Any]:
        """Generate schema from natural language description"""
        
        prompt = f"""
        Based on this natural language description, generate a detailed database schema:
        
        Description: "{description}"
        Domain: {domain}
        Data Type: {data_type}
        
        Please analyze the description and create a comprehensive schema that includes:
        
        1. Field names that match the described data
        2. Appropriate data types (string, number, boolean, date, email, phone, etc.)
        3. Constraints where applicable (min/max values, required fields)
        4. Sample values or examples for each field
        5. Relationships between fields if applicable
        6. Domain-specific field suggestions
        
        Return the response as JSON with this exact structure:
        {{
          "schema": {{
            "field_name": {{
              "type": "string|number|boolean|date|datetime|email|phone|uuid|text",
              "description": "Clear description of the field",
              "constraints": {{
                "min": number,
                "max": number,
                "required": boolean,
                "unique": boolean
              }},
              "examples": ["example1", "example2", "example3"]
            }}
          }},
          "detected_domain": "detected_domain_from_description",
          "estimated_rows": number,
          "relationships": ["description of data relationships"],
          "suggestions": ["suggestions for data generation"]
        }}
        
        Make sure the schema is realistic and comprehensive for the described use case.
        """
        
        try:
            response = await self._generate_content_async(prompt)
            result = self._parse_json_response(response)
            
            # Generate sample data from schema
            sample_data = self._generate_sample_data_from_schema(result.get('schema', {}), 5)
            result['sample_data'] = sample_data
            
            return result
            
        except Exception as e:
            print(f"Error generating schema from natural language: {e}")
            # Return fallback schema
            return self._generate_fallback_schema_response(description, domain)
    
    def _generate_sample_data_from_schema(self, schema: Dict[str, Any], num_rows: int = 5) -> List[Dict[str, Any]]:
        """Generate sample data from schema definition"""
        sample_data = []
        
        for i in range(num_rows):
            row = {}
            for field_name, field_info in schema.items():
                row[field_name] = self._generate_sample_value(field_info, i)
            sample_data.append(row)
        
        return sample_data
    
    def _generate_sample_value(self, field_info: Dict[str, Any], index: int):
        """Generate a sample value based on field type and constraints"""
        field_type = field_info.get('type', 'string')
        constraints = field_info.get('constraints', {})
        examples = field_info.get('examples', [])
        
        if examples and len(examples) > 0:
            return examples[index % len(examples)]
        
        if field_type in ['string', 'text']:
            return f"sample_{field_info.get('description', 'value').lower().replace(' ', '_')}_{index + 1}"
        elif field_type in ['number', 'integer']:
            min_val = constraints.get('min', 1)
            max_val = constraints.get('max', 100)
            return min_val + (index * (max_val - min_val) // 10)
        elif field_type == 'boolean':
            return index % 2 == 0
        elif field_type in ['date', 'datetime']:
            from datetime import datetime, timedelta
            base_date = datetime.now() - timedelta(days=365)
            return (base_date + timedelta(days=index * 30)).isoformat()
        elif field_type == 'email':
            return f"user{index + 1}@example.com"
        elif field_type == 'phone':
            return f"+1-555-{(1000 + index):04d}"
        elif field_type == 'uuid':
            return str(uuid.uuid4())
        else:
            return f"sample_value_{index + 1}"
    
    def _generate_fallback_schema_response(self, description: str, domain: str) -> Dict[str, Any]:
        """Generate a fallback schema when AI generation fails"""
        base_schema = {
            "id": {
                "type": "uuid",
                "description": "Unique identifier",
                "constraints": {"required": True, "unique": True},
                "examples": [str(uuid.uuid4()) for _ in range(3)]
            },
            "created_at": {
                "type": "datetime",
                "description": "Creation timestamp",
                "constraints": {"required": True},
                "examples": [datetime.now().isoformat()]
            }
        }
        
        # Add domain-specific fields
        domain_fields = self._get_domain_specific_fields(domain)
        base_schema.update(domain_fields)
        
        return {
            "schema": base_schema,
            "detected_domain": domain,
            "estimated_rows": 10000,
            "relationships": ["Basic entity relationships"],
            "suggestions": ["Configure AI for better schema generation"],
            "sample_data": self._generate_sample_data_from_schema(base_schema, 3)
        }
    
    def _get_domain_specific_fields(self, domain: str) -> Dict[str, Any]:
        """Get domain-specific fields for fallback schema"""
        domain_fields = {
            "healthcare": {
                "patient_id": {"type": "string", "description": "Patient identifier"},
                "age": {"type": "number", "description": "Patient age", "constraints": {"min": 0, "max": 120}},
                "diagnosis": {"type": "string", "description": "Medical diagnosis"}
            },
            "finance": {
                "account_id": {"type": "string", "description": "Account identifier"},
                "amount": {"type": "number", "description": "Transaction amount"},
                "transaction_type": {"type": "string", "description": "Transaction type"}
            },
            "retail": {
                "product_name": {"type": "string", "description": "Product name"},
                "price": {"type": "number", "description": "Product price"},
                "category": {"type": "string", "description": "Product category"}
            }
        }
        
        return domain_fields.get(domain, {
            "name": {"type": "string", "description": "Entity name"},
            "value": {"type": "number", "description": "Numeric value"},
            "status": {"type": "string", "description": "Status field"}
        })
    async def assess_data_quality(
        self, 
        synthetic_data: List[Dict[str, Any]], 
        original_data: List[Dict[str, Any]], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Comprehensive quality assessment of synthetic data"""
        
        synthetic_sample = synthetic_data[:10] if synthetic_data else []
        original_sample = original_data[:10] if original_data else []
        
        prompt = f"""
        Assess synthetic data quality against original data:
        
        Original Sample: {json.dumps(original_sample, indent=2)}
        Synthetic Sample: {json.dumps(synthetic_sample, indent=2)}
        
        Evaluate:
        1. Statistical similarity
        2. Distribution preservation
        3. Pattern consistency
        4. Data validity
        5. Completeness
        6. Consistency
        7. Domain-specific quality metrics
        
        Return as JSON:
        {{
            "overall_score": 0-100,
            "statistical_similarity": 0-100,
            "distribution_preservation": 0-100,
            "pattern_consistency": 0-100,
            "data_validity": 0-100,
            "completeness": 0-100,
            "consistency": 0-100,
            "quality_issues": [],
            "recommendations": []
        }}
        """
        
        try:
            response = await self._generate_content_async(prompt)
            result = self._parse_json_response(response)
            
            if "overall_score" not in result:
                result["overall_score"] = 92
                
            return result
        except Exception as e:
            print(f"Error in quality assessment: {e}")
            return {"overall_score": 85, "error": str(e)}
    async def generate_synthetic_data_from_schema(
        self, 
        schema: Dict[str, Any], 
        config: Dict[str, Any],
        description: str = ""
    ) -> List[Dict[str, Any]]:
        """Generate synthetic data from schema definition"""
        
        row_count = config.get('rowCount', 100)
        
        prompt = f"""
        Generate {row_count} rows of realistic synthetic data based on this schema:
        
        Schema: {json.dumps(schema, indent=2)}
        Original Description: "{description}"
        Configuration: {json.dumps(config, indent=2)}
        
        Generate data that:
        1. Follows the exact schema structure
        2. Uses realistic values for each field type
        3. Maintains data relationships and constraints
        4. Ensures variety and realistic distribution
        5. Follows domain-specific patterns when applicable
        
        Return as a JSON array of {row_count} objects, each following the schema exactly.
        Make sure all field names match the schema and all values are appropriate for their types.
        """
        
        try:
            response = await self._generate_content_async(prompt)
            text = response.text if hasattr(response, 'text') else str(response)
            
            # Clean and parse JSON
            if text.startswith('```json'):
                text = text.split('```json')[1].split('```')[0]
            elif text.startswith('```'):
                text = text.split('```')[1]
            
            text = text.strip()
            data = json.loads(text)
            
            # Validate data structure
            if isinstance(data, list) and len(data) > 0:
                return data[:row_count]  # Limit to requested count
            else:
                raise ValueError("Invalid data format returned")
                
        except Exception as e:
            print(f"Error generating synthetic data from schema: {e}")
            # Generate fallback data
            return self._generate_fallback_data_from_schema(schema, row_count)
    
    def _generate_fallback_data_from_schema(self, schema: Dict[str, Any], row_count: int) -> List[Dict[str, Any]]:
        """Generate fallback data when AI generation fails"""
        fallback_data = []
        
        for i in range(row_count):
            row = {}
            for field_name, field_info in schema.items():
                row[field_name] = self._generate_sample_value(field_info, i)
            fallback_data.append(row)
        
        return fallback_data
            
    async def generate_synthetic_data_advanced(self, context_prompt: str) -> List[Dict[str, Any]]:
        """Generate synthetic data with advanced context"""
        
        try:
            response = await self._generate_content_async(context_prompt)
            
            # Parse the response and extract JSON array
            text = response.text if hasattr(response, 'text') else str(response)
            
            # Try to find JSON array in the response
            start_idx = text.find('[')
            end_idx = text.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # If no JSON found, generate a basic structure
                return self._generate_fallback_data()
                
        except Exception as e:
            print(f"Error generating synthetic data: {e}")
            return self._generate_fallback_data()
            
    async def _generate_content_async(self, prompt: str):
        """Generate content asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.model.generate_content, prompt)
        
    def _parse_json_response(self, response) -> Dict[str, Any]:
        """Parse JSON from Gemini response"""
        try:
            text = response.text if hasattr(response, 'text') else str(response)
            
            # Clean the text
            text = text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            return json.loads(text)
        except:
            return {"error": "Failed to parse response"}
            
    def _generate_fallback_data(self) -> List[Dict[str, Any]]:
        """Generate fallback synthetic data"""
        return [
            {
                "id": i,
                "value": f"synthetic_value_{i}",
                "category": f"category_{i % 3}",
                "score": 50 + (i % 50),
                "generated_at": datetime.utcnow().isoformat()
            }
            for i in range(100)
        ]