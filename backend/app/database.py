"""
Supabase client singleton.

Import `supabase_client` wherever you need to query the database.
The client is created once at module load time using the service-role key,
which bypasses Row Level Security and is appropriate for server-side use only.
"""

from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
