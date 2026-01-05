"""Utility functions for fetching Google Photos album metadata."""
import re
from typing import Dict, Optional

import httpx
from bs4 import BeautifulSoup


async def fetch_google_photos_metadata(album_url: str) -> Dict[str, Optional[str]]:
    """
    Fetch metadata from a Google Photos shared album URL.
    
    Extracts Open Graph metadata including title, thumbnail, and description.
    
    Args:
        album_url: The public Google Photos album URL
        
    Returns:
        Dictionary with keys: title, thumbnail_url, date_str, description
    """
    metadata = {
        "title": None,
        "thumbnail_url": None,
        "date_str": None,
        "description": None,
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(
                album_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract Open Graph metadata
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                full_title = og_title["content"]
                
                # Google Photos format: "Album Name · Mar 19 – 21, 2024 📸"
                # The "·" separates album name from date
                if "·" in full_title:
                    parts = full_title.split("·", 1)
                    metadata["title"] = parts[0].strip()
                    date_part = parts[1].strip() if len(parts) > 1 else ""
                    
                    # Remove emoji
                    date_part = re.sub(r'[📸📷🎬🎥🎞️]+', '', date_part).strip()
                    
                    # Pattern: "Mon DD – DD, YYYY" or "Mon DD, YYYY"
                    # Extract the first date (start of range)
                    date_match = re.search(r'([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s+(\d{4})', date_part)
                    if date_match:
                        month_str, day, year = date_match.groups()
                        metadata["date_str"] = f"{month_str} {day}, {year}"
                else:
                    metadata["title"] = full_title.strip()
            
            og_image = soup.find("meta", property="og:image")
            if og_image and og_image.get("content"):
                metadata["thumbnail_url"] = og_image["content"]
            
            og_description = soup.find("meta", property="og:description")
            if og_description and og_description.get("content"):
                metadata["description"] = og_description["content"]
            
            # Try to extract date from Open Graph meta tags
            # Check og:release_date first
            og_release_date = soup.find("meta", property="og:release_date")
            if og_release_date and og_release_date.get("content"):
                metadata["date_str"] = og_release_date["content"]
            
            # Fallback: try article:published_time
            if not metadata["date_str"]:
                article_date = soup.find("meta", property="article:published_time")
                if article_date and article_date.get("content"):
                    metadata["date_str"] = article_date["content"]
            
            # Fallback: try og:updated_time
            if not metadata["date_str"]:
                og_updated = soup.find("meta", property="og:updated_time")
                if og_updated and og_updated.get("content"):
                    metadata["date_str"] = og_updated["content"]
            
            # Fallback: try to extract from title if no description
            if not metadata["title"]:
                title_tag = soup.find("title")
                if title_tag:
                    metadata["title"] = title_tag.string
                    
    except Exception as e:
        # Log but don't fail - return whatever we could extract
        print(f"Error fetching Google Photos metadata: {e}")
    
    return metadata
