import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://srzcbvjryycmpmnobhhh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyemNidmpyeXljbXBtbm9iaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjQ3OTUsImV4cCI6MjA5MDUwMDc5NX0.nbWWESGnEMoQVZcAQBxGKcQjJJAMbqcYyb5R6sV1J9c' 

// Exportamos el cliente para que otros archivos puedan usarlo
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)