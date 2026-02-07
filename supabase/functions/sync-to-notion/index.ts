// Supabase Edge Function to sync signup data to Notion
// Deploy with: supabase functions deploy sync-to-notion

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY')
const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID')

interface SignupData {
  firstName: string
  lastName: string
  programType: string
  teamName?: string
  birthDate: string // ISO date string (YYYY-MM-DD) or birthYear as fallback
  birthYear?: number // Fallback for backwards compatibility
  competitiveLevel: string
  positions: string[]
  referralSource?: string
  email: string
  phoneNumber?: string
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const data: SignupData = await req.json()

    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
      throw new Error('Notion API credentials not configured')
    }

    // Map positions array to Notion multi-select format
    const positionOptions = data.positions.map(pos => ({ name: pos }))

    // Determine birth date (convert birthYear to birthDate if needed)
    // Notion date property expects a string in YYYY-MM-DD format (ISO 8601)
    let birthDateValue: string | null = null;
    if (data.birthDate) {
      // Validate date format (should be YYYY-MM-DD from HTML5 date input)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(data.birthDate)) {
        birthDateValue = data.birthDate;
      } else {
        console.warn('Invalid birthDate format, expected YYYY-MM-DD:', data.birthDate);
      }
    } else if (data.birthYear) {
      // Use January 1st of the birth year as the date (fallback)
      birthDateValue = `${data.birthYear}-01-01`;
    }

    // Build properties object
    // IMPORTANT: "Last Name" is the title property in your Notion database
    const properties: any = {
      // Title property - "Last Name" is set as the title in Notion
      'Last Name': {
        title: [{ text: { content: data.lastName || '' } }]
      },
      'First Name': {
        rich_text: [{ text: { content: data.firstName || '' } }]
      },
      'I\'m here for the…': {
        select: { name: data.programType }
      },
      'What team do you or your player play for?': {
        rich_text: data.teamName ? [{ text: { content: data.teamName } }] : []
      },
      'At what competitive level are you or your player currently competing?': {
        select: { name: data.competitiveLevel }
      },
      'Position': {
        multi_select: positionOptions
      },
      'How\'d you hear about us?': {
        select: data.referralSource ? { name: data.referralSource } : { name: 'Other' }
      },
    };

    // Add Birth Date if available
    // Notion date property type: { date: { start: "YYYY-MM-DD" } }
    // This is NOT a string property - it's a Date property type in Notion
    if (birthDateValue) {
      properties['Birth Date'] = {
        date: { start: birthDateValue } // Date type, not string
      };
    }

    // Add Phone Number if available
    if (data.phoneNumber) {
      properties['Phone Number'] = {
        phone_number: data.phoneNumber
      };
    }

    // Create page in Notion database
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: properties
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails = errorText
      
      // Try to parse error as JSON for better error messages
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = JSON.stringify(errorJson, null, 2)
        console.error('Notion API error response:', errorJson)
      } catch (e) {
        console.error('Notion API error (text):', errorText)
      }
      
      throw new Error(`Notion API error (${response.status}): ${errorDetails}`)
    }

    const result = await response.json()
    console.log('✅ Successfully created Notion page:', result.id)

    return new Response(
      JSON.stringify({ success: true, notionPageId: result.id }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error syncing to Notion:', error)
    console.error('Error stack:', error.stack)
    
    // Return detailed error information
    const errorMessage = error.message || 'Unknown error'
    const errorDetails = {
      error: errorMessage,
      type: error.constructor.name,
      stack: error.stack
    }
    
    return new Response(
      JSON.stringify(errorDetails),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

