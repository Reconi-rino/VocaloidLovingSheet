import type { Entry, SearchAdapter } from "../../types";
import { loadCustomEntries } from "../storage";
import { searchByType } from "../search";

async function searchSongs(query: string): Promise<Entry[]> {
  return searchByType(query, "song", loadCustomEntries());
}

async function searchProducers(query: string): Promise<Entry[]> {
  return searchByType(query, "producer", loadCustomEntries());
}

async function searchSingers(query: string): Promise<Entry[]> {
  return searchByType(query, "singer", loadCustomEntries());
}

async function searchAlbums(query: string): Promise<Entry[]> {
  return searchByType(query, "album", loadCustomEntries());
}

export const customEntryAdapter: SearchAdapter = {
  name: "custom-entry",
  enabled: true,
  searchSongs,
  searchProducers,
  searchSingers,
  searchAlbums,
};
