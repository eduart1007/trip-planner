export type ChecklistItem = { id: string; text: string; done: boolean };

export type Place = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
  stayMinutes?: number; // how long you stay at this stop (default 30)
  arriveBy?: string; // "HH:MM": the time you want to be here (optional)
  openingHours?: string; // from OpenStreetMap, e.g. "Mo-Fr 09:00-18:00"
  note?: string;
  cost?: number; // budget for this stop
  checklist?: ChecklistItem[];
};
