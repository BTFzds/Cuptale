import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const recipe = await prisma.recipe.upsert({
    where: { id: "seed-recipe-moon" },
    update: {},
    create: {
      id: "seed-recipe-moon",
      name: "月光低语（内部）",
      ingredients: JSON.stringify([
        { name: "威士忌", ml: 45 },
        { name: "甜苦艾", ml: 20 },
        { name: "安格斯图拉苦精", ml: 2 },
      ]),
      steps: "搅拌至冰镇，滤入岩石杯，橙皮拧香。",
      notes: "演示用。",
    },
  });

  await prisma.drink.upsert({
    where: { id: "seed-drink-moon" },
    update: {
      category: "经典",
      isNonAlcoholic: false,
      isPublished: true,
      isAvailable: true,
    },
    create: {
      id: "seed-drink-moon",
      name: "月光低语",
      category: "经典",
      tagline: "橙皮香 · 微苦回甘",
      flavorText: "炭火熄灭后的一丝暖意，橙皮香轻轻落在舌尖。",
      sweetness: 2,
      acidity: 2,
      strength: 4,
      abvApprox: 28,
      glassType: "岩石杯",
      isNonAlcoholic: false,
      hasDairy: false,
      hasCaffeine: false,
      isPublished: true,
      isAvailable: true,
      recipeId: recipe.id,
      imageUrl: "/brand/offsip-mark.png",
    },
  });

  await prisma.drink.upsert({
    where: { id: "seed-drink-soda" },
    update: {
      category: "碳酸",
      isNonAlcoholic: true,
      isPublished: true,
    },
    create: {
      id: "seed-drink-soda",
      name: "雾巷柚子",
      category: "碳酸",
      tagline: "清爽 · 微酸",
      flavorText: "柚皮清香，舌尖先凉后甜。",
      sweetness: 3,
      acidity: 4,
      strength: 1,
      abvApprox: 0,
      glassType: "高球杯",
      isNonAlcoholic: true,
      hasDairy: false,
      hasCaffeine: false,
      isPublished: true,
      isAvailable: true,
      imageUrl: "/brand/offsip-mark.png",
    },
  });

  await prisma.drink.upsert({
    where: { id: "seed-drink-pause" },
    update: {
      category: "奶制",
      isPublished: true,
      isAvailable: false,
    },
    create: {
      id: "seed-drink-pause",
      name: "雾巷拿铁",
      category: "奶制",
      tagline: "奶香",
      flavorText: "奶香与咖啡，今晚暂停供应。",
      sweetness: 4,
      acidity: 1,
      strength: 2,
      abvApprox: 12,
      glassType: "高球杯",
      isNonAlcoholic: false,
      hasDairy: true,
      hasCaffeine: true,
      allergens: "乳制品",
      isPublished: true,
      isAvailable: false,
      imageUrl: "/brand/offsip-mark.png",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
