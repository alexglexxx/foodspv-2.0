import admin from "firebase-admin";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "foodspv-14829";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const tenants = [
  {
    tenantId: "postres-demo",
    name: "Dulce Mordida",
    category: "Postres",
    featuredCategory: "Postres",
    description: "Brownies, pasteles, pays y postres caseros para endulzar el día.",
    greeting: "Antojo dulce por aquí 🍰",
    rating: "4.8",
    reviews: "96",
    estimatedTime: "10–15 min",
    location: "Puerto Vallarta",
    heroImageUrl:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1400&auto=format&fit=crop",
    whatsappPhone: "+523221110001",
    products: [
      ["brownie-chocolate", "Brownie de chocolate", "Brownie húmedo con nuez.", 45, "Postres"],
      ["cheesecake-fresa", "Cheesecake de fresa", "Rebanada cremosa con fresa.", 70, "Postres"],
      ["pay-limon", "Pay de limón", "Pay frío con base de galleta.", 55, "Postres"],
      ["flan-napolitano", "Flan napolitano", "Flan casero con caramelo.", 38, "Clásicos"],
      ["tres-leches", "Pastel tres leches", "Rebanada suave y húmeda.", 60, "Pasteles"],
      ["galletas-chispas", "Galletas con chispas", "Paquete de 4 piezas.", 35, "Galletas"],
      ["cupcake-vainilla", "Cupcake de vainilla", "Con betún artesanal.", 32, "Cupcakes"],
      ["arroz-leche", "Arroz con leche", "Vaso individual con canela.", 30, "Clásicos"],
    ],
  },
  {
    tenantId: "hamburguesas-demo",
    name: "Burger Barrio",
    category: "Hamburguesas",
    featuredCategory: "Hamburguesas",
    description: "Hamburguesas jugosas, papas crujientes y malteadas bien frías.",
    greeting: "Hoy toca burger 🍔",
    rating: "4.7",
    reviews: "143",
    estimatedTime: "20–25 min",
    location: "Puerto Vallarta",
    heroImageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1400&auto=format&fit=crop",
    whatsappPhone: "+523221110002",
    products: [
      ["clasica", "Hamburguesa clásica", "Carne, queso, lechuga y tomate.", 95, "Hamburguesas"],
      ["doble-queso", "Doble queso", "Doble carne y doble queso.", 135, "Hamburguesas"],
      ["bbq-bacon", "BBQ Bacon", "Tocino, BBQ y aros de cebolla.", 145, "Especiales"],
      ["pollo-crispy", "Pollo crispy", "Pechuga crujiente con ranch.", 110, "Pollo"],
      ["hawaiana", "Hawaiana", "Piña asada, jamón y queso.", 120, "Especiales"],
      ["papas-chicas", "Papas chicas", "Porción individual.", 45, "Papas"],
      ["papas-grandes", "Papas grandes", "Para compartir.", 70, "Papas"],
      ["malteada-vainilla", "Malteada vainilla", "Cremosa.", 60, "Bebidas"],
    ],
  },
  {
    tenantId: "tacos-demo",
    name: "Taquería Los Compas",
    category: "Tacos",
    featuredCategory: "Tacos",
    description: "Tacos al pastor, asada, chorizo y especialidades hechas al momento.",
    greeting: "¡Qué onda! 👋",
    rating: "4.9",
    reviews: "128",
    estimatedTime: "15–20 min",
    location: "Puerto Vallarta",
    heroImageUrl:
      "https://images.unsplash.com/photo-1613514785940-daed07799d9b?q=80&w=1400&auto=format&fit=crop",
    whatsappPhone: "+523221110003",
    products: [
      ["taco-asada", "Taco de asada", "Con cebolla, cilantro y salsa.", 28, "Tacos"],
      ["taco-pastor", "Taco al pastor", "Pastor con piña.", 24, "Tacos"],
      ["taco-chorizo", "Taco de chorizo", "Chorizo doradito.", 24, "Tacos"],
      ["taco-tripa", "Taco de tripa", "Dorada o suave.", 32, "Tacos"],
      ["quesadilla-asada", "Quesadilla con asada", "Grande con queso y asada.", 65, "Quesadillas"],
      ["gringa-pastor", "Gringa de pastor", "Harina, queso, pastor y piña.", 75, "Especiales"],
      ["orden-asada", "Orden de asada", "Carne, tortillas y salsa.", 150, "Órdenes"],
      ["agua-horchata", "Agua de horchata", "Vaso grande.", 30, "Bebidas"],
    ],
  },
  {
    tenantId: "nieves-demo",
    name: "Nieves La Bahía",
    category: "Nieves",
    featuredCategory: "Nieves",
    description: "Nieves, helados, malteadas y especialidades frías para el calor.",
    greeting: "Algo fresco para hoy 🍨",
    rating: "4.8",
    reviews: "87",
    estimatedTime: "10–15 min",
    location: "Puerto Vallarta",
    heroImageUrl:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=1400&auto=format&fit=crop",
    whatsappPhone: "+523221110004",
    products: [
      ["nieve-limon", "Nieve de limón", "Vaso chico.", 25, "Nieves"],
      ["nieve-mango", "Nieve de mango", "Vaso chico.", 25, "Nieves"],
      ["nieve-fresa", "Nieve de fresa", "Vaso chico.", 25, "Nieves"],
      ["helado-vainilla", "Helado de vainilla", "Vaso chico.", 35, "Helados"],
      ["helado-chocolate", "Helado de chocolate", "Vaso chico.", 35, "Helados"],
      ["helado-fresa", "Helado de fresa", "Vaso chico.", 35, "Helados"],
      ["banana-split", "Banana split", "Plátano, nieve y toppings.", 75, "Especiales"],
      ["malteada-chocolate", "Malteada chocolate", "Cremosa.", 65, "Bebidas"],
    ],
  },
  {
    tenantId: "elotes-demo",
    name: "Elotes Don Chuy",
    category: "Elotes",
    featuredCategory: "Elotes",
    description: "Elotes, esquites y antojitos preparados con mucho queso y chile.",
    greeting: "Se armó el antojo 🌽",
    rating: "4.9",
    reviews: "112",
    estimatedTime: "10–20 min",
    location: "Puerto Vallarta",
    heroImageUrl:
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1400&auto=format&fit=crop",
    whatsappPhone: "+523221110005",
    products: [
      ["elote-vaso", "Elote en vaso", "Con mantequilla.", 45, "Elotes"],
      ["elote-crema", "Elote con crema", "Con crema y queso.", 55, "Elotes"],
      ["elote-flamin", "Elote Flamin Hot", "Con Flamin Hot.", 65, "Especiales"],
      ["esquite", "Esquite tradicional", "Con caldo, limón y chile.", 50, "Esquites"],
      ["esquite-extra", "Esquite especial", "Extra queso y mantequilla.", 65, "Esquites"],
      ["maruchan-elote", "Maruchan con elote", "Maruchan preparada.", 85, "Especiales"],
      ["tostielote", "Tostielote", "Tostitos con elote.", 90, "Especiales"],
      ["dorielote", "Dorielote", "Doritos con elote.", 90, "Especiales"],
    ],
  },
];

for (const tenant of tenants) {
  const { tenantId, products, ...tenantData } = tenant;

  await db.collection("tenants").doc(tenantId).set(
    {
      ...tenantData,
      tenantId,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const [id, name, description, price, category] of products) {
    await db.collection("tenants").doc(tenantId).collection("products").doc(id).set(
      {
        tenantId,
        name,
        description,
        price,
        category,
        available: true,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log(`✅ ${tenantId} creado con ${products.length} productos`);
}

console.log("🔥 Seed completo: 5 tenants demo creados con perfil visual");
