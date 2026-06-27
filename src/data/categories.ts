import type { EntryType } from "../types";

export interface Category {
  id: string;
  label: string;
  hintType: EntryType;
}

export const categories: Category[] = [
  // Row 1
  { id: "cat-1", label: "入坑作", hintType: "song" },
  { id: "cat-2", label: "最喜欢的", hintType: "song" },
  { id: "cat-3", label: "循环最多", hintType: "song" },
  { id: "cat-4", label: "最推荐", hintType: "song" },
  { id: "cat-5", label: "听的第一首", hintType: "song" },

  // Row 2
  { id: "cat-6", label: "喜欢但大众不爱", hintType: "song" },
  { id: "cat-7", label: "讨厌但大众喜欢", hintType: "song" },
  { id: "cat-8", label: "最被低估", hintType: "song" },
  { id: "cat-9", label: "被高估", hintType: "song" },
  { id: "cat-10", label: "最爱听的P主", hintType: "producer" },

  // Row 3
  { id: "cat-11", label: "最佳PV", hintType: "song" },
  { id: "cat-12", label: "最佳调教", hintType: "song" },
  { id: "cat-13", label: "调的最烂", hintType: "song" },
  { id: "cat-14", label: "最佳伴奏", hintType: "song" },
  { id: "cat-15", label: "最治愈", hintType: "song" },

  // Row 4
  { id: "cat-16", label: "最冷门", hintType: "song" },
  { id: "cat-17", label: "最燃", hintType: "song" },
  { id: "cat-18", label: "最佳歌词", hintType: "song" },
  { id: "cat-19", label: "最有趣", hintType: "song" },
  { id: "cat-20", label: "最搞怪", hintType: "song" },

  // Row 5
  { id: "cat-21", label: "最感动", hintType: "song" },
  { id: "cat-22", label: "最洗脑", hintType: "song" },
  { id: "cat-23", label: "最擦边", hintType: "song" },
  { id: "cat-24", label: "最喜欢的专辑", hintType: "album" },
  { id: "cat-25", label: "期待哪个P的新歌", hintType: "producer" },

  // Row 6
  { id: "cat-26", label: "近期喜欢的歌", hintType: "song" },
  { id: "cat-27", label: "最喜欢的歌姬", hintType: "singer" },
  { id: "cat-28", label: "收藏最多的歌姬", hintType: "singer" },
  { id: "cat-29", label: "外表最萌的歌姬", hintType: "singer" },
  { id: "cat-30", label: "喜欢此歌姬的声音", hintType: "singer" },
];
