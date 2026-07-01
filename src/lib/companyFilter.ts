// Blocks real company names from user posts to reduce defamation / trademark
// risk. Detection is a case-insensitive whole-word scan; we suggest an
// anonymized archetype the user can swap in instead.

const COMPANY_ARCHETYPES: Record<string, string> = {
  // Indian IT services
  tcs: "Tier-1 IT Consultancy",
  "tata consultancy": "Tier-1 IT Consultancy",
  infosys: "Tier-1 IT Consultancy",
  infy: "Tier-1 IT Consultancy",
  wipro: "Legacy Body-Shop Giant",
  hcl: "Legacy Body-Shop Giant",
  hcltech: "Legacy Body-Shop Giant",
  "tech mahindra": "Bangalore Campus Behemoth",
  techm: "Bangalore Campus Behemoth",
  mindtree: "Pune-HQ Outsourcer",
  ltimindtree: "Pune-HQ Outsourcer",
  mphasis: "US-Listed Services Co.",
  cognizant: "US-Listed Services Co.",
  ctsh: "US-Listed Services Co.",
  capgemini: "Legacy Body-Shop Giant",
  accenture: "Tier-1 IT Consultancy",
  // Big 4
  deloitte: "Big 4 Auditor",
  pwc: "Big 4 Auditor",
  "price waterhouse": "Big 4 Auditor",
  ey: "Big 4 Auditor",
  "ernst & young": "Big 4 Auditor",
  kpmg: "Big 4 Auditor",
  // Big tech
  google: "FAANG-adjacent Hyperscaler",
  alphabet: "FAANG-adjacent Hyperscaler",
  meta: "Social Media Behemoth",
  facebook: "Social Media Behemoth",
  instagram: "Social Media Behemoth",
  apple: "Cupertino Hardware Giant",
  amazon: "E-commerce Hyperscaler",
  aws: "E-commerce Hyperscaler",
  microsoft: "Redmond Software Giant",
  msft: "Redmond Software Giant",
  netflix: "Streaming Unicorn",
  stripe: "Fintech Unicorn",
  uber: "Gig-Economy Unicorn",
  ola: "Gig-Economy Unicorn",
  swiggy: "Gig-Economy Unicorn",
  zomato: "Gig-Economy Unicorn",
  flipkart: "E-commerce Hyperscaler",
  paytm: "Fintech Unicorn",
  phonepe: "Fintech Unicorn",
  razorpay: "Fintech Unicorn",
  byju: "Edtech Unicorn",
  byjus: "Edtech Unicorn",
  freshworks: "SaaS Unicorn",
  zoho: "SaaS Unicorn",
  salesforce: "SaaS Behemoth",
  oracle: "Legacy Enterprise Vendor",
  ibm: "Legacy Enterprise Vendor",
  sap: "Legacy Enterprise Vendor",
  goldman: "Bulge-Bracket Bank",
  "jp morgan": "Bulge-Bracket Bank",
  jpmorgan: "Bulge-Bracket Bank",
  morgan_stanley: "Bulge-Bracket Bank",
  "morgan stanley": "Bulge-Bracket Bank",
};

export type CompanyHit = { term: string; suggestion: string };

export function detectCompanyNames(text: string): CompanyHit[] {
  if (!text) return [];
  const hits = new Map<string, string>();
  const lower = text.toLowerCase();
  for (const [term, suggestion] of Object.entries(COMPANY_ARCHETYPES)) {
    // whole-word / phrase boundary match
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (re.test(lower)) hits.set(term, suggestion);
  }
  return [...hits.entries()].map(([term, suggestion]) => ({ term, suggestion }));
}
