import pinecone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import json

from ..config import settings

class VectorService:
    def __init__(self):
        self.pinecone_client = None
        self.index = None
        self.embeddings_model = SentenceTransformer('all-MiniLM-L6-v2')
        
    async def initialize(self):
        """Initialize Pinecone connection"""
        pinecone.init(
            api_key=settings.pinecone_api_key,
            environment=settings.pinecone_environment
        )
        
        # Create index if it doesn't exist
        if settings.pinecone_index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=settings.pinecone_index_name,
                dimension=384,  # all-MiniLM-L6-v2 dimension
                metric='cosine'
            )
            
        self.index = pinecone.Index(settings.pinecone_index_name)
        print("✅ Pinecone vector database connected")
        
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for texts"""
        return self.embeddings_model.encode(texts)
        
    async def store_dataset_embeddings(
        self, 
        dataset_id: str, 
        schema_data: Dict[str, Any],
        sample_data: List[Dict[str, Any]]
    ) -> bool:
        """Store dataset embeddings for similarity search"""
        try:
            # Create text representations
            schema_text = json.dumps(schema_data)
            sample_texts = [json.dumps(row) for row in sample_data[:10]]  # First 10 rows
            
            # Generate embeddings
            all_texts = [schema_text] + sample_texts
            embeddings = self.generate_embeddings(all_texts)
            
            # Prepare vectors for upsert
            vectors = []
            
            # Schema embedding
            vectors.append({
                "id": f"{dataset_id}_schema",
                "values": embeddings[0].tolist(),
                "metadata": {
                    "dataset_id": dataset_id,
                    "type": "schema",
                    "content": schema_text[:1000]  # Truncate for metadata
                }
            })
            
            # Sample data embeddings
            for i, (text, embedding) in enumerate(zip(sample_texts, embeddings[1:])):
                vectors.append({
                    "id": f"{dataset_id}_sample_{i}",
                    "values": embedding.tolist(),
                    "metadata": {
                        "dataset_id": dataset_id,
                        "type": "sample",
                        "content": text[:1000]
                    }
                })
                
            # Upsert to Pinecone
            self.index.upsert(vectors=vectors)
            return True
            
        except Exception as e:
            print(f"Error storing embeddings: {e}")
            return False
            
    async def find_similar_datasets(
        self, 
        query_schema: Dict[str, Any], 
        query_samples: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Find similar datasets based on schema and sample data"""
        try:
            # Create query text
            query_text = json.dumps(query_schema)
            query_embedding = self.generate_embeddings([query_text])[0]
            
            # Search for similar schemas
            results = self.index.query(
                vector=query_embedding.tolist(),
                top_k=top_k * 2,  # Get more results to filter
                include_metadata=True,
                filter={"type": "schema"}
            )
            
            # Process and deduplicate results
            similar_datasets = []
            seen_datasets = set()
            
            for match in results.matches:
                dataset_id = match.metadata["dataset_id"]
                if dataset_id not in seen_datasets:
                    similar_datasets.append({
                        "dataset_id": dataset_id,
                        "similarity_score": match.score,
                        "metadata": match.metadata
                    })
                    seen_datasets.add(dataset_id)
                    
                if len(similar_datasets) >= top_k:
                    break
                    
            return similar_datasets
            
        except Exception as e:
            print(f"Error finding similar datasets: {e}")
            return []
            
    async def store_domain_patterns(
        self, 
        domain: str, 
        patterns: Dict[str, Any]
    ) -> bool:
        """Store domain-specific patterns for cross-domain transfer"""
        try:
            pattern_text = json.dumps(patterns)
            embedding = self.generate_embeddings([pattern_text])[0]
            
            vector = {
                "id": f"domain_{domain}",
                "values": embedding.tolist(),
                "metadata": {
                    "type": "domain_pattern",
                    "domain": domain,
                    "patterns": pattern_text[:2000]
                }
            }
            
            self.index.upsert(vectors=[vector])
            return True
            
        except Exception as e:
            print(f"Error storing domain patterns: {e}")
            return False
            
    async def get_cross_domain_insights(
        self, 
        target_domain: str, 
        query_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get insights from other domains that might be applicable"""
        try:
            query_text = json.dumps(query_data)
            query_embedding = self.generate_embeddings([query_text])[0]
            
            # Search across all domain patterns except the target
            results = self.index.query(
                vector=query_embedding.tolist(),
                top_k=10,
                include_metadata=True,
                filter={
                    "type": "domain_pattern",
                    "domain": {"$ne": target_domain}
                }
            )
            
            insights = []
            for match in results.matches:
                if match.score > 0.7:  # High similarity threshold
                    insights.append({
                        "source_domain": match.metadata["domain"],
                        "similarity_score": match.score,
                        "applicable_patterns": json.loads(match.metadata["patterns"])
                    })
                    
            return insights
            
        except Exception as e:
            print(f"Error getting cross-domain insights: {e}")
            return []
            
    async def cleanup_dataset_embeddings(self, dataset_id: str) -> bool:
        """Remove embeddings for a deleted dataset"""
        try:
            # Get all vectors for this dataset
            query_results = self.index.query(
                vector=[0] * 384,  # Dummy vector
                top_k=10000,
                include_metadata=True,
                filter={"dataset_id": dataset_id}
            )
            
            # Delete all related vectors
            vector_ids = [match.id for match in query_results.matches]
            if vector_ids:
                self.index.delete(ids=vector_ids)
                
            return True
            
        except Exception as e:
            print(f"Error cleaning up embeddings: {e}")
            return False