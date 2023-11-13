"use strict";

/**
 * review controller
 */

const { errors } = require("@strapi/utils");
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::review.review", ({ strapi }) => ({
  async find(ctx) {
    if (Object.keys(ctx.request.query).length === 0) {
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
                    fields: ["id", "username", "nickName"],
                    // populate: { photo: true },
                  },
                  // petsitter: { populate: { role: true, photo: true } },
                  // pets: { populate: { file: true } },
                },
              },
            },
          }
        );

        const modifiedReviews = reviews.map((review) => ({
          //   // ...review,
          reviewId: review.id,
          memberId: review.reservation.client
            ? review.reservation.client.id
            : null,
          memberNickName: review.reservation.client
            ? review.reservation.client.nickName
            : null,
          memberPhoto: review.reservation.client
            ? review.reservation.client.photo
            : null,
          reservationId: review.reservation.id,
          reservationAddress: review.reservation.address,
          petNames: review.reservation.pets
            ? review.reservation.pets.map((pet) => pet.name)
            : null,
          reviewPhotos: review.photos
            ? review.photos.map((photo) => photo?.formats?.thumbnail?.url)
            : null,
          body: review.body,
          petsitterId: review.reservation.petsitter
            ? review.reservation.petsitter.id
            : null,
          petsitterName: review.reservation.petsitter
            ? review.reservation.petsitter.username
            : null,
          petsitterPhoto: review.reservation.petsitter
            ? review.reservation.petsitter.photo
            : null,
          star: review.star,
          createdAt: review.createdAt,
          lastModifiedAt: review.updatedAt,
        }));

        ctx.send({ reviews: modifiedReviews });
      } catch (e) {
        console.log(e);
      }
    } else {
      try {
        const filters = {
          reservation: {},
        };

        if (ctx.request.query.petsitterId) {
          filters.reservation.petsitter = {
            id: +ctx.request.query.petsitterId,
          };
        }

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
            filters,
            start: (+ctx.request.query.page - 1) * +ctx.request.query.size || 0,
            limit: +ctx.request.query.page * +ctx.request.query.size || 0,
          }
        );

        const modifiedReviews = reviews.map((review) => ({
          // ...review,
          reviewId: review.id,
          memberId: review.reservation.client
            ? review.reservation.client.id
            : null,
          memberNickName: review.reservation.client
            ? review.reservation.client.nickName
            : null,
          memberPhoto: review.reservation.client
            ? review.reservation.client.photo
            : null,
          reservationId: review.reservation.id,
          reservationAddress: review.reservation.address,
          petNames: review.reservation.pets
            ? review.reservation.pets.map((pet) => pet.name)
            : null,
          reviewPhotos: review.photos
            ? review.photos.map((photo) => photo?.formats?.thumbnail?.url)
            : null,
          body: review.body,
          petsitterId: review.reservation.petsitter
            ? review.reservation.petsitter.id
            : null,
          petsitterName: review.reservation.petsitter
            ? review.reservation.petsitter.username
            : null,
          petsitterPhoto: review.reservation.petsitter
            ? review.reservation.petsitter.photo
            : null,
          star: review.star,
          createdAt: review.createdAt,
          lastModifiedAt: review.updatedAt,
        }));

        ctx.send({ reviews: modifiedReviews });
      } catch (e) {
        console.log(e);
      }
    }
  },
  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      const review = await strapi.entityService.findOne(
        "api::review.review",
        id,
        {
          populate: {
            reservation: {
              populate: { petsitter: { populate: { photo: true } } },
            },
            photos: true,
          },
        }
      );

      const modifiedReview = {
        // ...review,
        reviewId: review.id,
        memberId: review.reservation.client
          ? review.reservation.client.id
          : null,
        memberNickName: review.reservation.client
          ? review.reservation.client.nickName
          : null,
        memberPhoto: review.reservation.client
          ? review.reservation.client.photo
          : null,
        reservationId: review.reservation.id,
        reservationAddress: review.reservation.address,
        petNames: review.reservation.pets
          ? review.reservation.pets.map((pet) => pet.name)
          : null,
        reviewPhotos: review.photos
          ? review.photos.map((photo) => photo?.formats?.thumbnail?.url)
          : null,
        body: review.body,
        petsitterId: review.reservation.petsitter
          ? review.reservation.petsitter.id
          : null,
        petsitterName: review.reservation.petsitter
          ? review.reservation.petsitter.username
          : null,
        petsitterPhoto: review.reservation.petsitter
          ? review.reservation.petsitter.photo
          : null,
        star: review.star,
        createdAt: review.createdAt,
        lastModifiedAt: review.updatedAt,
      };

      ctx.send({ reviews: modifiedReview });
    } catch (e) {
      console.log(e);
    }
  },

  async create(ctx) {
    const { id: userId } = ctx.state.user;

    const { reservationId, body, star } = JSON.parse(ctx.request.body.data);
    const files = ctx.request.files;

    // 후기는 예약과 연결되어있기 때문에 예약 먼저 찾아준다.
    const reservation = await strapi.entityService.findOne(
      "api::reservation.reservation",
      reservationId,
      {
        populate: {
          client: { fields: ["email"] },
          review: { fields: ["body"] },
        },
      }
    );

    // 검색 했을때 review가 없으면 create, 이미 있으면 에러
    // 고객이 작성하기 때문에 reservation의 속한 client와 정보가 일치해야 한다.
    // reservation의 상태가 FINISH_CARING일 때만 작성이 가능하다.
    if (reservation.client.id !== userId) {
      return ctx.badRequest("후기 등록 권한이 없습니다.");
    } else if (reservation.progress !== "FINISH_CARING") {
      return ctx.badRequest("예약이 종료 상태가 아닙니다.");
    } else if (
      reservation.client.id === userId &&
      !reservation.review &&
      reservation.progress === "FINISH_CARING"
    ) {
      // 아직 사진 등록 안됌.
      try {
        const newReview = await strapi.entityService.create(
          "api::review.review",
          {
            data: {
              body,
              star,
              reservation: reservationId,
            },
            files: {
              photos: files.files,
            },
          }
        );
        ctx.send("Create Review Success");
      } catch (e) {
        return ctx.badRequest(
          "후기 등록에 실패하였습니다. 다시 한번 등록해주세요."
        );
      }
    }
  },

  async update(ctx) {
    const reviewId = +ctx.request.params.id;
    const { reservationId, body, star } = JSON.parse(ctx.request.body.data);
    const files = ctx.request.files;

    const reservation = await strapi.entityService.findOne(
      "api::reservation.reservation",
      reservationId,
      {
        populate: {
          client: { fields: ["email"] },
          review: { fields: ["body"] },
        },
      }
    );

    // 유저가 이 예약을 가지고 있고, 작성된 review가 있어야 수정할 수 있다.
    // params로 들어온 reviewId랑 reservation.review랑 일치해야 한다.
    if (!reservation.review) {
      return ctx.badRequest("리뷰를 먼저 등록해주세요.");
    } else if (
      ctx.state.user.id === reservation.client.id &&
      reservation.review &&
      reservation.review.id === reviewId
    ) {
      try {
        const updatedReview = await strapi.entityService.update(
          "api::review.review",
          reviewId,
          {
            data: {
              body,
              star,
              reservation: reservationId,
            },
            files: { photos: files.files },
          }
        );
        ctx.send("Update Review Success");
      } catch (e) {
        console.log(e);
      }
    }
  },

  async delete(ctx) {
    const { id: reviewId } = ctx.params;

    const review = await strapi.entityService.findOne(
      "api::review.review",
      reviewId,
      {
        populate: {
          reservation: {
            populate: { client: { fields: ["id"] } },
            fields: ["id"],
          },
        },
      }
    );

    // reservation에 review가 있어야 한다.
    // 그 리뷰가 유저 소유인가를 확인
    if (ctx.state.user.id !== review.reservation.client.id) {
      ctx.badRequest("삭제할 권한이 없습니다.");
    }
    if (ctx.state.user.id === review.reservation.client.id && review) {
      try {
        const deletedReview = await strapi.entityService.delete(
          "api::review.review",
          reviewId
        );
        ctx.send({ message: "Delete Review Success", id: deletedReview.id });
      } catch (e) {
        console.log(e);
      }
    }
  },
}));
