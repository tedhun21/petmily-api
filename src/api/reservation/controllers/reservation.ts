/**
 * reservation controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::reservation.reservation",
  ({ strapi }) => ({
    // 예약 조회 (O)
    async find(ctx) {
      const { id: userId, role } = ctx.state.user;
      const { page, size, date, status } = ctx.query;

      let filters = {} as any;
      // 상태 필터링
      if (status === "expected") {
        filters.progress = { $in: ["PENDING", "CONFIRMED"] };
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
          pageSize: size,
        }
      );

      return ctx.send(reservations);
    },
    // 예약 1개 조회 (O)
    async findOne(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId } = ctx.state.user;
      const { id: reservationId } = ctx.params;

      try {
        const reservation = await strapi.entityService.findOne(
          "api::reservation.reservation",
          reservationId,
          {
            populate: {
              client: { fields: ["id", "nickname"] },
              petsitter: { fields: ["id", "nickname"] },
            },
          }
        );

        if (reservation.client.id === userId) {
          return ctx.send(reservation);
        } else return ctx.badRequest("This reservation is not allowed to you");
      } catch (e) {
        return ctx.badRequest("Fail to fetch the reservation");
      }
    },

    // 예약 생성 (O)
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
            pets: { connect: petId },
            client: { connect: [userId] },
            petsitter: { connect: [petsitterId] },
            progress: "REQUEST",
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
          return ctx.badRequest("Fail to create a reservation8u");
        }
      }
    },

    // 예약 수정 (O)
    async update(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validate");
      }
      const { role } = ctx.state.user;
      const { id: reservationId } = ctx.params;
      const { action } = ctx.query;

      // 예약 정보 가져오기
      const reservation = await strapi.entityService.findOne(
        "api::reservation.reservation",
        reservationId
      );

      try {
        // 예약 확정(petsitter만 할 수 있음 - PENDING => CONFIRMED)
        if (
          role.type === "petsitter" &&
          reservation.progress === "PENDING" &&
          action === "confirm"
        ) {
          let data = { data: { progress: "CONFIRMED" } };
          const updatedReservation = await strapi.entityService.update(
            "api::reservation.reservation",
            reservationId,
            data as any
          );

          return ctx.send({
            message: "Successfully update the reservation",
            id: updatedReservation.id,
          });
        } else if (
          reservation.progress !== "CONFIRMED" &&
          action === "cancel"
        ) {
          // 예약 취소(cliet랑 petsitter 둘다 가능 - 확정 나면 취소 못함)
          let data = { data: { progress: "CANCELED" } };
          const updatedReservation = await strapi.entityService.update(
            "api::reservation.reservation",
            reservationId,
            data as any
          );

          return ctx.send({
            message: "Successfully update the reservation",
            id: updatedReservation.id,
          });
        }
      } catch (e) {
        return ctx.badRequest("Fail to update the reservation");
      }
    },

    // 예약 가능 펫시터 찾기 (O)
    async findPossiblePetsitter(ctx) {
      const { date, startTime, endTime, address, petId, page, size } =
        ctx.query;

      let filters = { role: { type: { $eq: "petsitter" } } } as any;
      if (date) {
        filters.possibleDay = {
          $contains: new Date(date).toLocaleDateString("en", {
            weekday: "short",
          }),
        };
      }

      if (startTime && endTime) {
        filters.startTime = { $gte: startTime };
        filters.endTime = { $lt: endTime };
      }

      if (address) {
        filters.address = { $contains: address.split(" ") };
      }

      if (petId) {
        try {
          const pet = await strapi.entityService.findOne(
            "api::pet.pet",
            +petId
          );

          filters.possiblePetType = { $contains: [pet.type] };
        } catch (e) {}
      }

      try {
        const petsitters = await strapi.entityService.findPage(
          "plugin::users-permissions.user",
          {
            filters,
            fields: [
              "username",
              "email",
              "address",
              "body",
              "phone",
              "possibleDay",
              "possibleLocation",
              "possiblePetType",
              "possibleStartTime",
              "possibleEndTime",
            ],
            page,
            pageSize: size,
          }
        );

        return ctx.send(petsitters);
      } catch (e) {
        return ctx.badRequest("Fail to fetch petsitters");
      }
    },
  })
);
