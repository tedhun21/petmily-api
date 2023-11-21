"use strict";

const reservation = require("../../reservation/controllers/reservation");

/**
 * journal controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::journal.journal", ({ strapi }) => ({
  // 케어 일지 전체 조회
  async find(ctx) {
    if (!ctx.state.user) {
      ctx.send("에러");
    } else {
      try {
        const userId = ctx.state.user.id;

        const journals = await strapi.entityService.findMany(
          "api::journal.journal",
          {
            sort: { id: "desc" },
            populate: {
              photos: true,
              reservation: {
                populate: {
                  client: true,
                  petsitter: { populate: { photo: true } },
                  pets: {
                    populate: {
                      photo: true,
                    },
                  },
                },
              },
            },
            filters: {
              reservation: {
                $or: [
                  { client: { id: userId } },
                  { petsitter: { id: userId } },
                ],
              },
            },
            start: (+ctx.request.query.page - 1) * +ctx.request.query.size || 0,
            limit: +ctx.request.query.page * +ctx.request.query.size || 0,
          }
        );

        const modifiedJournals = journals.map((journal) => {
          const petNames = journal.reservation.pets.map((pet) => pet.name);
          const petPhotos = journal.reservation.pets.map((pet) =>
            pet.photo ? pet.photo.formats.thumbnail.url : null
          );
          const journalPhotos = journal.photos
            ? journal.photos.map(
                (photo) => photo && photo.formats.thumbnail.url
              )
            : null;

          return {
            journalId: journal.id,
            reservationId: journal.reservation.id,
            petsitterId: journal.reservation.petsitter.id,
            memberId: journal.reservation.client.id,
            createdAt: journal.createdAt,
            lastModifiedAt: journal.updatedAt,
            body: journal.body,
            photos: journalPhotos,
            petNames: petNames,
            petPhotos: petPhotos,
            petsitterName: journal.reservation.petsitter.username,
            petsitterPhoto:
              journal.reservation.petsitter.photo &&
              journal.reservation.petsitter.photo.formats.thumbnail.url,
          };
        });

        ctx.send({ journals: modifiedJournals });
      } catch (e) {
        console.log(e);
      }
    }
  },

  // 케어 일지 1개 조회
  async findOne(ctx) {
    if (!ctx.state.user) {
      ctx.send("에러");
    } else {
      try {
        const userId = ctx.state.user.id;

        const { id } = ctx.params;
        const journal = await strapi.entityService.findOne(
          "api::journal.journal",
          id,
          {
            populate: {
              photos: true,
              reservation: {
                populate: {
                  client: true,
                  petsitter: true,
                  pets: {
                    populate: {
                      photo: true,
                    },
                  },
                },
              },
            },
          }
        );

        // filter $or 사용해도 될듯
        if (
          userId === journal.reservation.client.id ||
          userId === journal.reservation.petsitter.id
        ) {
          const petNames = journal.reservation.pets.map((pet) => pet.name);
          const petPhotos = journal.reservation.pets.map(
            (pet) => pet.photo && pet.photo.formats.thumbnail.url
          );

          const response = {
            journalId: journal.id,
            reservationId: journal.reservation.id,
            petsitterId: journal.reservation.petsitter.id,
            memberId: journal.reservation.client.id,
            createdAt: journal.createdAt,
            lastModifiedAt: journal.updatedAt,
            body: journal.body,
            photos:
              journal.photos &&
              journal.photos.map((photo) => photo.formats.thumbnail.url),
            petNames: petNames,
            petPhotos: petPhotos,
            petsitterName: journal.reservation.petsitter.username,
            petsitterPhoto:
              journal.reservation.petsitter.photo &&
              journal.reservation.petsitter.photo.formats.thumbnail.url,
          };

          ctx.send(response);
        } else {
          console.log("예약에 해당하는 유저가 아닙니다.");
        }
      } catch (e) {
        console.log(e);
      }
    }
  },

  // 케어 일지 등록 v
  async create(ctx) {
    const { reservationId, body } = JSON.parse(ctx.request.body.data);
    const files = ctx.request.files;

    const reservation = await strapi.entityService.findOne(
      "api::reservation.reservation",
      reservationId,
      {
        populate: { journal: true, petsitter: { fields: ["username"] } },
      }
    );

    if (reservation.journal) {
      return ctx.badRequest("이미 작성한 일지가 존재합니다.");
    } else if (reservation.progress !== "FINISH_CARING") {
      return ctx.badRequest("예약이 종료되지 않았습니다.");
    } else if (reservation.petsitter.id !== ctx.state.user.id) {
      return ctx.badRequest("예약과 일치하지 않는 펫시터입니다.");
    } else {
      try {
        let data = {
          data: { body, reservation: reservationId },
        };

        if (Object.keys(files).length !== 0) {
          data = {
            data: { body, reservation: reservationId },
            files: { photos: files.file },
          };
        }

        const newJournal = await strapi.entityService.create(
          "api::journal.journal",
          data
        );

        ctx.send("Create Journal Success");
      } catch (e) {
        console.log(e);
      }
    }
  },

  // 케어 일지 수정 (사진 문제: 덮어 쓰이는게 아니라 추가됨)
  async update(ctx) {
    if (!ctx.state.user) {
      ctx.send("에러");
    } else {
      try {
        const userId = ctx.state.user.id;
        const journalId = +ctx.params.id;

        const journal = await strapi.entityService.findOne(
          "api::journal.journal",
          journalId,
          {
            populate: {
              reservation: {
                populate: {
                  petsitter: true,
                },
              },
            },
          }
        );

        if (userId === journal.reservation.petsitter.id) {
          const files = ctx.request.files;

          try {
            const { body } = JSON.parse(ctx.request.body.data);

            let data = {
              data: { body },
            };

            if (Object.keys(files).length !== 0) {
              data = {
                data: { body },
                files: { photos: files.file },
              };
            }

            const updatedJournal = await strapi.entityService.update(
              "api::journal.journal",
              journalId,
              data
            );

            ctx.send("Update Success");
          } catch (e) {
            console.log(e);
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
  },
}));
