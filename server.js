import express from "express";
import cors from "cors";
import Stripe from "stripe";

const app = express();
const stripe = new Stripe("sk_test_YOUR_SECRET_KEY");

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // ✅ SERVE IMAGES + HTML

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { name, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Missing name or price" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: name,
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],

      success_url: `https://dopetone-clean.onrender.com/success.html?beat=${name}&price=${price}`,
      cancel_url: `https://dopetone-clean.onrender.com/cancel.html?beat=${name}&price=${price}`,
    });

    res.json({ id: session.id });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
