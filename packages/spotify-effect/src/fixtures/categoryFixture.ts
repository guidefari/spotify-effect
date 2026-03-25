import type { Category, Paging } from "../model/SpotifyObjects";

export const categoryFixture: Category = {
  href: "https://api.spotify.com/v1/browse/categories/toplists",
  icons: [
    {
      height: 275,
      url: "https://datsnxq1rwndn.cloudfront.net/media/derived/toplists_11160599e6a04ac5d6f2757f5511571fe1c3e093.jpg",
      width: 275,
    },
  ],
  id: "toplists",
  name: "Top Lists",
};

export const getCategoriesFixture = {
  categories: {
    href: "https://api.spotify.com/v1/browse/categories?offset=0&limit=20",
    items: [categoryFixture],
    limit: 20,
    next: null,
    offset: 0,
    previous: null,
    total: 1,
  } satisfies Paging<Category>,
};
