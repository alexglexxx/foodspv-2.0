import admin from "firebase-admin";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "foodspv-14829";
const TENANT_ID = "tacos-lupita-demo";
const TENANT_NAME = "Tacos Lupita Demo";
const TENANT_ADMIN_EMAIL =
  process.env.FOODSPV_GOLDEN_ADMIN_EMAIL ||
  "tacos-lupita-demo-admin@example.com";
const AUTHORIZED_WHATSAPP_PHONES = (
  process.env.FOODSPV_GOLDEN_AUTHORIZED_PHONES || ""
)
  .split(",")
  .map((phone) => phone.replace(/\D/g, ""))
  .filter((phone) => phone.length > 0);

if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const auth = admin.auth();

function getEnvOrDefault(name, fallback) {
  const value = process.env[name];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function generateTenantUrl(tenantId) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (typeof baseUrl === "string" && baseUrl.trim().length > 0) {
    return `${baseUrl.replace(/\/$/, "")}/${tenantId}`;
  }

  return `/${tenantId}`;
}

function createDemoPassword() {
  return `Lupita-${randomBytes(6).toString("hex")}`;
}

const tenantRecord = {
  tenantId: TENANT_ID,
  slug: TENANT_ID,
  name: TENANT_NAME,
  category: "tacos",
  featuredCategory: "Tacos",
  visualPresetId: "fresh",
  designPresetId: "tacos-clasico",
  description:
    "Taquería demo con menú moderno, bebidas, extras y flujo completo para validar FoodSPV.",
  greeting: "Bienvenido a Tacos Lupita Demo 🌮",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta Demo",
  heroImageUrl:
    "https://images.unsplash.com/photo-1613514785940-daed07799d9b?q=80&w=1400&auto=format&fit=crop",
  whatsappPhone: getEnvOrDefault(
    "FOODSPV_GOLDEN_WHATSAPP_PHONE",
    "523221110108"
  ).replace(/\D/g, ""),
  metaPhoneNumberId: getEnvOrDefault(
    "FOODSPV_GOLDEN_META_PHONE_NUMBER_ID",
    "123456789012345"
  ),
  metaAccessToken: getEnvOrDefault(
    "FOODSPV_GOLDEN_META_ACCESS_TOKEN",
    "demo_meta_access_token_change_me_before_live_1234567890"
  ),
  rating: "4.9",
  reviews: "128",
  active: true,
  status: "active",
  orderFlowMode: "simple_whatsapp",
  estimatedPreparationMinutes: 18,
  orderConfirmationPolicy: {
    enabled: false,
    amountThreshold: 1,
    action: "allow",
  },
  deliveryConfig: {
    enabled: false,
    fee: 0,
    minimumOrder: 0,
    notes: "",
  },
  deliveryEnabled: false,
  deliveryFee: 0,
  ...(AUTHORIZED_WHATSAPP_PHONES.length > 0
    ? { authorizedWhatsappPhones: AUTHORIZED_WHATSAPP_PHONES }
    : {}),
};

const products = [
  {
    id: "taco-pastor",
    name: "Taco al pastor",
    description: "Tortilla recién calentada con pastor, cebolla, cilantro y piña.",
    price: 24,
    category: "Tacos",
    imageUrl:
      "https://images.unsplash.com/photo-1624300629298-e9de39c13be5?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [
      {
        id: "tortilla",
        name: "Tortilla",
        type: "single",
        required: true,
        values: [
          { id: "maiz", label: "Maíz", active: true },
          { id: "harina", label: "Harina", active: true },
        ],
      },
      {
        id: "salsa",
        name: "Salsa",
        type: "single",
        required: false,
        values: [
          { id: "verde", label: "Verde", active: true },
          { id: "roja", label: "Roja", active: true },
          { id: "sin-salsa", label: "Sin salsa", active: true },
        ],
      },
    ],
  },
  {
    id: "taco-asada",
    name: "Taco de asada",
    description: "Carne asada al momento con cebolla, cilantro y limón.",
    price: 28,
    category: "Tacos",
    imageUrl:
      "https://images.unsplash.com/photo-1604467715878-83e57e8bc129?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [],
  },
  {
    id: "taco-campechano",
    name: "Taco campechano",
    description: "Mezcla de asada y chorizo para quien quiere de todo un poco.",
    price: 30,
    category: "Tacos",
    imageUrl:
      "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [],
  },
  {
    id: "quesadilla-grande",
    name: "Quesadilla grande",
    description: "Quesadilla en harina con queso y carne a elegir.",
    price: 72,
    category: "Extras",
    imageUrl:
      "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [
      {
        id: "proteina",
        name: "Proteína",
        type: "single",
        required: true,
        values: [
          { id: "pastor", label: "Pastor", active: true },
          { id: "asada", label: "Asada", active: true },
          { id: "chorizo", label: "Chorizo", active: true },
        ],
      },
      {
        id: "extra-queso",
        name: "Extra queso",
        type: "single",
        required: false,
        values: [
          { id: "normal", label: "Normal", active: true },
          { id: "extra", label: "Sí +$12", priceDelta: 12, active: true },
        ],
      },
    ],
  },
  {
    id: "papas-especiales",
    name: "Papas especiales",
    description: "Papas a la francesa con queso, tocino y aderezo.",
    price: 84,
    category: "Extras",
    imageUrl:
      "https://images.unsplash.com/photo-1576107232684-1279f390859f?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [],
  },
  {
    id: "salsa-verde-litro",
    name: "Salsa verde 250ml",
    description: "Salsa verde tatemada para llevar a casa.",
    price: 18,
    category: "Salsas",
    imageUrl:
      "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [],
  },
  {
    id: "salsa-roja-litro",
    name: "Salsa roja 250ml",
    description: "Salsa roja picosita para acompañar tacos y quesadillas.",
    price: 18,
    category: "Salsas",
    imageUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [],
  },
  {
    id: "refresco-600",
    name: "Refresco 600ml",
    description: "Botella fría para acompañar tus tacos.",
    price: 25,
    category: "Bebidas",
    imageUrl:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [
      {
        id: "sabor",
        name: "Sabor",
        type: "single",
        required: true,
        values: [
          { id: "coca-cola", label: "Coca-Cola", active: true },
          { id: "fanta", label: "Fanta", active: true },
          { id: "sprite", label: "Sprite", active: true },
          { id: "manzanita", label: "Manzanita", active: true },
        ],
      },
    ],
  },
  {
    id: "agua-fresca",
    name: "Agua fresca grande",
    description: "Agua fresca del día en vaso grande.",
    price: 32,
    category: "Bebidas",
    imageUrl:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [
      {
        id: "sabor",
        name: "Sabor",
        type: "single",
        required: true,
        values: [
          { id: "jamaica", label: "Jamaica", active: true },
          { id: "horchata", label: "Horchata", active: true },
          { id: "tamarindo", label: "Tamarindo", active: true },
        ],
      },
    ],
  },
  {
    id: "flan-casero",
    name: "Flan casero",
    description: "Postre individual para cerrar con algo dulce.",
    price: 36,
    category: "Postres",
    imageUrl:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1200&auto=format&fit=crop",
    active: true,
    available: true,
    options: [],
  },
];

