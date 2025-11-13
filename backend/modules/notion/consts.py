# broker queue name
NOTION_QUEUE_NAME = "notion.tickets"

# API configuration
NOTION_API_BASE_URL = "https://api.notion.com/v1"
NOTION_API_VERSION = "2025-09-03"  # Modern API version - uses data_sources for schema
DEFAULT_TIMEOUT = 15.0

# temporary lock (deleted after consumption by faststream). 
# Used by NotionService to decide whether to send message to broker or not.
NOTION_SYNC_REDIS_PREFIX = "notion:ticket-sync"
NOTION_SYNC_TTL_SECONDS = 60 * 60 * 24 * 15  # 15 days

# persistent data (kept for future operations)
NOTION_PAGE_ID_REDIS_PREFIX = "notion:page-id"
NOTION_PAGE_ID_TTL_SECONDS = 60 * 60 * 24 * 365  # 1 year
NOTION_BLOCK_ID_REDIS_PREFIX = "notion:block-id"
NOTION_BLOCK_ID_TTL_SECONDS = 60 * 60 * 24 * 365  # 1 year


# later we will add database_id of each SG department and map them to the department id
NOTION_TICKET_DATABASE_ID = "2a580237cb508105982ef744d8f35cb1"
NOTION_TICKET_URL_TEMPLATE = "https://nuspace.kz/apps/sgotinish/sg/ticket/"