import { heuristicParseRecipeNote } from "../src/lib/ai-recipe";
import { stringifyImageUrls, stringifyIngredients } from "../src/lib/ingredients";
import { PrismaClient } from "@prisma/client";

const text = `2026.10.18初恋
朗姆酒25ml 西柚味水溶c 150ml 葡萄气泡水加满`;

async function main() {
  const draft = heuristicParseRecipeNote(text);
  const prisma = new PrismaClient();
  const imageUrl = "/uploads/first-love-sample.jpg";
  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: draft.name,
        imageUrl,
        imageUrls: stringifyImageUrls([imageUrl]),
        ingredients: stringifyIngredients(draft.ingredients),
        steps: draft.steps,
        notes: draft.notes,
      },
    });
    console.log(
      JSON.stringify(
        {
          id: recipe.id,
          name: recipe.name,
          ingredients: draft.ingredients,
          steps: draft.steps,
          taste: draft.taste,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
