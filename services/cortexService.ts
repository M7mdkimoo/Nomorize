
import { GoogleGenAI } from "@google/genai";
import { Memory, ChatMessage } from '../types';

export class CortexService {
  
  // Helper to convert file to base64
  private static async fileToPart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            // Remove the Data-URI prefix (e.g. "data:image/jpeg;base64,")
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        } else {
            reject(new Error("Failed to read file"));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  private static getClient(apiKey?: string) {
    // Use custom key if provided, otherwise fallback to env
    const key = apiKey && apiKey.trim().length > 0 ? apiKey : process.env.API_KEY;
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Analyzes input (text/link or image) to extract meaning, tags, and potential reminders.
   */
  static async analyzeContent(input: string, imageFile?: File, apiKey?: string): Promise<{ analysis: string; tags: string[]; reminderISO?: string }> {
    const ai = this.getClient(apiKey);
    
    let promptParts: any[] = [];
    
    if (imageFile) {
        try {
            const imagePart = await this.fileToPart(imageFile);
            promptParts.push(imagePart);
        } catch (e) {
            console.error("Failed to process image", e);
        }
    }

    promptParts.push({
        text: `Analyze the following input. 
        Input Text: "${input}"
        
        If an image is provided, analyze the visual content (OCR text, scene description).
        If the text contains a URL (like a YouTube link, news article, or social post), try to understand what the content is about using Google Search.
        
        YOUR TASKS:
        1. Create a detailed but concise summary/description of the content. If it is a URL, summarize the linked page/video.
        2. Extract 3-5 relevant tags.
        3. CRITICAL: Detect if there is a specific UPCOMING event, deadline, or time-sensitive task mentioned (e.g., in a screenshot of an email, calendar invite, or poster). 
           If found, extract the date and time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss). 
           Assume the current year is ${new Date().getFullYear()} if not specified.

        OUTPUT FORMAT:
        Return ONLY a raw JSON object (no markdown formatting) with this structure:
        {
          "analysis": "The detailed description...",
          "tags": ["tag1", "tag2"],
          "reminderISO": "2024-10-25T14:00:00" (or null if no event found)
        }`
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: promptParts },
            config: {
                // We enable googleSearch so it can analyze links if the user provides a URL
                tools: [{ googleSearch: {} }],
                // Note: We CANNOT use responseMimeType: "application/json" when using tools (googleSearch).
                // We must rely on the prompt to enforce JSON output and parse it manually.
            }
        });

        const text = response.text || "{}";
        // Clean up any potential markdown code blocks since we can't enforce JSON mode
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Find the first '{' and last '}' to extract JSON if there's extra text
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            return JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
        }
        
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Analysis failed", error);
        return { 
            analysis: input, 
            tags: [], 
            reminderISO: undefined 
        };
    }
  }

  /**
   * Generates a consolidated summary for a group of selected memories.
   */
  static async summarizeSelection(memories: Memory[], apiKey?: string, userName?: string): Promise<string> {
      const ai = this.getClient(apiKey);
      
      const contentBlock = memories.map(m => `[${m.type}]: ${m.content} (Tags: ${m.tags.join(', ')})`).join('\n---\n');

      const prompt = `
        You are Cortex. The user ${userName ? `(${userName})` : ''} has selected ${memories.length} specific memories and wants a consolidated summary.

        SELECTED MEMORIES:
        ${contentBlock}

        INSTRUCTIONS:
        1. Identify the common themes or connections between these items.
        2. Synthesize them into a single cohesive narrative or summary.
        3. Don't just list them; explain how they relate if possible.
      `;

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
          });
          return response.text || "Could not generate summary.";
      } catch (error) {
          return "Error generating summary.";
      }
  }

  /**
   * Analyzes a new memory against existing ones to find strong semantic connections.
   */
  static async findConnections(newMemory: Memory, existingMemories: Memory[], apiKey?: string): Promise<string[]> {
      // Simple optimization: Don't scan if too few memories
      if (existingMemories.length < 3) return [];

      const ai = this.getClient(apiKey);
      
      // We send a subset or simplified version to save tokens, focusing on content
      const existingContext = existingMemories
          .filter(m => m.id !== newMemory.id)
          .map(m => `ID:${m.id} | ${m.content.substring(0, 100)}... | Tags: ${m.tags.join(',')}`)
          .join('\n');

      const prompt = `
        Analyze the relationship between a NEW memory and EXISTING memories.
        
        NEW MEMORY:
        ${newMemory.content} [Tags: ${newMemory.tags.join(', ')}]

        EXISTING MEMORIES:
        ${existingContext}

        TASK:
        Identify existing memories that are STRONGLY related to the new one (same topic, same person, or logical continuation).
        Ignore weak connections.

        OUTPUT:
        Return a JSON object with an array of IDs:
        { "relatedIds": ["id_1", "id_2"] }
        Return empty array if no strong matches.
      `;

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: "application/json" } // Valid here as no tools are used
          });
          const json = JSON.parse(response.text || "{}");
          return json.relatedIds || [];
      } catch (e) {
          console.error("Link detection failed", e);
          return [];
      }
  }

  /**
   * Generates a proactive briefing for a specific event reminder by connecting it to other memories.
   */
  static async generateBriefing(targetMemory: Memory, allMemories: Memory[], apiKey?: string, userName?: string): Promise<string> {
    const ai = this.getClient(apiKey);
    
    const memoryContext = allMemories
      .filter(m => m.id !== targetMemory.id) // Exclude the trigger memory itself from context to avoid redundancy
      .map(m => `[ID:${m.id}] (${m.type}): ${m.content} | Tags: ${m.tags.join(',')}`)
      .join('\n');

    const prompt = `
      You are a highly efficient Personal Memory Assistant for ${userName || 'the user'}.
      
      CURRENT SCENARIO:
      The user has a reminder now for:
      "${targetMemory.content}"
      
      YOUR GOAL:
      Check if the user has done this before (met this person, visited this place, done this task) and recall their FEEDBACK from previous experiences.
      
      AVAILABLE MEMORY BANK:
      ${memoryContext}
      
      INSTRUCTIONS:
      1. **Search for Recursion**: Look for memories with similar keywords (names, places) or tags like #feedback.
      2. **Detect Sentiment**: If found, what was the user's experience last time? Good? Bad? Frustrating?
      3. **Output**:
         - If you find relevant past feedback/experience, start your response with "RECALL_FOUND".
         - Provide a "Briefing" that specifically quotes their past self. e.g. "Last time you met John, you noted: 'He hates being interrupted'."
         - If no past history is found, provide a standard motivating summary.

      OUTPUT FORMAT (Markdown):
      (If history found):
      RECALL_FOUND
      ### ⚠️ Past Experience Detected
      **Last time:** [Summary of past feedback]
      **Advice for today:** [Actionable tip based on past feedback]
      
      (If no history):
      ### 📅 Event Briefing
      [Standard summary]
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Reminder: " + targetMemory.content;
    } catch (e) {
      return "Reminder: " + targetMemory.content;
    }
  }

  static async generateResponse(userQuery: string, memories: Memory[], contextMemoryIds?: string[], apiKey?: string, userName?: string, aiTone: string = 'friendly', aiModel: string = 'gemini-2.5-flash'): Promise<ChatMessage> {
    const ai = this.getClient(apiKey);
    
    // Serialize memories for context
    const memoryContext = memories.length > 0 
      ? memories.map(m => {
          let details = `ID: ${m.id} | Type: ${m.type} | Date: ${new Date(m.timestamp).toLocaleString()} | Tags: ${m.tags.join(',')} | Content: ${m.content}`;
          if (m.reminderTimestamp) {
              details += ` | REMINDER SET FOR: ${new Date(m.reminderTimestamp).toLocaleString()}`;
          }
          return details;
      }).join('\n')
      : "No memories recorded in this session yet.";

    let prompt = userQuery;
    
    if (contextMemoryIds && contextMemoryIds.length > 0) {
      const specificMemories = memories.filter(m => contextMemoryIds.includes(m.id));
      if (specificMemories.length > 0) {
        const specificContext = specificMemories.map(m => `[ID: ${m.id}] Content: "${m.content}"`).join('\n');
        prompt = `I am asking specifically about these memories:
        ${specificContext}
        
        User Question: ${userQuery}`;
      }
    }

    const toneInstruction = {
        'friendly': "Be warm, encouraging, and conversational.",
        'professional': "Be formal, efficient, and business-like.",
        'concise': "Be extremely brief and to the point. Use bullet points where possible.",
        'enthusiastic': "Be high energy, positive, and motivating!",
        'explanatory': "Be detailed and educational, explaining context thoroughly."
    }[aiTone] || "Be friendly and helpful.";

    const systemInstruction = `You are Cortex, an intelligent personal memory assistant.
    ${userName ? `The user's name is ${userName}.` : ''}
    
    PERSONALITY:
    ${toneInstruction}
    
    CONTEXT:
    You have access to the user's current session memories:
    ---
    ${memoryContext}
    ---
    
    INSTRUCTIONS:
    1. Answer the user's questions naturally according to your personality.
    2. You can discuss ANY topic. 
    3. USE GOOGLE SEARCH (the 'googleSearch' tool) if the user asks about current events, facts, general knowledge, or if the answer requires external information not found in their memories.
    4. USE GOOGLE MAPS (the 'googleMaps' tool) if the user asks about a location, place, directions, or geography (e.g. "Where is that restaurant I mentioned?").
    5. If the user asks about their memories, answer based strictly on the provided context.
    
    6. **CRITICAL: PROACTIVE SUGGESTIONS & TYPES**
       - Even if the user doesn't explicitly ask "find X", if you see other memories that are relevant to the current topic (e.g., talking about "food" and you have a photo of a "burger" saved), include their IDs.
       - If the user asks for specific types (e.g., "show images"), find all matching IDs.
    
    7. At the very end of your response, output a JSON array of the relevant Memory IDs in this exact format:
       ||RELATED_IDS:["id_1", "id_2"]||
       (Do not output this tag if no specific memories are relevant).
    `;

    const config: any = {
      systemInstruction: systemInstruction,
      tools: [
        { googleSearch: {} },
        { googleMaps: {} } // Enable Maps Grounding
      ]
    };

    // Configure Thinking Mode if selected
    if (aiModel === 'gemini-3-pro-preview') {
       config.thinkingConfig = { thinkingBudget: 16000 }; // Set thinking budget
    }

    try {
      const response = await ai.models.generateContent({
        model: aiModel,
        contents: prompt,
        config: config
      });

      let responseText = response.text || "I couldn't generate a response.";
      let relatedIds: string[] = [];

      // 1. Extract Related IDs from the custom protocol
      const idPattern = /\|\|RELATED_IDS:(\[.*?\])\|\|/;
      const match = responseText.match(idPattern);
      if (match) {
        try {
          relatedIds = JSON.parse(match[1]);
          responseText = responseText.replace(idPattern, '').trim();
        } catch (e) {
          console.warn("Failed to parse related IDs", e);
        }
      }

      // 2. Extract and Append Grounding Sources
      const candidates = response.candidates;
      if (candidates && candidates[0] && candidates[0].groundingMetadata?.groundingChunks) {
         const chunks = candidates[0].groundingMetadata.groundingChunks;
         
         // Web Sources
         const webSources = chunks
            .filter((c: any) => c.web?.uri && c.web?.title)
            .map((c: any) => `• [Web] ${c.web.title}: ${c.web.uri}`);
         
         // Maps Sources (if any)
         const mapSources = chunks
            .filter((c: any) => c.maps?.uri && c.maps?.title)
            .map((c: any) => `• [Map] ${c.maps.title}: ${c.maps.uri}`);

         const allSources = [...new Set([...webSources, ...mapSources])];
         
         if (allSources.length > 0) {
             responseText += "\n\n**Sources:**\n" + allSources.join('\n');
         }
      }

      return {
        id: Date.now().toString(),
        sender: 'cortex',
        text: responseText,
        timestamp: Date.now(),
        relatedMemoryIds: relatedIds
      };

    } catch (error) {
      console.error("Cortex GenAI Error:", error);
      return {
        id: Date.now().toString(),
        sender: 'cortex',
        text: "I'm having trouble accessing my cognitive functions. Please check your API key in settings or network connection. If using the Thinking model, ensure you have quota.",
        timestamp: Date.now()
      };
    }
  }
}
