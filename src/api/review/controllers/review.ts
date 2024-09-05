/**
 * review controller
 */

import { factories } from "@strapi/strapi";
export default factories.createCoreController(
  "api::review.review",
  ({ strapi }) => ({
    // 리뷰 조회
    async find(ctx) {
      const { date, photo, page, size } = ctx.query;

      let filters = {} as any;
      if (ctx.state.user) {
        const { id: userId, role } = ctx.state.user;

        if (role.type === "public") {
          filters.reservation = { client: { id: { $eq: userId } } };
        } else if (role.type === "petsitter") {
          filters.reservation = { petsitter: { id: { $eq: userId } } };
        }
      }

      // 날짜 필터링
      if (date) {
        if (date.length === 7) {
          // "YYYY-MM" 형식
          const startDate = new Date(date + "-01");
          const endDate = new Date(
            new Date(date).setMonth(startDate.getMonth() + 1)
          );

          filters.date = {
            $gte: startDate,
            $lt: endDate,
          };
        } else if (date.length === 10) {
          // "YYYY-MM-DD" 형식
          filters.date = { $eq: date };
        }
      }

      // 사진이 있는 리뷰만 필터링
      if (photo === "true") {
        // ctx.query에서 가져온 값은 문자열이므로 'true'로 비교합니다.
        filters.photos = { $ne: null }; // 또는 {$not: {$size: 0}} 로 수정
      }

      try {
        const reviews = await strapi.entityService.findPage(
          "api::review.review",
          {
            sort: { createdAt: "desc" },
            populate: {
              reservation: {
                populate: {
                  client: {
                    populate: { photo: { fields: ["id", "url"] } },
                    fields: ["id", "nickname"],
                  },
                  petsitter: {
                    populate: { photo: { fields: ["id", "url"] } },
                    fields: ["id", "nickname"],
                  },
                  pets: {
                    populate: { photo: { fields: ["id", "url"] } },
                    fields: ["id", "name", "type"],
                  },
                },
              },
              photos: { fields: ["id", "url"] },
            },
            filters,
            page,
            pageSize: size,
          }
        );

        return ctx.send(reviews);
      } catch (e) {
        return ctx.badRequest("Fail to fetch reviews");
      }
    },
    // 리뷰 1개 조회
    async findOne(ctx) {
      const { id: reviewId } = ctx.params;

      try {
        const review = await strapi.entityService.findOne(
          "api::review.review",
          reviewId
        );

        return ctx.send(review);
      } catch (e) {
        return ctx.badRequest("Fail to fetch the review");
      }
    },
    // 리뷰 생성
    async create(ctx) {
      const { id: userId, role } = ctx.state.user;

      if (!ctx.state.user || role.type !== "public") {
        return ctx.unauthorized("Token is not valited");
      }

      const { reservationId } = ctx.query;
      const { body, star } = JSON.parse(ctx.request.body.data);
      const { file } = ctx.request.files;

      try {
        const reservation = await strapi.entityService.findOne(
          "api::reservation.reservation",
          reservationId,
          {
            populate: {
              client: { fields: ["id"] },
              review: { fields: ["id"] },
            },
          }
        );

        if (reservation.client.id === userId && !reservation.review) {
          let data = {
            data: { body, star, reservation: { connect: [reservation.id] } },
            files: file ? { photos: file } : null,
          };

          const newReview = await strapi.entityService.create(
            "api::review.review",
            data
          );

          return ctx.send({
            message: "Successfully create a review",
            id: newReview.id,
          });
        }
      } catch (e) {
        return ctx.badRequest("Fail to create a review");
      }
    },
    // 리뷰 수정
    async update(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId } = ctx.state.user;
      const { id: reviewId } = ctx.params;
      const { body, star } = JSON.parse(ctx.request.body.data);
      const { file } = ctx.request.files;

      // 일주일 안에 작성을 해줘야 한다.
      // 일주일은 무슨 기준으로? 케어 끝나고 나서 일주일
      try {
        const review = await strapi.entityService.findOne(
          "api::review.review",
          +reviewId,
          {
            populate: {
              reservation: { populate: { client: { fields: ["id"] } } },
            },
          }
        );

        if (!review) {
          return ctx.notFound("No Review matches yours");
        }

        // const startDate = new Date(review.date); // 기준 날짜
        // const endDate = new Date(startDate); // startDate의 복사본 생성
        // endDate.setDate(startDate.getDate() + 7); // endDate를 startDate로부터 일주일 후로 설정

        // const now = new Date(); // 현재 날짜

        // // 현재 날짜와 endDate를 비교할 때는 두 값이 모두 Date 객체여야 함
        // if (now > endDate) {
        //   console.log("hi");
        // }

        if (review.reservation.client.id === userId) {
          let data = {
            data: { body, star },
            files: file ? { photos: file } : null,
          };

          try {
            const updatedReview = await strapi.entityService.update(
              "api::review.review",
              review.id,
              data as any
            );
            return ctx.send({
              message: "Successfully update the review",
              id: updatedReview.id,
            });
          } catch (e) {
            return ctx.badRequest("Fail to update the review");
          }
        } else {
          return ctx.notFound("No Review matches yours");
        }
      } catch (e) {
        return ctx.badRequest("Fail to update the review");
      }
    },
    // 리뷰 삭제
    async delete(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId } = ctx.state.user;
      const { id: reviewId } = ctx.params;

      try {
        const review = await strapi.entityService.findOne(
          "api::review.review",
          +reviewId,
          {
            populate: {
              reservation: { populate: { client: { fields: ["id"] } } },
            },
          }
        );

        if (review.reservation.client.id === userId) {
          const deletedReview = await strapi.entityService.delete(
            "api::review.review",
            reviewId
          );

          return ctx.send({
            message: "Successfully delete the review",
            id: deletedReview.id,
          });
        }
      } catch (e) {
        return ctx.badRequest("Fail to delete the review");
      }
    },
  })
);
