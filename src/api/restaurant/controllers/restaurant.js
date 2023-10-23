"use strict";

/**
 * restaurant controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::restaurant.restaurant",
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const restaurants = await strapi.entityService.findMany(
          "api::restaurant.restaurant"
        );
        console.log(ctx);
        console.log(restaurants);
        ctx.send({ restaurants });
      } catch (e) {
        console.log(e);
      }
    },
  })
);
