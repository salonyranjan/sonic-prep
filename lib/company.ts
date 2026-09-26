const logos: Record<string, string> = {
  adobe: "/covers/adobe.png",
  amazon: "/covers/amazon.png",
  facebook: "/covers/facebook.png",
  hostinger: "/covers/hostinger.png",
  pinterest: "/covers/pinterest.png",
  quora: "/covers/quora.png",
  reddit: "/covers/reddit.png",
  skype: "/covers/skype.png",
  spotify: "/covers/spotify.png",
  telegram: "/covers/telegram.png",
  tiktok: "/covers/tiktok.png",
  yahoo: "/covers/yahoo.png",
};

export const companyOptions = Object.keys(logos);

export function getCompanyLogo(company?: string | null) {
  return company ? (logos[company.trim().toLowerCase()] ?? null) : null;
}
