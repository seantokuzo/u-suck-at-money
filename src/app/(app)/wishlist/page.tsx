import { getWishlistItems, getWishlistSummary } from "@/db/queries/wishlist";
import { getCategories } from "@/db/queries/categories";
import { WishlistClient } from "./wishlist-client";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const [items, summary, categories] = await Promise.all([
    getWishlistItems(),
    getWishlistSummary(),
    getCategories(),
  ]);

  return (
    <WishlistClient
      initialData={{
        items,
        summary,
        categories,
      }}
    />
  );
}
