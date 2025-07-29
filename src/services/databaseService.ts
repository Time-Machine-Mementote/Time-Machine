import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert']
type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update']

type GeneratedMemory = Database['public']['Tables']['generated_memories']['Row']
type GeneratedMemoryInsert = Database['public']['Tables']['generated_memories']['Insert']
type GeneratedMemoryUpdate = Database['public']['Tables']['generated_memories']['Update']

export class DatabaseService {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: ProfileUpdate): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return null
    }

    return data
  }

  /**
   * Get all journal entries for current user
   */
  async getJournalEntries(): Promise<JournalEntry[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching journal entries:', error)
      return []
    }

    return data || []
  }

  /**
   * Get a single journal entry by ID
   */
  async getJournalEntry(id: string): Promise<JournalEntry | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching journal entry:', error)
      return null
    }

    return data
  }

  /**
   * Create a new journal entry
   */
  async createJournalEntry(entry: Omit<JournalEntryInsert, 'user_id'>): Promise<JournalEntry | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        ...entry,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating journal entry:', error)
      return null
    }

    return data
  }

  /**
   * Update a journal entry
   */
  async updateJournalEntry(id: string, updates: JournalEntryUpdate): Promise<JournalEntry | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating journal entry:', error)
      return null
    }

    return data
  }

  /**
   * Delete a journal entry
   */
  async deleteJournalEntry(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting journal entry:', error)
      return false
    }

    return true
  }

  /**
   * Get generated memory for a journal entry
   */
  async getGeneratedMemory(entryId: string): Promise<GeneratedMemory | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('generated_memories')
      .select('*')
      .eq('entry_id', entryId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching generated memory:', error)
      return null
    }

    return data
  }

  /**
   * Create or update a generated memory
   */
  async upsertGeneratedMemory(entryId: string, memory: Omit<GeneratedMemoryInsert, 'entry_id' | 'user_id'>): Promise<GeneratedMemory | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check if memory already exists
    const existingMemory = await this.getGeneratedMemory(entryId)

    if (existingMemory) {
      // Update existing memory
      const { data, error } = await supabase
        .from('generated_memories')
        .update(memory)
        .eq('id', existingMemory.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating generated memory:', error)
        return null
      }

      return data
    } else {
      // Create new memory
      const { data, error } = await supabase
        .from('generated_memories')
        .insert({
          ...memory,
          entry_id: entryId,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating generated memory:', error)
        return null
      }

      return data
    }
  }

  /**
   * Get all generated memories for current user
   */
  async getGeneratedMemories(): Promise<GeneratedMemory[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('generated_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching generated memories:', error)
      return []
    }

    return data || []
  }

  /**
   * Get journal entries with their generated memories
   */
  async getJournalEntriesWithMemories(): Promise<(JournalEntry & { generated_memory?: GeneratedMemory })[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        generated_memories (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching journal entries with memories:', error)
      return []
    }

    return (data || []).map(entry => ({
      ...entry,
      generated_memory: entry.generated_memories?.[0] || undefined
    }))
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  }
}

// Export singleton instance
export const databaseService = new DatabaseService() 