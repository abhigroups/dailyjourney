
import { GoogleGenAI, Type } from "@google/genai";
import { JournalEntry, PatternAnalysis, LifeJourneyAnalysis } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY || '';
    return new GoogleGenAI({ apiKey });
};

const ANALYZE_SYSTEM_PROMPT = `
You are an empathetic and intelligent journaling assistant. 
Your goal is to analyze journal entries to provide structured emotional data.

1. Extract 3-5 specific keywords. **CRITICAL:** Focus strictly on achievements, wins, positive traits, strengths, or moments of gratitude found in the text. (e.g., 'Completed Project', 'Showed Patience', 'Self-Care'). If the entry is difficult, find the strength in it (e.g., 'Resilience', 'Courage').
2. Determine a 'moodScore' (1-10).
3. Select a 'moodEmoji' that creatively represents the specific vibe (e.g., 🚀, 🌿, ⛈️, 🍷).
4. Pick a 'moodColor' (Hex code) that fits the emotion (e.g. #FFD700 for happy, #708090 for sad).
Always respond in JSON.
`;

const PATTERN_SYSTEM_PROMPT = `
You are a psychological pattern recognition expert. 
Analyze a set of journal entries to find deep, recurring themes, hidden habits, and provide actionable advice.
Always respond in JSON.
`;

const JOURNEY_SYSTEM_PROMPT = `
You are a compassionate life coach and psychological analyst known for positivity and reframing.
Analyze the user's journal entries to extract specific life data and create a personality optimization profile.

CRITICAL INSTRUCTION FOR NEGATIVES:
Do NOT explicitely list 'Negatives' as bad things. 
The 'negatives' array in the schema should be populated with "Challenges identified" but phrased neutrally.
However, for the 'motivationalBlock', you MUST reframe them completely into inspiring goals.
For example: 'Anxiety' -> 'Mastering Inner Calm'. 'Lazy' -> 'Restoring Energy for Action'.

EXTRACT:
- 'actsOfKindness': When they helped others or showed empathy.
- 'confidenceMoments': When they felt strong or proud.
- 'futurePlans': Specific things they said they want to do, fix, or achieve.

The 'resilienceNarrative' should be a powerful, 2-3 sentence story that acknowledges their hard times but frames them as a 'training arc' or a necessary step to greatness. 

Always respond in JSON.
`;

export const analyzeEntryWithGemini = async (text: string): Promise<Partial<JournalEntry>> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this journal entry: "${text}"`,
      config: {
        systemInstruction: ANALYZE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moodScore: { type: Type.NUMBER, description: "Rating from 1 (terrible) to 10 (amazing)" },
            moodLabel: { type: Type.STRING, description: "A one or two word emotion descriptor e.g. 'Hopeful', 'Anxious'" },
            moodEmoji: { type: Type.STRING, description: "A single emoji representing the entry" },
            moodColor: { type: Type.STRING, description: "A hex color code representing the entry" },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3-5 keywords focusing on achievements, strengths, and positives" },
            summary: { type: Type.STRING, description: "A one sentence summary of the entry" },
            reflectionQuestion: { type: Type.STRING, description: "A deep, thought-provoking question based on the entry" }
          },
          required: ["moodScore", "moodLabel", "moodEmoji", "moodColor", "keywords", "summary", "reflectionQuestion"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const detectPatterns = async (entries: JournalEntry[]): Promise<PatternAnalysis> => {
  const ai = getClient();
  const recentContext = entries.slice(0, 20).map(e => `[${e.createdAt.split('T')[0]}]: ${e.content}`).join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Here are the recent journal entries:\n\n${recentContext}\n\nIdentify the patterns.`,
      config: {
        systemInstruction: PATTERN_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recurringThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 recurring themes found in the text" },
            habitInsight: { type: Type.STRING, description: "An observation about a habit (good or bad)" },
            improvementSuggestion: { type: Type.STRING, description: "A specific, actionable piece of advice" },
            overallVibe: { type: Type.STRING, description: "The general emotional atmosphere of recent days" }
          },
          required: ["recurringThemes", "habitInsight", "improvementSuggestion", "overallVibe"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      timestamp: new Date().toISOString(),
      ...result
    };
  } catch (error) {
    console.error("Gemini Pattern Error:", error);
    throw error;
  }
};

