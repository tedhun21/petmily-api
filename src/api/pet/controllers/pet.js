"use strict";

/**
 * pet controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
module.exports = createCoreController("api::pet.pet", ({ strapi }) => ({
  async find(ctx) {
    // pet 전체 조회
    try {
      const pets = await strapi.entityService.findMany("api::pet.pet", {
        fields: [
          "name",
          "type",
          "age",
          "weight",
          "neutering",
          "male",
          "species",
          "body",
          "createdAt",
          "updatedAt", //마지막 수정 날짜
        ],
        populate: {
          file: {
            fields: ["formats"],
          },
        },
      });

      console.log(pets);

      const modifiedPets = pets.map((pet) => ({
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
        photo: pet.file
          ? pet.file.map((file) => ({
              id: file.id,
              thumnail: file.formats.thumbnail,
            }))
          : null,
      }));
      ctx.send(modifiedPets);
    } catch (e) {
      console.error(e);
    }
  },

  async findOne(ctx) {
    // 특정 pet 조회
    try {
      const pet = await strapi.entityService.findOne(
        "api::pet.pet",
        ctx.params.id,
        {
          fields: [
            "name",
            "type",
            "age",
            "weight",
            "neutering",
            "male",
            "species",
            "body",
            "createdAt",
            "updatedAt", //마지막 수정 날짜
          ],
          populate: {
            file: {
              fields: ["formats"],
            },
          },
        }
      );

      if (!pet) {
        return ctx.notFound("해당 Pet을 찾을 수 없습니다."); //// pet이 null인 경우 404 에러 반환
      }

      console.log(pet);

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
        photo: pet.file
          ? pet.file.map((file) => ({
              id: file.id,
              thumnail: file.formats.thumbnail,
            }))
          : null,
      };
      ctx.send(modifiedPet);
    } catch (e) {
      console.error(e);
    }
  },

  async create(ctx) {
    // pet 생성
    try {
      const data = JSON.parse(ctx.request.body.data);
      const files = ctx.request.files; // 파일 업로드

      console.log(ctx.request.files);

      const newpet = await strapi.entityService.create("api::pet.pet", {
        data: {
          name: data.name, // 입력받은 Data 사용
          type: data.type,
          age: data.age,
          weight: data.weight,
          neutering: data.neutering,
          male: data.male,
          species: data.species,
          body: data.body,
          user: ctx.state.user.id,
        },
        files: {
          photos: files.files,
        },
      });
      console.log(files.File);
      // 펫 객체를 다시 조회. 'file' 필드를 포함시킵니다.
      const petWithFile = await strapi.entityService.findOne(
        "api::pet.pet",
        newpet.id,
        { populate: ["file"] }
      );
      console.log(petWithFile);

      return (ctx.body = "Create Pet Success");
    } catch (e) {
      console.error(e);
      return ctx.badRequest("pet 생성 실패");
    }
  },

  async update(ctx) {
    // pet 수정
    try {
      const petId = ctx.params.id; // pet ID 가져오기
      const data = ctx.request.body; // 수정할 데이터 가져오기
      const files = ctx.request.files; // 파일 데이터 가져오기

      console.log(petId, data, files);
      let uploadedFiles;
      if (files && files.photo && files.photo.length > 0) {
        // 기존 사진파일 삭제
        const pet = await strapi.entityService.findOne("api::pet.pet", petId);
        if (pet.file && pet.file.length > 0) {
          await strapi.plugins.upload.services.upload.remove(pet.file[0]);
        }

        // 새 사진파일 업로드
        uploadedFiles = await strapi.plugins.upload.services.upload.upload({
          data: {},
          files: files.photo,
        });
      }

      // pet ID로 pet 조회
      const pet = await strapi.entityService.findOne("api::pet.pet", petId, {
        populate: {
          file: {
            fields: ["formats"],
          },
        },
      });
      if (!pet) {
        return ctx.throw(400, "해당하는 pet이 없습니다.");
      }

      //pet 수정
      const updatedPet = await strapi.entityService.update(
        "api::pet.pet",
        petId,
        {
          data: {
            name: data.name,
            type: data.type,
            age: data.age,
            weight: data.weight,
            neutering: data.neutering,
            male: data.male,
            species: data.species,
            body: data.body,
            file: uploadedFiles
              ? uploadedFiles.map((file) => file.id)
              : pet.file, // 새로운 사진파일이 있으면 업데이트, 없으면 기존 사진파일 유지
          },
        }
      );
      console.log(updatedPet);
      console.log(pet);
      return (ctx.body = "Update Pet Success");
    } catch (e) {
      console.error(e);
      return ctx.badRequest("Pet을 수정하지 못했습니다.");
    }
  },

  async delete(ctx) {
    // pet 삭제
    try {
      const { id } = ctx.params;
      const pet = await strapi.entityService.delete(
        "api::pet.pet",
        ctx.params.id
      );
      ctx.body = "Delete Pet Success";
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
