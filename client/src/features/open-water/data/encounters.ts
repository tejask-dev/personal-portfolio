import type { Panel } from "../systems/expeditionController";

export const encounters = [
  { id: "dakota", number: "01", name: "Meet Dakota", place: "Your reef guide", verb: "Follow", icon: "dolphin", panel: "dakota" },
  { id: "fish", number: "02", name: "A little room to swim", place: "Silver shoal", verb: "Approach", icon: "fish", panel: "fish" },
  { id: "reef", number: "03", name: "Below the surface", place: "Crown Reef", verb: "Dive", icon: "reef", panel: null },
  { id: "lighthouse", number: "04", name: "A different lens", place: "The lighthouse", verb: "Align", icon: "lighthouse", panel: null },
  { id: "current", number: "05", name: "Go with the flow", place: "The sand channel", verb: "Drift", icon: "current", panel: null },
  { id: "photo", number: "06", name: "Keep a perspective", place: "Anywhere below", verb: "Frame", icon: "photo", panel: "photo" },
  { id: "camouflage", number: "07", name: "Hiding in plain sight", place: "The western shelf", verb: "Compare", icon: "octopus", panel: "camouflage" },
  { id: "cleaner", number: "08", name: "A useful arrangement", place: "The cleaner station", verb: "Observe", icon: "cleaner", panel: "cleaner" },
  { id: "bearings", number: "09", name: "Find your bearings", place: "Your own map", verb: "Locate", icon: "compass", panel: "bearings" },
  { id: "artifact", number: "10", name: "From input to insight", place: "The harbor workbench", verb: "Inspect", icon: "artifact", panel: "artifact" },
  { id: "radio", number: "11", name: "A channel to Tejass", place: "Harbor radio", verb: "Tune", icon: "radio", panel: "radio" },
  { id: "playground", number: "12", name: "Take the long way", place: "Outer-water playground", verb: "Race", icon: "race", panel: "playground" },
] as const satisfies readonly { id: string; number: string; name: string; place: string; verb: string; icon: string; panel: Panel }[];
export type EncounterId = typeof encounters[number]["id"];
export const reefPlaces = [
  { id: "entry", name: "Dive buoy", x: 20, z: 0, depth: 1.5 },
  { id: "school", name: "Silver shoal", x: -4, z: 7, depth: 3.5 },
  { id: "arch", name: "Limestone arch", x: -3, z: -4, depth: 6.4 },
  { id: "camouflage", name: "Western shelf", x: -15, z: 6, depth: 3.4 },
  { id: "cleaner", name: "Cleaner station", x: 9, z: -8, depth: 4.6 },
  { id: "current", name: "Sand channel", x: -16, z: -6, depth: 3.8 },
] as const;
export const lensStops = [
  { bearing: 65.43, label: "065°", name: "Stellar Learning", slug: "stellar-learning", role: "Former CTO", note: "Free education, supported by a volunteer team. 40,000+ learners reported by Stellar Learning." },
  { bearing: 111.04, label: "111°", name: "Global health research", slug: "global-health-research", role: "Co-author · Student researcher", note: "A 34-country team study, published in the 2025 Youreka Canada Journal and recognized there as the national first-place study." },
  { bearing: 131.19, label: "131°", name: "Anticipy", slug: "anticipy", role: "Founding Software Engineer · Anticipation Labs", note: "An AI wearable being built. My work spans application flows, deployment infrastructure and early operations." },
] as const;
export const contactEmail = "tejas.kaushik@outlook.com";
export const linkedIn = "https://www.linkedin.com/in/tejasskaushik/";
