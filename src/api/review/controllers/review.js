"use strict";

/**
 * review controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::review.review", ({ strapi }) => ({
  async find() {
    try {
      const reviews = await strapi.entityService.findMany(
        "api::review.review",
        {
          populate: {
            reservation: {
              populate: {
                user: { populate: { photo: true } },
                pets: { populate: { file: true } },
              },
            },
          },
        }
      );

      const modifiedReviews = reviews.map((review) => ({
        ...review,
        reviewId: review.id,
        memberId: review.reservation.user.id,
        memberNickName: review.reservation.user.nickName,
        memberPhoto: review.reservation.user.photo,
        reservationId: review.reservation.id,
        reservationAddress: review.reservation.address,
        petNames: review.reservation.pets.filter((pet) => pet.name),
      }));
      return modifiedReviews;
    } catch (e) {}
  },
}));
