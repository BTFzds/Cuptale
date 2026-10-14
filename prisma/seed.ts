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
      notes: "演示用配方，勿对外展示。",
    },
  });

  await prisma.drink.upsert({
    where: { id: "seed-drink-moon" },
    update: {},
    create: {
      id: "seed-drink-moon",
      name: "月光低语",
      flavorText:
        "炭火熄灭后的一丝暖意，橙皮香轻轻落在舌尖。不喧哗，只陪你把夜晚慢慢喝完。",
      sweetness: 2,
      acidity: 2,
      strength: 4,
      abvApprox: 28,
      glassType: "岩石杯",
      hasDairy: false,
      hasCaffeine: false,
      allergens: "",
      isPublished: true,
      isAvailable: true,
      recipeId: recipe.id,
      imageUrl: "/brand/offsip-logo.jpg",
    },
  });

  await prisma.drink.upsert({
    where: { id: "seed-drink-pause" },
    update: {},
    create: {
      id: "seed-drink-pause",
      name: "雾巷拿铁（示例暂停）",
      flavorText: "奶香与咖啡的巷口重逢，今晚暂歇供应。",
      sweetness: 4,
      acidity: 1,
      strength: 2,
      abvApprox: 12,
      glassType: "高球杯",
      hasDairy: true,
      hasCaffeine: true,
      allergens: "乳制品",
      isPublished: true,
      isAvailable: false,
      imageUrl: "/brand/offsip-logo.jpg",
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
