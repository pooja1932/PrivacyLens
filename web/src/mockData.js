/**
 * mockData.js — Person 3 Domain
 * Realistic fallback dataset used when the backend API is unreachable
 * (e.g. standalone leaderboard demo, Vercel preview with no backend).
 */

export const MOCK_STATS = {
  total_analyzed: 10,
  average_trust_score: 66.9,
  percent_selling_data: 30.0,
};

export const MOCK_LEADERBOARD = [
  {
    domain: "github.com",
    final_trust_score: 85,
    grade: "A",
    deterministic_metrics: { transparency_score: 90, vague_phrases_count: 2, word_count: 5600 },
    ai_structured_insights: {
      data_sold: "NO",
      key_data_types: ["Username", "Email", "Repository Activity", "IP Address"],
      third_party_sharing: ["Microsoft services", "Analytics providers"],
      retention_period: "Until account deletion; 90-day log retention",
      key_risks: [
        "Public repository data is accessible globally and may be indexed",
        "Integration with Microsoft services means cross-platform profiling",
      ],
      user_rights: ["Right to access and download all data", "Right to delete account"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "stackoverflow.com",
    final_trust_score: 83,
    grade: "A",
    deterministic_metrics: { transparency_score: 87, vague_phrases_count: 3, word_count: 4300 },
    ai_structured_insights: {
      data_sold: "NO",
      key_data_types: ["Username", "Email", "Post Activity", "Cookies"],
      third_party_sharing: ["Advertising partners", "Analytics providers"],
      retention_period: "30 days after deletion; public posts remain",
      key_risks: [
        "All public posts remain permanently after account deletion",
        "Email used for targeted job board advertising",
      ],
      user_rights: ["Right to export personal data", "Right to delete account"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "instructure.com",
    final_trust_score: 81,
    grade: "A",
    deterministic_metrics: { transparency_score: 88, vague_phrases_count: 3, word_count: 7500 },
    ai_structured_insights: {
      data_sold: "NO",
      key_data_types: ["Name", "Email", "Course Activity", "Grades"],
      third_party_sharing: ["Institutional administrators", "Accessibility tool providers"],
      retention_period: "Per institutional agreement (typically 5 years)",
      key_risks: ["Data retention controlled by institution, not the student"],
      user_rights: ["FERPA rights apply through institution", "Right to request data correction"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "duolingo.com",
    final_trust_score: 77,
    grade: "B",
    deterministic_metrics: { transparency_score: 82, vague_phrases_count: 4, word_count: 4800 },
    ai_structured_insights: {
      data_sold: "NO",
      key_data_types: ["Email", "Learning Progress", "Device Info", "In-App Purchases"],
      third_party_sharing: ["Analytics providers", "App store platforms"],
      retention_period: "Until account deletion",
      key_risks: [
        "Learning behavior data used for internal AI model training",
        "Children's data collected under COPPA provisions",
      ],
      user_rights: ["Right to delete account and data", "Right to opt-out of promotional emails"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "notion.so",
    final_trust_score: 72,
    grade: "B",
    deterministic_metrics: { transparency_score: 80, vague_phrases_count: 4, word_count: 4200 },
    ai_structured_insights: {
      data_sold: "NO",
      key_data_types: ["Email", "Usage Data", "Device Info", "Cookies"],
      third_party_sharing: ["Analytics providers", "Cloud infrastructure"],
      retention_period: "Until account deletion",
      key_risks: [
        "Shares usage analytics with unnamed third parties",
        "IP address logged indefinitely for security",
      ],
      user_rights: ["Right to delete account and data", "Right to export data"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "coursera.org",
    final_trust_score: 68,
    grade: "C",
    deterministic_metrics: { transparency_score: 78, vague_phrases_count: 5, word_count: 6100 },
    ai_structured_insights: {
      data_sold: "UNCLEAR",
      key_data_types: ["Name", "Email", "Course Progress", "Assessment Scores", "Payment Info"],
      third_party_sharing: ["University partners", "Employers (via certificates)"],
      retention_period: "7 years after last activity",
      key_risks: [
        "Assessment data shared with university partners",
        "Vague language around employer data-sharing",
      ],
      user_rights: ["Right to access course records", "GDPR rights for EU users"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "quizlet.com",
    final_trust_score: 61,
    grade: "C",
    deterministic_metrics: { transparency_score: 75, vague_phrases_count: 5, word_count: 5100 },
    ai_structured_insights: {
      data_sold: "UNCLEAR",
      key_data_types: ["Email", "Study Content", "Device Info", "Location Data"],
      third_party_sharing: ["Analytics providers", "Payment processors", "Advertising networks"],
      retention_period: "90 days after account deletion",
      key_risks: [
        "Vague language around ad-targeting partnerships",
        "Study content may train internal AI models",
      ],
      user_rights: ["Right to access personal data", "Right to delete account"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "discord.com",
    final_trust_score: 55,
    grade: "D",
    deterministic_metrics: { transparency_score: 70, vague_phrases_count: 6, word_count: 8200 },
    ai_structured_insights: {
      data_sold: "NO",
      key_data_types: ["Username", "Email", "Voice Data", "Message Content", "IP Address"],
      third_party_sharing: ["Advertising partners", "Analytics providers", "Law enforcement"],
      retention_period: "Messages retained indefinitely; account data 30 days after deletion",
      key_risks: [
        "Message content stored indefinitely even after account deletion",
        "IP address retained for fraud detection",
      ],
      user_rights: ["Right to request data export", "Right to delete account"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "spotify.com",
    final_trust_score: 49,
    grade: "D",
    deterministic_metrics: { transparency_score: 65, vague_phrases_count: 7, word_count: 9300 },
    ai_structured_insights: {
      data_sold: "YES",
      key_data_types: ["Listening History", "Location", "Payment Info", "Voice Commands"],
      third_party_sharing: ["Record labels", "Advertising partners", "Data analytics companies"],
      retention_period: "5 years after account closure",
      key_risks: [
        "Listening history and musical taste sold to record labels",
        "Location data collected even when app is in background",
      ],
      user_rights: ["Right to access data", "GDPR rights for EU users"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
  {
    domain: "chegg.com",
    final_trust_score: 38,
    grade: "F",
    deterministic_metrics: { transparency_score: 60, vague_phrases_count: 8, word_count: 6800 },
    ai_structured_insights: {
      data_sold: "YES",
      key_data_types: ["Name", "Email", "Academic History", "Payment Info", "Browsing Data"],
      third_party_sharing: ["Advertising networks", "Data brokers", "Academic partners"],
      retention_period: "Not Specified",
      key_risks: [
        "Data explicitly sold to third-party advertisers",
        "Academic history shared with unspecified partners",
        "No clear data deletion process described",
      ],
      user_rights: ["Right to opt-out of targeted advertising (CCPA)"],
    },
    analyzed_at: "2026-11-03T02:00:00Z",
    cached: true,
  },
];
