export interface PresetSize {
  key: string;
  label: string;
  w: number;
  h: number;
}

export interface PresetSizeGroup {
  category: string;
  sizes: PresetSize[];
}

export const PRESET_SIZE_GROUPS: PresetSizeGroup[] = [
  {
    category: "Banner Ads",
    sizes: [
      { key: "halfPageAd", label: "Half Page Ad (Double MREC)", w: 300, h: 600 },
      { key: "leaderboard", label: "Leaderboard", w: 728, h: 90 },
      { key: "mediumRectangle", label: "Medium Rectangle (MREC)", w: 300, h: 250 },
      { key: "mobileLeaderboard", label: "Mobile Leaderboard", w: 320, h: 50 },
      { key: "wideSkyscraper", label: "Wide Skyscraper", w: 160, h: 600 },
      { key: "square", label: "Square", w: 250, h: 250 },
      { key: "inlineRectangle", label: "Inline Rectangle", w: 450, h: 90 },
      { key: "largeRectangle", label: "Large Rectangle", w: 336, h: 280 },
      { key: "largeLeaderboard", label: "Large Leaderboard", w: 970, h: 90 },
      { key: "mobileFullScreen", label: "Mobile Full Screen", w: 320, h: 480 },
      { key: "googleAd", label: "Google Ad", w: 450, h: 405 },
    ],
  },
  {
    category: "Social — Facebook",
    sizes: [
      { key: "fbTimeline", label: "Timeline / News Feed", w: 1200, h: 630 },
      { key: "fbEventCover", label: "Event Cover", w: 1200, h: 628 },
      { key: "fbAd", label: "Ad / Post (Square)", w: 1080, h: 1080 },
      { key: "fbStory", label: "Story", w: 1080, h: 1920 },
      { key: "fbCoverPhoto", label: "Page Cover", w: 851, h: 315 },
      { key: "fbCarouselPhoto", label: "Carousel Image", w: 1200, h: 1200 },
      { key: "fbEventImage", label: "Event Image", w: 1920, h: 1005 },
    ],
  },
  {
    category: "Social — Instagram",
    sizes: [
      { key: "igPost", label: "Post", w: 1080, h: 1080 },
      { key: "igStory", label: "Story", w: 1080, h: 1920 },
      { key: "igLandscapePhoto", label: "Landscape Photo", w: 1080, h: 566 },
      { key: "igPortraitPhoto", label: "Portrait Photo", w: 1080, h: 1350 },
      { key: "igtvCoverPhoto", label: "IGTV Cover Photo", w: 420, h: 654 },
    ],
  },
  {
    category: "Social — Twitter",
    sizes: [
      { key: "twCard", label: "Image", w: 1200, h: 675 },
      { key: "twWebsiteCard", label: "Website / Ad Card", w: 800, h: 418 },
      { key: "twCoverPhoto", label: "Cover Photo", w: 1500, h: 500 },
    ],
  },
  {
    category: "Social — LinkedIn",
    sizes: [
      { key: "liCompanyCover", label: "Company Page Cover", w: 1128, h: 191 },
      { key: "liLinkPost", label: "Shared Link / Post", w: 1200, h: 627 },
      { key: "liSharedImage", label: "Shared Image Square", w: 1200, h: 1200 },
      { key: "liLifeTabMainImage", label: "Life Tab Main Image", w: 1128, h: 376 },
      { key: "liLifeTabCompanyImage", label: "Life Tab Company Image", w: 900, h: 600 },
    ],
  },
  {
    category: "Social — Other",
    sizes: [
      { key: "gmbCoverPhoto", label: "Google My Business Cover Photo", w: 1024, h: 576 },
      { key: "gmbPostImage", label: "Google My Business Post Image", w: 1200, h: 900 },
      { key: "snapchatImage", label: "Snapchat Ad Image", w: 1080, h: 1920 },
      { key: "youtubeChannelCover", label: "YouTube Channel Cover Photo", w: 2048, h: 1152 },
      { key: "youtubeThumbnail", label: "YouTube Thumbnail", w: 1280, h: 720 },
      { key: "tiktokVideoImage", label: "TikTok Video Image", w: 1080, h: 1920 },
    ],
  },
  {
    category: "Video",
    sizes: [
      { key: "fbVideoLandscape", label: "Facebook Video Post", w: 1280, h: 720 },
      { key: "fbVideoPortrait", label: "Facebook Video Post (Portrait)", w: 720, h: 1280 },
      { key: "igFeedSquare", label: "Instagram In-Feed (Square)", w: 1080, h: 1080 },
      { key: "igFeedLandscape", label: "Instagram In-Feed (Landscape)", w: 1920, h: 1080 },
      { key: "igFeedPortrait", label: "Instagram In-Feed (Portrait)", w: 1080, h: 1920 },
      { key: "sd720p", label: "SD (720p)", w: 1280, h: 720 },
      { key: "hd1080p", label: "HD (1080p)", w: 1920, h: 1080 },
      { key: "qhd2k", label: "QHD (2K)", w: 2560, h: 1440 },
      { key: "uhd4k", label: "UHD (4K)", w: 3840, h: 2160 },
    ],
  },
  {
    category: "Website",
    sizes: [
      { key: "webBannerLarge", label: "Banner — Large", w: 1820, h: 375 },
      { key: "webBannerXLarge", label: "Banner — X-Large", w: 2020, h: 575 },
      { key: "webMastheadSmall", label: "Masthead — Small", w: 830, h: 500 },
      { key: "webMastheadMedium", label: "Masthead — Medium", w: 1030, h: 700 },
      { key: "webMastheadLarge", label: "Masthead — Large", w: 1820, h: 550 },
      { key: "webMastheadXLarge", label: "Masthead — X-Large", w: 2020, h: 750 },
    ],
  },
  {
    category: "Email",
    sizes: [
      { key: "emailDesktop", label: "Desktop", w: 650, h: 650 },
      { key: "emailMobile", label: "Mobile", w: 375, h: 700 },
    ],
  },
  {
    category: "Audio",
    sizes: [{ key: "audioPreset", label: "Audio Preset", w: 1280, h: 720 }],
  },
  {
    category: "Paper (mm)",
    sizes: [
      { key: "a0Portrait", label: "A0", w: 841, h: 1189 },
      { key: "a1Portrait", label: "A1", w: 594, h: 841 },
      { key: "a2Portrait", label: "A2", w: 420, h: 594 },
      { key: "a3Portrait", label: "A3", w: 297, h: 420 },
      { key: "a4Portrait", label: "A4", w: 210, h: 297 },
      { key: "a5Portrait", label: "A5", w: 148, h: 210 },
      { key: "a6Portrait", label: "A6", w: 105, h: 148 },
      { key: "a7Portrait", label: "A7", w: 74, h: 105 },
      { key: "a8Portrait", label: "A8", w: 52, h: 74 },
      { key: "b5Portrait", label: "B5 Portrait", w: 182, h: 257 },
      { key: "dl", label: "DL", w: 100, h: 210 },
      { key: "usLetterPortrait", label: "US Letter Portrait", w: 8.5, h: 11 },
      { key: "usLetterLandscape", label: "US Letter Landscape", w: 11, h: 8.5 },
    ],
  },
  {
    category: "Newspaper (mm)",
    sizes: [
      { key: "ttFullPage", label: "Full Page (Tall Tabloid)", w: 262, h: 360 },
      { key: "ttHalfPage", label: "Half Page (Tall Tabloid)", w: 262, h: 174.6 },
      { key: "ttStrip", label: "Strip (Tall Tabloid)", w: 262, h: 113 },
      { key: "ttQuarterPageHorizontal", label: "Quarter Page Horizontal (Tall Tabloid)", w: 117.5, h: 88.9 },
      { key: "ttSixthPageVertical", label: "Sixth Page Vertical (Tall Tabloid)", w: 85.7, h: 120.7 },
      { key: "ttT24", label: "ACM T84: T24 (Tall Tabloid)", w: 260, h: 92 },
      { key: "ttT44", label: "ACM T84: T44 (Tall Tabloid)", w: 260, h: 186 },
      { key: "ctFullPage", label: "Full Page (Compact Tabloid)", w: 262, h: 266.7 },
      { key: "ctHalfPage", label: "Half Page (Compact Tabloid)", w: 262, h: 130.7 },
    ],
  },
  {
    category: "Out-of-Home (mm)",
    sizes: [
      { key: "oohBillboard", label: "Billboard (output 20×10m)", w: 1000, h: 500 },
      { key: "oohRollUp", label: "Roll Up (output 850×2000mm)", w: 425, h: 1000 },
    ],
  },
];
