/**
 * reservation controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::reservation.reservation",
  ({ strapi }) => ({
    // 예약 조회
    async find(ctx) {
      const { id: userId, role } = ctx.state.user;
      const { page, pageSize, date, status } = ctx.query;

      let filters = {} as any;
      // 상태 필터링 status ("모두")
      if (status) {
        if (status === "expected") {
          filters.progress = { $in: ["PENDING", "CONFIRMED"] };
        } else if (status === "finish") {
          filters.progress = { $eq: "FINISHED" };
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

      // 사용자 역할에 따른 필터링
      if (role.type === "public") {
        filters.client = { id: userId };
      } else if (role.type === "petsitter") {
        filters.petsitter = { id: userId };
      }

      const reservations = await strapi.entityService.findPage(
        "api::reservation.reservation",
        {
          sort: { createdAt: "desc" },
          filters,
          populate: {
            client: {
              fields: ["id", "nickname"],
              populate: { photo: { fields: ["id", "url"] } },
            },
            petsitter: {
              fields: ["id", "nickname"],
              populate: { photo: { fields: ["id", "url"] } },
            },
            pets: true,
            journal: true,
          },
          page,
          pageSize,
        }
      );

      return ctx.send(reservations);
    },
    // 예약 1개 조회
    async findOne(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId, role } = ctx.state.user;
      const { id: reservationId } = ctx.params;

      try {
        const reservation = await strapi.entityService.findOne(
          "api::reservation.reservation",
          reservationId,
          {
            populate: {
              client: {
                fields: ["id", "nickname", "body"],
                populate: { photo: { fields: ["id", "url"] } },
              },
              petsitter: {
                fields: [
                  "id",
                  "nickname",
                  "body",
                  "possibleDay",
                  "possibleStartTime",
                  "possibleEndTime",
                  "possiblePetType",
                ],
                populate: { photo: { fields: ["id", "url"] } },
              },
              pets: { populate: { photo: { fields: ["id", "url"] } } },
            },
          }
        );

        if (
          (role.type === "public" && reservation.client.id !== userId) ||
          (role.type === "petistter" && reservation.petsitter.id !== userId)
        ) {
          return ctx.badRequest("This reservation is not allowed to you");
        }

        return ctx.send(reservation);
      } catch (e) {
        return ctx.badRequest("Fail to fetch the reservation");
      }
    },

    // 예약 생성
    async create(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId, role } = ctx.state.user;
      const { petId, petsitterId } = ctx.request.body;

      if (role.type === "public") {
        let data = {
          data: {
            ...ctx.request.body,
            pets: { connect: [...petId] },
            client: { connect: [userId] },
            petsitter: { connect: [petsitterId] },
            progress: "PENDING",
          },
        };

        try {
          const newReservation = await strapi.entityService.create(
            "api::reservation.reservation",
            data
          );
          return ctx.send({
            message: "Successfully create a reservation",
            id: newReservation.id,
          });
        } catch (e) {
          return ctx.badRequest("Fail to create a reservation");
        }
      }
    },

    // 예약 수정
    async update(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validate");
      }

      const { id: userId, role } = ctx.state.user;
      const { id: reservationId } = ctx.params;
      const { action } = ctx.query;

      // 예약 정보 가져오기
      const reservation = await strapi.entityService.findOne(
        "api::reservation.reservation",
        reservationId,
        {
          populate: { client: { fields: ["id"] } },
          petsitter: { fields: ["id"] },
        }
      );

      if (
        (role.type === "public" && reservation.client.id !== userId) ||
        (role.type === "petsitter" && reservation.petssiter.id !== userId)
      ) {
        return ctx.forbidden("You do not have access to this resource");
      }

      let data;

      // 예약 확정(petsitter만 할 수 있음 - PENDING => CONFIRMED)
      if (role.type === "petsitter") {
        // 예약 수락
        if (reservation.progress === "PENDING" && action === "confirm") {
          data = { data: { progress: "CONFIRMED" } };
        }
      } else if (role.type === "public") {
        // 예약 취소
        if (reservation.progress === "PENDING" && action === "cancel") {
          data = { data: { progress: "CANCELED" } };
        }
      }

      console.log(data);

      try {
        const updatedReservation = await strapi.entityService.update(
          "api::reservation.reservation",
          reservationId,
          data as any
        );

        return ctx.send({
          message: "Successfully update the reservation",
          id: updatedReservation.id,
        });
      } catch (e) {
        return ctx.badRequest("Fail to update the reservation");
      }
    },
  })
);