export const generateLifeJourneyAnalysis = async (entries: JournalEntry[]): Promise<LifeJourneyAnalysis> => {
  const ai = getClient();
  // Limit context to recent 50 entries to stay within tokens but capture enough history
  const textContext = entries
    .slice(0, 50)
    .map(e => `[${e.createdAt.split('T')[0]}]: ${e.content}`)
    .join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze these entries:\n\n${textContext}\n\n
      Extract the following lists (max 5 items each, concise):
      1. Positives
      2. Challenges (Populate 'negatives' field with these)
      3. Achievements
      4. Confidence Times (When user felt confident)
      5. Acts of Kindness (Helping others)
      6. Future Plans (What they plan to fix or do)
      7. Best Moments

      Create a "personalityProfile".
      
      Create a "motivationalBlock":
      - resilienceScore (0-100)
      - positivityIndex (0-100)
      - powerQuote (A quote that fits their situation)
      - resilienceNarrative (Encouraging story reframing their struggles)
      - growthFocus (Top 3 challenges renamed as positive goals)
      `,
      config: {
        systemInstruction: JOURNEY_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            positives: { type: Type.ARRAY, items: { type: Type.STRING } },
            negatives: { type: Type.ARRAY, items: { type: Type.STRING } },
            achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidenceMoments: { type: Type.ARRAY, items: { type: Type.STRING } },
            actsOfKindness: { type: Type.ARRAY, items: { type: Type.STRING } },
            futurePlans: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestMoments: { type: Type.ARRAY, items: { type: Type.STRING } },
            personalityProfile: {
              type: Type.OBJECT,
              properties: {
                archetype: { type: Type.STRING },
                traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                encouragingMessage: { type: Type.STRING },
                optimizationTips: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["archetype", "traits", "encouragingMessage", "optimizationTips"]
            },
            motivationalBlock: {
                type: Type.OBJECT,
                properties: {
                    resilienceScore: { type: Type.NUMBER },
                    positivityIndex: { type: Type.NUMBER },
                    powerQuote: { type: Type.STRING },
                    resilienceNarrative: { type: Type.STRING },
                    growthFocus: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["resilienceScore", "positivityIndex", "powerQuote", "resilienceNarrative", "growthFocus"]
            }
          },
          required: ["positives", "negatives", "achievements", "confidenceMoments", "actsOfKindness", "futurePlans", "bestMoments", "personalityProfile", "motivationalBlock"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      timestamp: new Date().toISOString(),
      ...result
    };
  } catch (error) {
    console.error("Gemini Journey Analysis Error:", error);
    throw error;
  }
};

export const findSimilarConnections = async (currentEntry: string, pastEntries: JournalEntry[]): Promise<string> => {
    const ai = getClient();
    const recentContext = pastEntries.slice(0, 50).map(e => `ID: ${e.id} | Date: ${e.createdAt.split('T')[0]} | Summary: ${e.summary || e.content.substring(0, 100)}...`).join("\n");
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Current Entry: "${currentEntry}"\n\nPast Entries Library:\n${recentContext}\n\nTask: Find one past entry that is most emotionally or thematically similar to the current one. Explain the connection briefly.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        relatedEntryId: {type: Type.STRING},
                        connectionReason: {type: Type.STRING}
                    }
                }
            }
        });
        const json = JSON.parse(response.text || "{}");
        return json.connectionReason || "No clear connection found.";
    } catch (e) {
        return "Unable to analyze connections at this time.";
    }
}

// --- Media Generation Features ---

// 1. Generate Image from Entry
export const generateJournalImage = async (entryText: string): Promise<string> => {
  const ai = getClient();
  // Using gemini-2.5-flash-image for general generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `Create an artistic, abstract or symbolic illustration that represents this journal entry mood: ${entryText.substring(0, 300)}` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      }
    }
  });

  // Extract base64 image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("No image generated");
};

// 2. Generate Video from Entry (Veo)
export const generateJournalVideo = async (entryText: string, onProgress?: () => void): Promise<string> => {
  const win = window as any;
  
  const performGeneration = async (retry: boolean) => {
      // Ensure key exists before we start
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (!hasKey || retry) {
            await win.aistudio.openSelectKey();
        }
      }

      // Create a new client to pick up the key
      const ai = getClient();

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A cinematic, dreamlike 10 second video visualizing this memory: ${entryText.substring(0, 300)}`,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        if (onProgress) onProgress();
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation});
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) throw new Error("Video generation failed");

      // Fetch the actual bytes using the API key
      const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
  };

  try {
      return await performGeneration(false);
  } catch (error: any) {
      if (error.message && error.message.includes("Requested entity was not found")) {
          // Handle Race Condition: Reset and Retry
          return await performGeneration(true);
      }
      throw error;
  }
};

// 3. Audio Transcription
export const transcribeAudio = async (audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: audioBase64
                        }
                    },
                    { text: "Please transcribe this audio accurately into text. Do not add any commentary." }
                ]
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Transcription failed", error);
        throw new Error("Failed to transcribe audio.");
    }
};

// 4. Generate Positive Reflection (Image + Quote)
export const generatePositiveReflection = async (entryText: string): Promise<{ quote: string, imageBase64: string }> => {
    const ai = getClient();
    
    // Step 1: Analyze text to get a quote and an image description
    const textResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Read this journal entry: "${entryText.substring(0, 1000)}". 
        Even if the entry is sad or neutral, find a silver lining or a message of hope.
        1. Write a short, uplifting, encouraging quote (max 15 words) relevant to this situation.
        2. Write a detailed visual description for a peaceful, positive ANIME STYLE illustration that represents this feeling of hope and positivity.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    quote: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                },
                required: ["quote", "imagePrompt"]
            }
        }
    });

    const textResult = JSON.parse(textResponse.text || "{}");
    const quote = textResult.quote || "Every day is a new beginning.";
    const imagePrompt = textResult.imagePrompt || "A peaceful anime style landscape with soft sunlight filtering through trees.";

    // Step 2: Generate the image based on the prompt
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: `Anime style illustration, high quality, uplifting, positive vibes. ${imagePrompt}` }
            ]
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1",
            }
        }
    });

    let imageBase64 = "";
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            imageBase64 = part.inlineData.data;
            break;
        }
    }

    if (!imageBase64) throw new Error("Failed to generate reflection image");

    return {
        quote,
        imageBase64
    };
};
