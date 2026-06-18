const axios = require('axios');

const analyzeSeverity = async (description, serviceCategory) => {
  if (!process.env.OPENROUTER_API_KEY || !description) {
    // Default to level 2 if no description or no API key
    return 2;
  }

  try {
    const systemPrompt = `You are an AI Triage Assessor for a community help platform.
Your job is to analyze a utility or emergency service request and output ONLY a single number representing the severity level (1, 2, 3, or 4).

Severity Levels:
1 - Low (Routine maintenance, minor issues, no immediate risk)
2 - Medium (Important but not immediately life-threatening or causing major damage)
3 - High (Urgent, risk of significant property damage or escalating danger)
4 - Critical (Life-threatening, extreme immediate danger, catastrophic failure)

Service Category: ${serviceCategory}
User Description: "${description}"

Output ONLY a single digit (1, 2, 3, or 4). Nothing else.`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openrouter/free',
      messages: [{ role: 'user', content: systemPrompt }],
      max_tokens: 10,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Community Help Platform AI Dispatch'
      }
    });

    const reply = response.data.choices[0].message.content.trim();
    const score = parseInt(reply.match(/\d+/)?.[0] || '2');
    return isNaN(score) ? 2 : Math.min(Math.max(score, 1), 4);
  } catch (err) {
    console.error('AI Dispatch Error:', err.message);
    return 2;
  }
};

module.exports = { analyzeSeverity };
