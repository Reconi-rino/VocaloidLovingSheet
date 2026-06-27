import type { Entry, SearchAdapter } from "../../types";
import { seedEntries } from "../../data/seedEntries";
import { searchByType } from "../search";

async function searchSongs(query: string): Promise<Entry[]> {
  return searchByType(query, "song", seedEntries);
}

async function searchProducers(query: string): Promise<Entry[]> {
  return searchByType(query, "producer", seedEntries);
}

async function searchSingers(query: string): Promise<Entry[]> {
  return searchByType(query, "singer", seedEntries);
}

async function searchAlbums(query: string): Promise<Entry[]> {
  return searchByType(query, "album", seedEntries);
}

export const localAdapter: SearchAdapter = {
  name: "local",
  enabled: true,
  searchSongs,
  searchProducers,
  searchSingers,
  searchAlbums,
};
