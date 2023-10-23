"use strict";

/**
 * pet controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::pet.pet", ({ strapi }) => ({
  async find(ctx) {
    try {
      const pets = await strapi.entityService.findMany("api::pet.pet");

      ctx.send(pets);
    } catch (e) {
      console.log(e);
    }
  },
  async findOne(ctx) {
    try {
      if (!ctx.state.user) {
        return ctx.unauthorized();
      }

      // const pet = await strapi.service("api::pet.pet").find(ctx.params.id);
      const pet = await strapi.entityService.findOne(
        "api::pet.pet",
        ctx.params.id
      );
      ctx.send(pet);
    } catch (e) {
      console.log(e);
    }
  },
}));
