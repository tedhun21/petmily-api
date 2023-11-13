module.exports = (plugin) => {
  // 회원정보 조회
  plugin.controllers.user.me = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("로그인 해주세요.");
    }
    try {
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        {
          populate: {
            photo: true,
            role: { fields: ["type"] },
          },
        }
      );

      const modifiedUser = {
        memberId: user.id,
        email: user.email,
        name: user.username,
        nickName: user.nickName,
        phone: user.phone,
        address: user.address,
        photo: user.photo,
        body: user.body,
        petsitterBoolean: user.role.type === "petsitter" ? true : false,
      };

      ctx.send(modifiedUser);
    } catch (e) {
      console.log(e);
    }
  };

  // 회원정보 등록
  plugin.controllers.auth.register = async (ctx) => {
    const { provider } = ctx.request.body;

    try {
      const newMember = await strapi.entityService.create(
        "plugin::users-permissions.user",
        {
          data: {
            ...ctx.request.body,
            username: ctx.request.body.name,
            provider: provider || "local",
            role: {
              connect: [ctx.request.body.petsitterBoolean ? 3 : 2],
            },
          },
        }
      );

      ctx.send({ data: "success create member" });
    } catch (e) {
      console.log(e);
    }
  };

  // 회원정보 수정
  plugin.controllers.user.update = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("권한이 없습니다.");
    } else if (ctx.state.user.id === +ctx.params.id) {
      console.log(ctx.request.body);

      const updatedUser = await strapi.entityService.update(
        "plugin::users-permissions.user",
        ctx.state.user.id,
        {
          data: {
            ...ctx.request.body,
          },
        }
      );

      ctx.send({ data: "success modify member" });
    }
  };

  // 회원정보 삭제
  plugin.controllers.user.destroy = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.badRequest("권한이 없습니다.");
    } else if (ctx.state.user.id === +ctx.params.id) {
      try {
        const deleteUser = await strapi.entityService.delete(
          "plugin::users-permissions.user",
          ctx.state.user.id
        );
        ctx.send({ data: "success delete member" });
      } catch (e) {
        console.log(e);
      }
    }
  };

  // 회원정보 조회 route
  plugin.routes["content-api"].routes.push({
    method: "GET",
    path: "/members/my-page",
    handler: "user.me",
    config: {
      prefix: "",
    },
  });

  // 회원정보 등록 route
  plugin.routes["content-api"].routes.push({
    method: "POST",
    path: "/auth/local/register",
    handler: "auth.register",
  });

  // 회원정보 수정 route
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/members/:id",
    handler: "user.update",
    config: {
      prefix: "",
    },
  });

  // 회원정보 삭제 route
  plugin.routes["content-api"].routes.push({
    method: "DELETE",
    path: "/members/:id",
    handler: "user.destroy",
    config: {
      prefix: "",
    },
  });

  return plugin;
};
