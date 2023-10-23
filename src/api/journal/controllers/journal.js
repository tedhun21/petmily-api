"use strict";

/**
 * journal controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::journal.journal", ({ strapi }) => ({
  async find(ctx) {
    try {
      const journals = await strapi.entityService.findMany(
        "api::journal.journal",
        {
          populate: {
            photos: true,
            reservation: {
              populate: {
                user: true,
                pets: {
                  populate: {
                    file: true,
                  },
                },
              },
            },
          },
        }
      );

      const modifiedJournals = journals.map((journal) => {
        const petNames = journal.reservation.pets.map((pet) => pet.name);

        const petPhotos = journal.reservation.pets.map((pet) => pet.file);

        return {
          ...journal,
          journalId: journal.id,
          reservationId: journal.reservation.id,
          // petsitterId
          memberId: journal.reservation.user.username,
          createdAt: journal.createdAt,
          lastModifiedAt: journal.updatedAt,
          body: journal.body,
          photos: journal.photos,
          petNames: petNames,
          petPhotos: petPhotos,
          // petsitterName
          // petsitterPhoto
        };
      });
      ctx.send(modifiedJournals);
    } catch (e) {
      console.log(e);
    }
  },
}));
