require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

// ===================== MIDDLEWARE =====================
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// ===================== STRIPE INIT =====================
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Missing STRIPE_SECRET_KEY");
  process.exit(1); // stop app if key missing
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ===================== TEST ROUTE =====================
app.get("/", (req, res) => {
  res.send("🔥 Server is working");
});

// ===================== STRIPE TEST =====================
app.get("/test-stripe", async (req, res) => {
  try {
    const products = await stripe.products.list({ limit: 1 });
    res.json({ success: true, products });
  } catch (err) {
    console.error("❌ Stripe test failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===================== CREATE CHECKOUT =====================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { price, name } = req.body;

    console.log("Incoming:", req.body);

    if (!price || !name) {
      return res.status(400).json({ error: "Missing price or name" });
    }

   const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: name,
        },
        unit_amount: price * 100,
      },
      quantity: 1,
    },
  ],


      success_url:
        "https://dopetone-clean.onrender.com/success.html",
      cancel_url:
        "https://dopetone-clean.onrender.com/cancel.html",
    });

    console.log("✅ Session created:", session.id);

    res.json({ id: session.id });
  } catch (err) {
    console.error("❌ Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Server running on port " + PORT);
});
