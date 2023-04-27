const stripe = require("stripe")(process.env.STRIPE_KEY);

'use strict';

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
    async create(ctx) {
        const { cart } = ctx.request.body;
        if (!cart) {
            ctx.response.status = 400;
            return {error: "Cart not found" };
        }
        const lineItems = await Promise.all(
            cart.map(async (product)=> {
                const item = await strapi
                .service("api::obrazy.obrazy")
                .findOne(product.id);
            return {
                price_data: {
                    currenct: "pln",
                    product_data: {
                        name: item.title
                    },
                    unit_amount: item.price * 100,
                },
            };  
            })
        );
        try {
            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                success_url: `${process.env.CLIENT_URL}?success=true`,
                cancel_url: `${process.env.CLIENT_URL}?success=false`,
                line_items: lineItems,
                shipping_address: { allowed_countries: ["PL"] },
                payment_method_types: ["card"],
            });
            await strapi.service("api::order.order").create({
                data: {
                    product: order,
                    stripeId: session.id,
                },
            });
            return {stripeSession: session };
        } catch (error) {
            ctx.response.status = 500;
        }
    },
}));
