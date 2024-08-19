/**
 * pet controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::pet.pet", ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) {
      return ctx.badRequest("Token is not validated");
    }

    const { id: userId } = ctx.state.user;
    const { size, page } = ctx.params;

    try {
      const pets = await strapi.entityService.findPage("api::pet.pet", {
        filters: { owner: { $eq: userId } },
        populate: { photo: { fields: ["id", "url"] } },
        page,
        pageSize: size,
      });

      const modifiedPets = pets.results.map((pet) => ({
        petId: pet.id,
        name: pet.name,
        type: pet.type,
        age: pet.age,
        species: pet.species,
        weight: pet.weight,
        body: pet.body,
        male: pet.male,
        neutering: pet.neutering,
        createdAt: pet.createdAt,
        lastModifiedAt: pet.updatedAt,
        photo: pet.photo && pet.photo,
      }));

      return ctx.send({ pets: modifiedPets, pagination: pets.pagination });
    } catch (e) {
      console.error(e);
      return ctx.badRequest("Fail to fetch pets");
    }
  },

  // pet 하나 조회 (O)
  async findOne(ctx) {
    const { id: petId } = ctx.params;

    try {
      const pet = await strapi.entityService.findOne("api::pet.pet", +petId, {
        populate: {
          user: { fields: ["id", "nickname"] },
          photo: { fields: ["id", "url"] },
        },
      });

      if (!pet) {
        return ctx.notFound("Pet is not found"); //// pet이 null인 경우 404 에러 반환
      }

      const modifiedPet = {
        id: pet.id,
        name: pet.name,
        type: pet.type,
        age: pet.age,
        species: pet.species,
        weight: pet.weight,
        body: pet.body,
        gender: pet.gender,
        neutered: pet.neutering,
        photo: pet.photo && pet.photo,
        owner: pet.user,
      };

      return ctx.send(modifiedPet);
    } catch (e) {
      console.error(e);
    }
  },

  // pet 생성 (O)
  async create(ctx) {
    if (!ctx.state.user) {
      return ctx.badRequest("Token is not validated");
    }

    const { id: userId } = ctx.state.user;
    const { type, name, age, species, weight, body, gender, neutered } =
      JSON.parse(ctx.request.body.data);

    const { file } = ctx.request.files;

    try {
      let data = {
        data: {
          name,
          type,
          age,
          weight,
          neutered,
          gender,
          species,
          body,
          user: userId,
        },
        files: file ? { photo: file } : null,
      };

      const newPet = await strapi.entityService.create("api::pet.pet", data);

      return ctx.send({ message: "Successfully create a pet", id: newPet.id });
    } catch (e) {
      return ctx.badRequest("Fail to create a pet");
    }
  },

  // pet 수정 (O)
  async update(ctx) {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: petId } = ctx.params;
    const { name, type, age, weight, neutered, gender, species, body } =
      JSON.parse(ctx.request.body.data); // 수정할 데이터 가져오기
    const { file } = ctx.request.files; // 파일 데이터 가져오기

    try {
      const pet = await strapi.entityService.findOne("api::pet.pet", petId, {
        populate: {
          photo: {
            fields: ["id", "url"],
          },
        },
      });

      if (!pet) {
        return ctx.notFound("Pet is not found");
      }

      let data = {
        data: { name, type, age, weight, neutered, gender, species, body },
        files: file ? { photo: file } : null,
      };

      //pet 수정
      const updatedPet = await strapi.entityService.update(
        "api::pet.pet",
        petId,
        data as any
      );

      return ctx.send({
        message: "Successfully update the pet",
        id: updatedPet.id,
      });
    } catch (e) {
      return ctx.badRequest("Fail to update the pet");
    }
  },

  // pet 삭제 (O)
  async delete(ctx) {
    if (!ctx.state.user) {
      return ctx.unauthorized("Token is not validated");
    }

    const { id: userId } = ctx.state.user;
    const { id: petId } = ctx.params;

    try {
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        userId,
        { populate: { pets: { fields: ["id"] } } }
      );

      if (user.pets.findIndex((pet) => pet.id === +petId) !== -1) {
        const deletedPet = await strapi.entityService.delete(
          "api::pet.pet",
          +petId
        );
        return ctx.send({
          message: "Successfully delete the pet",
          id: deletedPet.id,
        });
      }
    } catch (e) {
      return ctx.badRequest("Fail to delete the pet");
    }
  },
}));
