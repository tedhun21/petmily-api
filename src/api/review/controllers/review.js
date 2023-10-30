"use strict";

/**
 * review controller
 */

const { errors } = require("@strapi/utils");
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::review.review", ({ strapi }) => ({
  async find(ctx) {
    try {
      const reviews = await strapi.entityService.findMany(
        "api::review.review",
        {
          sort: { id: "desc" },
          populate: {
            photos: true,
            reservation: {
              populate: {
                client: {
                  fields: ["username", "nickName"],
                  populate: { photo: true },
                },
                petsitter: { populate: { role: true, photo: true } },
                pets: { populate: { file: true } },
              },
            },
          },
        }
      );

      const modifiedReviews = reviews.map((review) => ({
        ...review,
        reviewId: review.id,
        memberId: review.reservation.client.id,
        memberNickName: review.reservation.client.nickName,
        memberPhoto: review.reservation.client.photo,
        reservationId: review.reservation.id,
        reservationAddress: review.reservation.address,
        petNames: review.reservation.pets.map((pet) => pet.name),
        reviewPhotos: review.photos
          ? review.photos.map((photo) => photo?.formats?.thumbnail?.url)
          : null,
        body: review.body,
        petsitterId: review.reservation.petsitter.id,
        petsitterName: review.reservation.petsitter.username,
        petsitterPhoto: review.reservation.petsitter.photo,
        star: review.star,
        createdAt: review.createdAt,
        lastModifiedAt: review.updatedAt,
      }));

      ctx.send({ reviews: modifiedReviews });
    } catch (e) {
      console.log(e);
    }
  },
  async findOne(ctx) {
    const { id } = ctx.params;
    try {
      const review = await strapi.entityService.findOne(
        "api::review.review",
        id
      );
      ctx.send(review);
    } catch (e) {
      console.log(e);
    }
  },
}));
