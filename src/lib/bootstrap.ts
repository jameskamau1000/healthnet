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
    name: "Wonder Plus",
    slug: "wonder-plus",
    description:
      "Herbal health supplement enriched with tulsi and aloe vera for daily wellness support.",
    category: "Supplement",
    price: 35,
    imageUrl: "/products/wonder-plus.png",
  },
  {
    name: "Restorer",
    slug: "restorer",
    description:
      "Herbal capsules formulated for male vitality and restorative support.",
    category: "Supplement",
    price: 38,
    imageUrl: "/products/restorer.png",
  },
  {
    name: "Varico Solve",
    slug: "varico-solve",
    description:
      "Ayurvedic proprietary medicine developed to support varicose-vein wellness.",
    category: "Ayurveda",
    price: 40,
    imageUrl: "/products/varico-solve.png",
  },
  {
    name: "Artho Plus",
    slug: "artho-plus",
    description: "Herbal tablets crafted for joint comfort and mobility support.",
    category: "Tablet",
    price: 36,
    imageUrl: "/products/artho-plus.png",
  },
  {
    name: "Nutri Cell",
    slug: "nutri-cell",
    description: "Herbal health supplement for daily nutrition and cellular vitality.",
    category: "Supplement",
    price: 34,
    imageUrl: "/products/nutri-cell.png",
  },
  {
    name: "Eye Care",
    slug: "eye-care",
    description: "Herbal capsule blend to support optic-nerve strength and eyesight wellness.",
    category: "Capsule",
    price: 30,
    imageUrl: "/products/eye-care.png",
  },
  {
    name: "Gastroplus",
    slug: "gastroplus",
    description: "Ayurvedic capsule formula for gastric and peptic-ulcer support.",
    category: "Capsule",
    price: 32,
    imageUrl: "/products/gastroplus.png",
  },
  {
    name: "IQ Plus",
    slug: "iq-plus",
    description: "Brain-tonic tablets enriched for focus, clarity, and cognitive support.",
    category: "Tablet",
    price: 33,
    imageUrl: "/products/iq-plus.png",
  },
  {
    name: "Pain Solve Oil",
    slug: "pain-solve-oil",
    description: "Pain-relief oil for joint and muscle mobility support.",
    category: "Oil",
    price: 29,
    imageUrl: "/products/pain-solve-oil.png",
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
