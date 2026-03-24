import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { defaultPackages, defaultSettings } from "@/lib/compensation";

const DEFAULT_ADMIN_EMAIL = "admin@healthnet.local";
const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";
const defaultProducts = [
  {
    name: "4 in 1 Cardamom Coffee Tea",
    slug: "cardamom-coffee-tea",
    description:
      "A wellness beverage blend designed for everyday vitality and healthy routines.",
    category: "Beverage",
    price: 18,
    imageUrl: "/products/cardamom-tea.svg",
  },
  {
    name: "Herbal Immune Support",
    slug: "herbal-immune-support",
    description:
      "Daily herbal supplement support formulated to strengthen immune wellness.",
    category: "Supplement",
    price: 32,
    imageUrl: "/products/immune-support.svg",
  },
  {
    name: "Ayurveda Vitality Pack",
    slug: "ayurveda-vitality-pack",
    description:
      "A complete vitality package inspired by traditional wellness principles.",
    category: "Ayurveda",
    price: 55,
    imageUrl: "/products/vitality-pack.svg",
  },
  {
    name: "Detox Green Blend",
    slug: "detox-green-blend",
    description: "Detox-focused herbal blend to support a cleaner and lighter routine.",
    category: "Beverage",
    price: 24,
    imageUrl: "/products/detox-green.svg",
  },
  {
    name: "Herbal Skin Care Soap",
    slug: "herbal-skin-care-soap",
    description: "Gentle herbal skin care soap for everyday freshness and comfort.",
    category: "Personal Care",
    price: 14,
    imageUrl: "/products/herbal-soap.svg",
  },
  {
    name: "Therapeutic Herbal Oil",
    slug: "therapeutic-herbal-oil",
    description: "Multi-purpose herbal oil designed for body care and relaxation.",
    category: "Personal Care",
    price: 21,
    imageUrl: "/products/therapeutic-oil.svg",
  },
];

export async function ensureBootstrapData() {
  const settings = await prisma.compensationSetting.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    await prisma.compensationSetting.create({
      data: {
        id: "default",
        referralPercent: defaultSettings.referralPercent,
        binaryPercent: defaultSettings.binaryPercent,
      },
    });
  }

  const packageCount = await prisma.packageTier.count();
  if (packageCount === 0) {
    await prisma.packageTier.createMany({
      data: defaultPackages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        matchingRatios: pkg.matchingRatios,
      })),
    });
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: defaultProducts,
    });
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (!adminUser) {
    const passwordHash = await hash(DEFAULT_ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        name: "HealthNet Admin",
        passwordHash,
        role: "ADMIN",
        referralCode: "HEALTHNETADMIN",
      },
    });
  }

  return {
    defaultAdmin: {
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
    },
  };
}
