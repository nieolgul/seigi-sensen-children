
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log(
  'Key prefix:',
  import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 15)
)
export const supabase = createClient(supabaseUrl, supabaseKey)