async function upsertTenant() {
  const tenantRef = db.collection("tenants").doc(TENANT_ID);
  const publicUrl = generateTenantUrl(TENANT_ID);
  const qrCode = await QRCode.toDataURL(publicUrl);

  await tenantRef.set(
    {
      ...tenantRecord,
      publicUrl,
      qrCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    tenantRef,
    publicUrl,
  };
}

async function upsertProducts(tenantRef) {
  for (const product of products) {
    await tenantRef.collection("products").doc(product.id).set(
      {
        tenantId: TENANT_ID,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        images: [],
        active: product.active,
        available: product.available,
        options: product.options,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertTenantAdminUser() {
  const providedPassword = process.env.FOODSPV_GOLDEN_ADMIN_PASSWORD?.trim();
  const password = providedPassword || createDemoPassword();
  let passwordWasGenerated = false;
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(TENANT_ADMIN_EMAIL);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }
  }

  if (!userRecord) {
    userRecord = await auth.createUser({
      email: TENANT_ADMIN_EMAIL,
      password,
      displayName: "Tacos Lupita Demo Admin",
    });
    passwordWasGenerated = !providedPassword;
  } else if (providedPassword) {
    await auth.updateUser(userRecord.uid, {
      password,
      displayName: "Tacos Lupita Demo Admin",
    });
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      email: TENANT_ADMIN_EMAIL,
      displayName: "Tacos Lupita Demo Admin",
      role: "tenant_admin",
      tenantId: TENANT_ID,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    uid: userRecord.uid,
    email: TENANT_ADMIN_EMAIL,
    password,
    passwordWasGenerated,
  };
}

async function main() {
  const { tenantRef, publicUrl } = await upsertTenant();
  await upsertProducts(tenantRef);
  const tenantAdmin = await upsertTenantAdminUser();

  console.log("✅ Golden tenant listo");
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`URL menú: ${publicUrl}`);
  console.log(`Productos sembrados: ${products.length}`);
  console.log(`Tenant admin email: ${tenantAdmin.email}`);
  console.log(`Tenant admin uid: ${tenantAdmin.uid}`);
  if (tenantAdmin.passwordWasGenerated) {
    console.log(`Tenant admin password temporal: ${tenantAdmin.password}`);
  } else if (process.env.FOODSPV_GOLDEN_ADMIN_PASSWORD) {
    console.log("Tenant admin password: tomada desde FOODSPV_GOLDEN_ADMIN_PASSWORD");
  } else {
    console.log("Tenant admin password: usuario existente, contraseña sin cambios");
  }
  if (AUTHORIZED_WHATSAPP_PHONES.length > 0) {
    console.log(
      `Authorized WhatsApp phones: ${AUTHORIZED_WHATSAPP_PHONES.join(", ")}`
    );
  } else {
    console.log("Authorized WhatsApp phones: no configurados (modo MVP)");
  }
}

main().catch((error) => {
  console.error("❌ No se pudo sembrar el tenant dorado.");
  console.error(error);
  process.exit(1);
});
