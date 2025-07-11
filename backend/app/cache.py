"""
Simple in-memory caching system for search results.
In production, replace with Redis for persistence and scaling.
"""
import time
import hashlib
import json
from typing import Optional, List, Dict, Any
from threading import Lock

class SearchCache:
    """Thread-safe in-memory cache with TTL support."""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.default_ttl = default_ttl
    
    def _generate_key(self, query: str) -> str:
        """Generate cache key from search query."""
        return f"search:{hashlib.md5(query.lower().strip().encode()).hexdigest()}"
    
    def _is_expired(self, entry: Dict[str, Any]) -> bool:
        """Check if cache entry has expired."""
        return time.time() > entry["expires_at"]
    
    def get(self, query: str) -> Optional[List[dict]]:
        """Get cached search results for query."""
        key = self._generate_key(query)
        
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if self._is_expired(entry):
                del self._cache[key]
                return None
            
            return entry["data"]
    
    def set(self, query: str, results: List[dict], ttl: Optional[int] = None) -> None:
        """Cache search results for query."""
        key = self._generate_key(query)
        ttl = ttl or self.default_ttl
        expires_at = time.time() + ttl
        
        with self._lock:
            self._cache[key] = {
                "data": results,
                "expires_at": expires_at,
                "cached_at": time.time()
            }
    
    def clear_expired(self) -> int:
        """Remove expired entries and return count of removed items."""
        removed_count = 0
        current_time = time.time()
        
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if current_time > entry["expires_at"]
            ]
            
            for key in expired_keys:
                del self._cache[key]
                removed_count += 1
        
        return removed_count
    
    def clear_all(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_entries = len(self._cache)
            current_time = time.time()
            expired_entries = sum(
                1 for entry in self._cache.values()
                if current_time > entry["expires_at"]
            )
            
            return {
                "total_entries": total_entries,
                "valid_entries": total_entries - expired_entries,
                "expired_entries": expired_entries,
                "cache_size_mb": len(json.dumps(self._cache)) / (1024 * 1024)
            }

class FailureTracker:
    """Thread-safe failure tracking for pagination with TTL support."""
    
    def __init__(self, default_ttl: int = 1800):  # 30 minutes default
        self._failures: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.default_ttl = default_ttl
        self.max_failures = 3  # Stop after 3 consecutive failures
    
    def _generate_key(self, query: str, page: int, filters: str = "") -> str:
        """Generate failure tracking key from search parameters."""
        key_data = f"{query.lower().strip()}:page:{page}{filters}"
        return f"failures:{hashlib.md5(key_data.encode()).hexdigest()}"
    
    def _is_expired(self, entry: Dict[str, Any]) -> bool:
        """Check if failure tracking entry has expired."""
        return time.time() > entry["expires_at"]
    
    def record_failure(self, query: str, page: int, filters: str = "") -> int:
        """Record a failure for the given search parameters. Returns consecutive failure count."""
        key = self._generate_key(query, page, filters)
        
        with self._lock:
            current_time = time.time()
            
            if key in self._failures and not self._is_expired(self._failures[key]):
                # Increment existing failure count
                self._failures[key]["count"] += 1
                self._failures[key]["last_failure"] = current_time
            else:
                # Start new failure tracking
                self._failures[key] = {
                    "count": 1,
                    "first_failure": current_time,
                    "last_failure": current_time,
                    "expires_at": current_time + self.default_ttl
                }
            
            return self._failures[key]["count"]
    
    def record_success(self, query: str, page: int, filters: str = "") -> None:
        """Record a successful response, clearing failure count."""
        key = self._generate_key(query, page, filters)
        
        with self._lock:
            if key in self._failures:
                del self._failures[key]
    
    def get_failure_count(self, query: str, page: int, filters: str = "") -> int:
        """Get current consecutive failure count for the search parameters."""
        key = self._generate_key(query, page, filters)
        
        with self._lock:
            if key not in self._failures:
                return 0
            
            entry = self._failures[key]
            if self._is_expired(entry):
                del self._failures[key]
                return 0
            
            return entry["count"]
    
    def should_stop_pagination(self, query: str, page: int, filters: str = "") -> bool:
        """Check if pagination should stop due to consecutive failures."""
        return self.get_failure_count(query, page, filters) >= self.max_failures
    
    def clear_expired(self) -> int:
        """Remove expired failure tracking entries."""
        removed_count = 0
        current_time = time.time()
        
        with self._lock:
            expired_keys = [
                key for key, entry in self._failures.items()
                if current_time > entry["expires_at"]
            ]
            
            for key in expired_keys:
                del self._failures[key]
                removed_count += 1
        
        return removed_count


# Global cache instances
search_cache = SearchCache(default_ttl=300)  # 5 minutes TTL
failure_tracker = FailureTracker(default_ttl=1800)  # 30 minutes TTL