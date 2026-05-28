export interface Company {
  id: string; // Supabase primary key

  // Section 1 - Company Overview
  name: string;
  short_name: string;
  logo_url: string;
  category: string;
  incorporation_year: number;
  nature_of_company: string;
  headquarters_address: string;
  operating_countries: string;
  office_count: number;
  office_location: string;
  employee_size: string;
  overview_text: string;
  history_timeline: string;
  recent_news: string;

  // Section 2 - Business & Market
  pain_points_addressed: string;
  focus_sectors: string;
  offerings_descriptions: string;
  top_customers: string;
  core_value_proposition: string;
  unique_differentiators: string;
  competitive_advantages: string;
  weaknesses_gaps: string;
  key_challenges_needs: string;
  key_competitors: string;
  tam: string;
  sam: string;
  som: string;

  // Section 3 - Culture, People and Work
  work_culture_summary: string;
  hiring_velocity: string;
  employee_turnover: string;
  avg_retention_tenure: string;
  manager_quality: string;
  psychological_safety: string;
  feedback_culture: string;
  diversity_metrics: string;
  diversity_inclusion_score: string;
  ethical_standards: string;
  layoff_history: string;
  burnout_risk: string;
  mission_clarity: string;

  // Section 4 - Learning, Growth & Career Signal
  training_spend: string;
  onboarding_quality: string;
  learning_culture: string;
  exposure_quality: string;
  mentorship_availability: string;
  internal_mobility: string;
  promotion_clarity: string;
  tools_access: string;
  role_clarity: string;
  early_ownership: string;
  work_impact: string;
  execution_thinking_balance: string;
  automation_level: string;
  cross_functional_exposure: string;
  exit_opportunities: string;
  skill_relevance: string;
  network_strength: string;
  global_exposure: string;
  external_recognition: string;

  // Section 5 - Compensation & Lifestyle
  fixed_vs_variable_pay: string;
  bonus_predictability: string;
  esops_incentives: string;
  family_health_insurance: string;
  relocation_support: string;
  leave_policy: string;
  health_support: string;

  // Section 6 - Work Logistics & Safety
  remote_policy_details: string;
  typical_hours: string;
  overtime_expectations: string;
  weekend_work: string;
  flexibility_level: string;
  location_centrality: string;
  public_transport_access: string;
  cab_policy: string;
  airport_commute_time: string;
  office_zone_type: string;
  area_safety: string;
  safety_policies: string;
  infrastructure_safety: string;
  emergency_preparedness: string;

  // Section 7 - Financials, Risk & Stability
  annual_revenue: string;
  annual_profit: string;
  revenue_mix: string;
  valuation: string;
  yoy_growth_rate: string;
  profitability_status: string;
  key_investors: string;
  recent_funding_rounds: string;
  total_captial_raised: string;
  burn_rate: string;
  runway_months: string;
  burn_multiplier: string;
  esg_ratings: string;
  geopolitical_risks: string;
  macros_risks: string;

  // Section 8 - Technology & Innovations
  tech_stack: string;
  technology_partners: string;
  intellectual_property: string;
  r_and_d_investment: string;
  ai_ml_adoption_posture: string;
  cybersecurity_posture: string;
  innovation_roadmap: string;
  product_pipeline: string;
  tech_adoption_rating: string;
  partnership_ecosystem: string;

  // Section 9 - Leadership & Contacts
  ceo_name: string;
  ceo_linkedin_url: string;
  key_leaders: string;
  board_members: string;
  warm_intro_pathways: string;
  decision_maker_access: string;
  primary_contact_email: string;
  primary_phone_number: string;
  contact_person_name: string;

  // Section 10 - Brand & Digital Presence
  website_url: string;
  website_quality: string;
  website_rating: string;
  website_traffic_rank: string;
  social_media_followers: string;
  glassdoor_rating: string;
  indeed_rating: string;
  google_rating: string;
  linkedin_url: string;
  twitter_handle: string;
  facebook_url: string;
  instagram_url: string;
  marketing_video_url: string;
  customer_testimonials: string;
  awards_recognitions: string;
  brand_sentiment_score: string;
  event_participation: string;
}

export type CompanyField = keyof Company;

export interface FilterOptions {
  category?: string;
  focus_sectors?: string;
  employee_size?: string;
  profitability_status?: string;
  remote_policy_details?: string;
  hiring_velocity?: string;
}

export interface SortOption {
  field: CompanyField;
  direction: 'asc' | 'desc';
}
