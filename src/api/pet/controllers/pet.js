"use strict";

/**
 * pet controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
module.exports = createCoreController("api::pet.pet", ({ strapi }) => ({
  async find(ctx) {
    // pet 전체 조회
    if (!ctx.state.user) {
      ctx.badRequest("로그인 해주세요");
    } else {
      const userId = ctx.state.user.id;
      console.log(userId);
      try {
        const user = await strapi.entityService.findOne(
          "plugin::users-permissions.user",
          userId,
          {
            populate: {
              pets: { populate: { photo: true } },
            },
          }
        );

        const modifiedPets = user.pets.map((pet) => ({
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
          photo: pet.photo && pet.photo.formats.thumbnail.url,
        }));

        ctx.send(modifiedPets);
      } catch (e) {
        console.error(e);
      }
    }
  },

  // 특정 pet 조회
  async findOne(ctx) {
    const { id: petId } = ctx.params;
    if (!ctx.state.user) {
      ctx.badRequest("로그인 해주세요");
    }
    try {
      const pet = await strapi.entityService.findOne("api::pet.pet", +petId, {
        populate: { user: true, photo: true },
      });

      if (!pet) {
        return ctx.notFound("해당 Pet을 찾을 수 없습니다."); //// pet이 null인 경우 404 에러 반환
      }
      if (pet.user.id === ctx.state.user.id) {
        const modifiedPet = {
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
          photo: pet.photo && pet.photo.formats.thumbnail.url,
        };
        ctx.send(modifiedPet);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // pet 생성
  async create(ctx) {
    if (!ctx.state.user) {
      return ctx.badRequest("권한이 없습니다.");
    } else {
      try {
        const { type, name, age, species, weight, body, male, neutering } =
          JSON.parse(ctx.request.body.data);

        const files = ctx.request.files; // 파일 업로드

        let data = {
          data: {
            name,
            type,
            age,
            weight,
            neutering,
            male,
            species,
            body,
            user: ctx.state.user.id,
          },
        };

        if (Object.keys(files).length !== 0) {
          data = {
            data: {
              name,
              type,
              age,
              weight,
              neutering,
              male,
              species,
              body,
              user: ctx.state.user.id,
            },
            files: {
              photo: files.file,
            },
          };
        }

        const newpet = await strapi.entityService.create("api::pet.pet", data);

        ctx.send("Create Pet Success");
      } catch (e) {
        console.error(e);
        return ctx.badRequest("pet 생성 실패");
      }
    }
  },

  // pet 수정
  async update(ctx) {
    try {
      const petId = ctx.params.id; // pet ID 가져오기
      const { name, type, age, weight, neutering, male, species, body } =
        JSON.parse(ctx.request.body.data); // 수정할 데이터 가져오기
      const files = ctx.request.files; // 파일 데이터 가져오기

      // pet ID로 pet 조회
      const pet = await strapi.entityService.findOne("api::pet.pet", petId, {
        populate: {
          photo: {
            fields: ["formats"],
          },
        },
      });

      if (!pet) {
        return ctx.throw(400, "해당하는 pet이 없습니다.");
      }

      let data = {
        data: { name, type, age, weight, neutering, male, species, body },
      };

      if (Object.keys(files).length !== 0) {
        data = {
          data: { name, type, age, weight, neutering, male, species, body },
          files: {
            photo: files.file,
          },
        };
      }

      //pet 수정
      const updatedPet = await strapi.entityService.update(
        "api::pet.pet",
        petId,
        data
      );

      ctx.send("Update Pet Success");
    } catch (e) {
      console.error(e);
      return ctx.badRequest("Pet을 수정하지 못했습니다.");
    }
  },

  async delete(ctx) {
    // pet 삭제
    const { id: petId } = ctx.params;
    if (!ctx.state.user) {
      ctx.badRequest("로그인 해주세요");
    }

    try {
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        { populate: { pets: true } }
      );

      if (user.pets.map((pet) => pet.id === +petId).length !== 0) {
        const pet = await strapi.entityService.delete("api::pet.pet", petId);
        ctx.send("Delete Pet Success");
      }
    } catch (e) {
      console.error(e);
      return ctx.badRequest("Pet을 삭제하지 못했습니다.");
    }
  },

  async deleteFile(ctx) {
    try {
      const petId = ctx.params.id; // pet ID 가져오기
      const pet = await strapi.entityService.findOne("api::pet.pet", petId);
      if (!pet) {
        return ctx.throw(400, "해당하는 pet이 없습니다.");
      }

      // 펫의 사진이 있는 경우, 사진 삭제
      if (pet.file && pet.file.length > 0) {
        await strapi.plugins.upload.services.upload.remove(pet.file[0]);
      }

      // 펫의 사진 필드를 null로 설정
      const updatedPet = await strapi.entityService.update(
        "api::pet.pet",
        petId,
        {
          file: null,
        }
      );

      return (ctx.body = "Delete Pet Photo Success");
    } catch (e) {
      console.error(e);
      return ctx.badRequest("Pet의 사진을 삭제하지 못했습니다.");
    }
  },
}));
