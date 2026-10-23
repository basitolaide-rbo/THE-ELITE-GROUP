// ELITE PREMIER LEAGUE - site settings.
// The site finds its own GitHub repo from its address (USERNAME.github.io/REPO). Nothing to fill in.
// Opened from a computer folder or localhost it runs in DEMO MODE (data kept only in that browser).

export const GITHUB = { owner: "", repo: "", branch: "main", path: "data.json" };

// Shown in the admin panel.
export const ADMIN_EMAIL = "solomonoladimeji18@gmail.com";

export const LEAGUE = {
  name: "Elite Premier League",
  season: "2026",
  playersPerTeam: 8,
  matchMinutes: 63,
  matchSeconds: 45,
  timezone: "Africa/Lagos"
};

// Optional: put each team's player names here (up to 8 per team) and the admin gets a one-click
// "Load starting squads" button on the Squads tab. Team ids: mun ars che liv mci rma bar bay.
export const STARTING_SQUADS = {
  mun: ["Baleba (C)", "Cubrasi", "Bush", "Adebayo", "Ope", "Rico", "Tee-Jay", "Lumi"],
  ars: ["Kenny", "Baashh", "Bayern (C)", "Baron Finest", "Mr Denis", "Showon", "Mr Tolu", "Ozil"],
  // che: [ ... ]   Chelsea: names not received yet
  liv: ["Ori Owo", "Oluwatosin", "Pepe", "Friz", "SHK", "HMD", "Coded", "Flawless"],
  mci: ["Cash (C)", "Kelvin", "Kusa", "Wolfgang", "Sam Dee", "Wizzy", "Gucci", "Papi"],
  rma: ["Walex Bnxn (C)", "Kenny", "King", "Flames", "Sheriff", "Seun", "Bidemi", "Deji"],
  // bar: [ ... ]   Barcelona: names not received yet
  bay: ["Jolex", "Tee Smart", "Don Lilpent", "Dada", "Soft", "Boko Haram", "Maka", "AY Promo"]
};
