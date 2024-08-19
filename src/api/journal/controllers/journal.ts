/**
 * journal controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::journal.journal",
  ({ strapi }) => ({
    async find(ctx) {
      const { date, page, size } = ctx.params;

      let filters = {} as any;

      if (ctx.state.user) {
        const { id: userId, role } = ctx.state.user;
        if (role.type === "public") {
          filters.client = { id: { $eq: { userId } } };
        } else if (role.type === "petsitter") {
          filters.petsitter = { id: { $eq: { userId } } };
        }
      }

      if (date) {
        if (date.length === 7) {
          const startDate = new Date(date + "-01");
          const endDate = new Date(
            new Date(date).setMonth(startDate.getMonth() + 1)
          );
          filters.date = { $gte: startDate, $lt: endDate };
        } else if (date.length === 10) {
          filters.date = { $eq: date };
        }
      }

      try {
        const journals = await strapi.entityService.findPage(
          "api::journal.journal",
          {
            filters,
            populate: {
              reservation: {
                populate: {
                  client: { fields: ["id", "nickname"] },
                  petsitter: { fields: ["id", "nickname"] },
                },
              },
            },
            page,
            pageSize: size,
          }
        );

        return ctx.send(journals);
      } catch (e) {
        return ctx.badRequest("Fail to fetch journals");
      }
    },
    async findOne(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId } = ctx.state.user;
      const { id: journalId } = ctx.params;

      try {
        const journal = await strapi.entityService.findOne(
          "api::journal.journal",
          +journalId,
          {
            populate: {
              reservation: {
                populate: {
                  petsitter: { fields: ["id"] },
                  client: { fields: ["id"] },
                },
              },
            },
          }
        );

        if (
          journal.reservation.client.id === userId ||
          journal.reservation.petsitter.id === userId
        ) {
          return ctx.send(journal);
        }
      } catch (e) {
        return ctx.badRequest("Fail to fetch the journal");
      }
    },
    async create(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId, role } = ctx.state.user;
      const { reservationId } = ctx.query;
      const { body } = JSON.parse(ctx.request.body.data);
      const { file } = ctx.request.files;

      try {
        const reservation = await strapi.entityService.findOne(
          "api::reservation.reservation",
          +reservationId,
          { populate: { petsitter: { fields: ["id"] } } }
        );

        if (reservation.journal) {
          return ctx.badRequest("There is already a journal");
        }

        if (
          role.type === "petsitter" &&
          reservation.petsitter.id === userId &&
          !reservation.journal
        ) {
          let data = {
            data: { body, reservation: { connect: [+reservationId] } },
            files: file ? { photos: file } : null,
          };

          const newJournal = await strapi.entityService.create(
            "api::journal.journal",
            data
          );

          return ctx.send({
            message: "Successfully create a journal",
            id: newJournal.id,
          });
        }
      } catch (e) {
        return ctx.badRequest("Fail to create a journal");
      }
    },
    async update(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId } = ctx.state.user;
      const { id: journalId } = ctx.params;
      const { body } = JSON.parse(ctx.request.body.data);
      const { file } = ctx.request.files;

      try {
        const journal = await strapi.entityService.findOne(
          "api::journal.journal",
          +journalId,
          {
            populate: {
              reservation: { populate: { petsitter: { fields: ["id"] } } },
            },
          }
        );

        if (!journal) {
          return ctx.notFound("No Journal matches yours");
        }

        console.log(journal);

        if (journal.reservation.petsitter.id === userId) {
          let data = { data: { body }, files: file ? { photos: file } : null };
          const updatedJournal = await strapi.entityService.update(
            "api::journal.journal",
            journalId,
            data as any
          );

          return ctx.send({
            message: "Successfully update the journal",
            id: updatedJournal.id,
          });
        }
      } catch (e) {
        return ctx.badRequest("Fail to update the journal");
      }
    },
    async delete(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized("Token is not validated");
      }

      const { id: userId } = ctx.state.user;
      const { id: journalId } = ctx.params;

      try {
        const journal = await strapi.entityService.findOne(
          "api::journal.journal",
          +journalId,
          {
            populate: {
              reservation: { populate: { petsitter: { fields: ["id"] } } },
            },
          }
        );

        if (journal.reservation.petsitter.id === userId) {
          const deletedJournal = await strapi.entityService.delete(
            "api::journal.journal",
            +journalId
          );

          return ctx.send({
            message: "Successfully delete the journal",
            id: deletedJournal.id,
          });
        }
      } catch (e) {
        return ctx.badRequest("Fail to delete the journal");
      }
    },
  })
);
