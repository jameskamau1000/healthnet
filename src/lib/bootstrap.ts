import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { defaultPackages, defaultSettings } from "@/lib/compensation";

const DEV_FALLBACK_ADMIN_PASSWORD = "ChangeMe123!";

const adminEmail =
  process.env.HEALTHNET_ADMIN_EMAIL?.trim() || "admin@healthnet.local";
const envAdminPassword = process.env.HEALTHNET_ADMIN_PASSWORD?.trim();
const isProd = process.env.NODE_ENV === "production";

/** One bcrypt sync per Node process when HEALTHNET_ADMIN_PASSWORD is set. */
let didApplyEnvAdminPassword = false;

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

async function applyEnvAdminPasswordIfNeeded(): Promise<void> {
  if (!envAdminPassword || didApplyEnvAdminPassword) {
    return;
  }
  const adminRow = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (adminRow) {
    const passwordHash = await hash(envAdminPassword, 10);
    await prisma.user.update({
      where: { id: adminRow.id },
      data: { passwordHash },
    });
  }
  didApplyEnvAdminPassword = true;
}

export async function ensureBootstrapData(): Promise<{
  defaultAdmin: { email: string; password: string } | null;
}> {
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

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const seedPassword =
      envAdminPassword || (!isProd ? DEV_FALLBACK_ADMIN_PASSWORD : "");
    if (seedPassword) {
      const passwordHash = await hash(seedPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Ayur Health Admin",
          passwordHash,
          role: "ADMIN",
          referralCode: "HEALTHNETADMIN",
        },
      });
      if (envAdminPassword) {
        didApplyEnvAdminPassword = true;
      }
    } else if (isProd) {
      console.warn(
        "[Ayur Health] No admin user and HEALTHNET_ADMIN_PASSWORD is not set; create an admin manually or set the env var.",
      );
    }
  }

  if (!didApplyEnvAdminPassword) {
    await applyEnvAdminPasswordIfNeeded();
  }

  const showDevCredentials =
    !isProd && !envAdminPassword && !!(await prisma.user.findUnique({
      where: { email: adminEmail },
    }));

  return {
    defaultAdmin: showDevCredentials
      ? {
          email: adminEmail,
          password: DEV_FALLBACK_ADMIN_PASSWORD,
        }
      : null,
  };
}
